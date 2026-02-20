import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_ENDPOINTS: Record<string, string> = {
  ethereum:  'https://api.etherscan.io/api',
  polygon:   'https://api.polygonscan.com/api',
  bsc:       'https://api.bscscan.com/api',
  avalanche: 'https://api.snowtrace.io/api',
  arbitrum:  'https://api.arbiscan.io/api',
  optimism:  'https://api-optimistic.etherscan.io/api',
};

// ── FIXED: Added USDC and WETH (were missing before) ──
const KNOWN_PRICES: Record<string, number> = {
  USDT:  1,
  USDC:  1,       // ← added
  DAI:   1,
  BUSD:  1,
  WETH:  2280,    // ← added
  WBTC:  43250,
  MATIC: 0.8,
  BNB:   310,
};

// Token symbols that should always get live prices from CoinGecko
const COINGECKO_TOKEN_IDS: Record<string, string> = {
  WETH:  'weth',
  WBTC:  'wrapped-bitcoin',
  MATIC: 'matic-network',
  BNB:   'binancecoin',
};

async function fetchWithTimeout(url: string, ms = 5000): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function batchFetch(tasks: (() => Promise<any>)[], batchSize = 5): Promise<any[]> {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
    // Small delay between batches to avoid rate limits
    if (i + batchSize < tasks.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}

// Fetch live prices for tokens we know CoinGecko supports
async function fetchLiveTokenPrices(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  const idsNeeded = symbols
    .filter(s => COINGECKO_TOKEN_IDS[s])
    .map(s => COINGECKO_TOKEN_IDS[s]);

  if (idsNeeded.length === 0) return prices;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsNeeded.join(',')}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      for (const [symbol, geckoId] of Object.entries(COINGECKO_TOKEN_IDS)) {
        if (data[geckoId]?.usd) prices[symbol] = data[geckoId].usd;
      }
    }
  } catch (err) {
    console.warn('CoinGecko token price fetch failed, using KNOWN_PRICES fallback');
  }
  return prices;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { address, blockchain } = await req.json();
    if (!address || !blockchain) {
      return Response.json({ error: 'Address and blockchain required' }, { status: 400 });
    }

    // Check cache first (5 min TTL)
    const cacheKey = `tokens_${address}_${blockchain}`;
    try {
      const cached = await base44.data.get(cacheKey);
      if (cached) return Response.json({ ...cached, cached: true });
    } catch {}

    let tokens: any[] = [];

    // ── EVM chains ──
    if (blockchain in API_ENDPOINTS) {
      const apiBase = API_ENDPOINTS[blockchain];

      // Discover tokens via recent tx history (last 500 txs, desc)
      const txData = await fetchWithTimeout(
        `${apiBase}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&offset=500&page=1`
      );

      if (txData?.status === '1' && Array.isArray(txData.result)) {
        // Deduplicate by contract address
        const tokenMap = new Map<string, { contract: string; symbol: string; name: string; decimals: number }>();
        for (const tx of txData.result) {
          if (!tokenMap.has(tx.contractAddress)) {
            tokenMap.set(tx.contractAddress, {
              contract: tx.contractAddress,
              symbol: tx.tokenSymbol,
              name: tx.tokenName,
              decimals: parseInt(tx.tokenDecimal) || 18,
            });
          }
        }

        // ── USDC / WETH well-known contract addresses as safety net ──
        // If they weren't in tx history, inject them so balance is checked anyway.
        const WELL_KNOWN: Record<string, { contract: string; symbol: string; name: string; decimals: number }[]> = {
          ethereum: [
            { contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin',     decimals: 6  },
            { contract: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
          ],
        };
        for (const token of WELL_KNOWN[blockchain] || []) {
          if (!tokenMap.has(token.contract)) tokenMap.set(token.contract, token);
        }

        // Cap at 25 tokens to stay within timeout budget
        const tokensToCheck = Array.from(tokenMap.entries()).slice(0, 25);

        // Fetch live prices for known tokens upfront
        const symbolsToPrice = tokensToCheck.map(([, t]) => t.symbol);
        const liveTokenPrices = await fetchLiveTokenPrices(symbolsToPrice);

        const balanceTasks = tokensToCheck.map(([contract, token]) => async () => {
          const data = await fetchWithTimeout(
            `${apiBase}?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest`,
            4000
          );
          if (data?.status === '1') {
            const balance = Number(data.result) / Math.pow(10, token.decimals);
            if (balance > 0) {
              // Price priority: live CoinGecko > KNOWN_PRICES fallback > 0
              const price = liveTokenPrices[token.symbol] ?? KNOWN_PRICES[token.symbol] ?? 0;
              return { ...token, balance, blockchain, price, usd_value: balance * price };
            }
          }
          return null;
        });

        const results = await batchFetch(balanceTasks, 5);
        tokens = results.filter(Boolean);

      } else {
        console.warn(`tokentx returned status ${txData?.status}: ${txData?.message}`);
      }
    }

    // ── Solana ──
    else if (blockchain === 'solana') {
      // FIXED: was incorrectly calling GET then throwing away result; now proper POST
      try {
        const res = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'getTokenAccountsByOwner',
            params: [
              address,
              { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
              { encoding: 'jsonParsed' }
            ]
          })
        });
        const json = await res.json();
        for (const account of json.result?.value || []) {
          const info = account.account.data.parsed.info;
          const balance = info.tokenAmount.uiAmount;
          if (balance > 0) {
            tokens.push({
              contract:   info.mint,
              symbol:     'SPL',
              name:       'SPL Token',
              decimals:   info.tokenAmount.decimals,
              balance,
              blockchain: 'solana',
              price:      0,
              usd_value:  0,
            });
          }
        }
      } catch (err) {
        console.error('Solana token fetch error:', err);
      }
    }

    // ── Tron ──
    else if (blockchain === 'tron') {
      const data = await fetchWithTimeout(
        `https://apilist.tronscan.org/api/account/tokens?address=${address}&start=0&limit=50`
      );
      for (const token of data?.data || []) {
        if (token.balance && parseFloat(token.balance) > 0) {
          const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal || 6);
          const price = KNOWN_PRICES[token.tokenAbbr] ?? 0;
          tokens.push({
            contract:   token.tokenId,
            symbol:     token.tokenAbbr,
            name:       token.tokenName,
            decimals:   token.tokenDecimal || 6,
            balance,
            blockchain: 'tron',
            price,
            usd_value:  balance * price,
          });
        }
      }
    }

    else {
      return Response.json({ error: 'Unsupported blockchain' }, { status: 400 });
    }

    console.log(`Token balances fetched: ${tokens.length} for ${address} on ${blockchain}`);

    const result = {
      address,
      blockchain,
      tokens,
      total_tokens:     tokens.length,
      total_usd_value:  tokens.reduce((sum, t) => sum + t.usd_value, 0),
    };

    // Cache non-blocking
    base44.data.set(cacheKey, result, { ttl: 300 }).catch(() => {});

    return Response.json({ ...result, cached: false });

  } catch (error) {
    console.error('getTokenBalances error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
