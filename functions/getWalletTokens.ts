import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Public block explorer API endpoints (no API key required)
const API_ENDPOINTS = {
  ethereum: 'https://api.etherscan.io/api',
  polygon: 'https://api.polygonscan.com/api',
  bsc: 'https://api.bscscan.com/api',
  avalanche: 'https://api.snowtrace.io/api',
  arbitrum: 'https://api.arbiscan.io/api',
  optimism: 'https://api-optimistic.etherscan.io/api'
};

Deno.serve(async (req) => {
  try {
    // Authenticate user via Base44
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { address, blockchain } = await req.json();

    if (!address || !blockchain) {
      return Response.json({ error: 'Address and blockchain required' }, { status: 400 });
    }

    // Cache key for this address+blockchain
    const cacheKey = `tokens_${address}_${blockchain}`;

    // Check cache first (TTL 5 minutes)
    const cached = await base44.data.get(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true });
    }

    let tokens = [];

    // Handle different blockchain types
    if (blockchain in API_ENDPOINTS) {
      // EVM-compatible chains using block explorer APIs
      const apiBase = API_ENDPOINTS[blockchain];

      // 1. Fetch all token transactions to discover tokens held by this address
      const txUrl = `${apiBase}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=asc`;
      const txResponse = await fetch(txUrl);
      const txData = await txResponse.json();

      if (txData.status === '1' && txData.result) {
        // Deduplicate tokens by contract address
        const tokenMap = new Map();
        for (const tx of txData.result) {
          if (!tokenMap.has(tx.contractAddress)) {
            tokenMap.set(tx.contractAddress, {
              contract: tx.contractAddress,
              symbol: tx.tokenSymbol,
              name: tx.tokenName,
              decimals: parseInt(tx.tokenDecimal)
            });
          }
        }

        // 2. Fetch current balances for each token (parallel requests)
        const balancePromises = Array.from(tokenMap.entries()).map(async ([contract, token]) => {
          const balanceUrl = `${apiBase}?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest`;
          try {
            const balanceRes = await fetch(balanceUrl);
            const balanceData = await balanceRes.json();
            if (balanceData.status === '1') {
              const balance = Number(balanceData.result) / Math.pow(10, token.decimals);
              if (balance > 0) {
                // Optional: price mapping for common tokens
                const knownPrices = { USDT: 1, USDC: 1, DAI: 1, WETH: 2280, WBTC: 43250 };
                const price = knownPrices[token.symbol] || 0;
                return {
                  ...token,
                  balance,
                  blockchain,
                  price,
                  usd_value: balance * price
                };
              }
            }
          } catch (err) {
            console.error(`Balance fetch failed for ${token.symbol}:`, err);
          }
          return null;
        });

        const results = await Promise.all(balancePromises);
        tokens = results.filter(Boolean);
      }
    } else if (blockchain === 'solana') {
      // Solana – using public RPC (no key required)
      const response = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' }
          ]
        })
      });

      const data = await response.json();
      if (data.result?.value) {
        for (const account of data.result.value) {
          const info = account.account.data.parsed.info;
          const balance = info.tokenAmount.uiAmount;
          if (balance > 0) {
            // Note: Solana token metadata not included; you may need a separate API for symbols
            tokens.push({
              contract: info.mint,
              symbol: 'SPL',
              name: 'SPL Token',
              decimals: info.tokenAmount.decimals,
              balance,
              blockchain: 'solana',
              price: 0,
              usd_value: 0
            });
          }
        }
      }
    } else if (blockchain === 'tron') {
      // Tron – using Tronscan public API
      const response = await fetch(`https://apilist.tronscan.org/api/account/tokens?address=${address}&start=0&limit=50`);
      const data = await response.json();
      if (data.data) {
        for (const token of data.data) {
          if (token.balance && parseFloat(token.balance) > 0) {
            const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal || 6);
            tokens.push({
              contract: token.tokenId,
              symbol: token.tokenAbbr,
              name: token.tokenName,
              decimals: token.tokenDecimal || 6,
              balance,
              blockchain: 'tron',
              price: 0,
              usd_value: 0
            });
          }
        }
      }
    } else {
      return Response.json({ error: 'Unsupported blockchain' }, { status: 400 });
    }

    // Prepare response
    const result = {
      address,
      blockchain,
      tokens,
      total_tokens: tokens.length,
      total_usd_value: tokens.reduce((sum, t) => sum + t.usd_value, 0)
    };

    // Cache for 5 minutes
    await base44.data.set(cacheKey, result, { ttl: 300 });

    return Response.json({ ...result, cached: false });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});