import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const API_ENDPOINTS = {
  ethereum:  'https://api.etherscan.io/api',
  polygon:   'https://api.polygonscan.com/api',
  bsc:       'https://api.bscscan.com/api',
  avalanche: 'https://api.snowtrace.io/api',
  arbitrum:  'https://api.arbiscan.io/api',
  optimism:  'https://api-optimistic.etherscan.io/api',
};

const KNOWN_PRICES = { USDT: 1, USDC: 1, DAI: 1, BUSD: 1, WETH: 2280, WBTC: 43250, MATIC: 0.8, BNB: 310 };

async function fetchWithTimeout(url, ms = 5000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Fetch balances in small batches to avoid rate limits
async function batchFetch(tasks, batchSize = 5) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
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

    // Check cache first
    const cacheKey = `tokens_${address}_${blockchain}`;
    try {
      const cached = await base44.data.get(cacheKey);
      if (cached) return Response.json({ ...cached, cached: true });
    } catch {}

    let tokens = [];

    // ── EVM chains ──
    if (blockchain in API_ENDPOINTS) {
      const apiBase = API_ENDPOINTS[blockchain];

      // Get token transaction history to discover held tokens (limit to recent 500)
      const txData = await fetchWithTimeout(
        `${apiBase}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=desc&offset=500&page=1`
      );

      if (txData?.status === '1' && Array.isArray(txData.result)) {
        // Deduplicate by contract
        const tokenMap = new Map();
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

        // Cap at 20 tokens to prevent timeout from too many balance calls
        const tokensToCheck = Array.from(tokenMap.entries()).slice(0, 20);

        const balanceTasks = tokensToCheck.map(([contract, token]) => async () => {
          const data = await fetchWithTimeout(
            `${apiBase}?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest`,
            4000
          );
          if (data?.status === '1') {
            const balance = Number(data.result) / Math.pow(10, token.decimals);
            if (balance > 0) {
              const price = KNOWN_PRICES[token.symbol] || 0;
              return { ...token, balance, blockchain, price, usd_value: balance * price };
            }
          }
          return null;
        });

        const results = await batchFetch(balanceTasks, 5);
        tokens = results.filter(Boolean);
      }
    }

    // ── Solana ──
    else if (blockchain === 'solana') {
      const data = await fetchWithTimeout('https://api.mainnet-beta.solana.com', 5000);
      // Need POST so do it manually
      try {
        const res = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'getTokenAccountsByOwner',
            params: [address, { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' }, { encoding: 'jsonParsed' }]
          })
        });
        const json = await res.json();
        for (const account of json.result?.value || []) {
          const info = account.account.data.parsed.info;
          const balance = info.tokenAmount.uiAmount;
          if (balance > 0) {
            tokens.push({
              contract: info.mint, symbol: 'SPL', name: 'SPL Token',
              decimals: info.tokenAmount.decimals, balance,
              blockchain: 'solana', price: 0, usd_value: 0,
            });
          }
        }
      } catch {}
    }

    // ── Tron ──
    else if (blockchain === 'tron') {
      const data = await fetchWithTimeout(
        `https://apilist.tronscan.org/api/account/tokens?address=${address}&start=0&limit=50`
      );
      for (const token of data?.data || []) {
        if (token.balance && parseFloat(token.balance) > 0) {
          const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal || 6);
          tokens.push({
            contract: token.tokenId, symbol: token.tokenAbbr, name: token.tokenName,
            decimals: token.tokenDecimal || 6, balance,
            blockchain: 'tron', price: 0, usd_value: 0,
          });
        }
      }
    }

    else {
      return Response.json({ error: 'Unsupported blockchain' }, { status: 400 });
    }

    const result = {
      address, blockchain, tokens,
      total_tokens: tokens.length,
      total_usd_value: tokens.reduce((sum, t) => sum + t.usd_value, 0),
    };

    // Cache for 5 minutes (non-blocking)
    base44.data.set(cacheKey, result, { ttl: 300 }).catch(() => {});

    return Response.json({ ...result, cached: false });

  } catch (error) {
    console.error('getTokenBalances error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});