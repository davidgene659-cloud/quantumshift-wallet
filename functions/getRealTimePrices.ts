import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await req.json();

    // ── FIXED: Added USDC, WETH, WBTC, AVAX, TRX, BUSD ──
    const fallbackPrices: Record<string, number> = {
      BTC:   43250,
      ETH:   2280,
      USDT:  1.00,
      USDC:  1.00,    // ← added
      DAI:   1.00,    // ← added
      BUSD:  1.00,    // ← added
      SOL:   130,
      BNB:   312,
      DOGE:  0.082,
      ADA:   0.45,
      MATIC: 0.88,
      AVAX:  35.2,    // ← added
      TRX:   0.12,    // ← added
      DOT:   6.8,
      XRP:   0.52,
      LTC:   72.5,
      WETH:  2280,    // ← added
      WBTC:  43250,   // ← added
    };

    // ── FIXED: Added USDC, WETH, WBTC, AVAX, TRX, BUSD, DAI mappings ──
    const symbolIds: Record<string, string> = {
      BTC:   'bitcoin',
      ETH:   'ethereum',
      USDT:  'tether',
      USDC:  'usd-coin',          // ← added
      DAI:   'dai',               // ← added
      BUSD:  'binance-usd',       // ← added
      SOL:   'solana',
      BNB:   'binancecoin',
      DOGE:  'dogecoin',
      ADA:   'cardano',
      MATIC: 'matic-network',
      AVAX:  'avalanche-2',       // ← added
      TRX:   'tron',              // ← added
      DOT:   'polkadot',
      XRP:   'ripple',
      LTC:   'litecoin',
      WETH:  'weth',              // ← added
      WBTC:  'wrapped-bitcoin',   // ← added
    };

    const prices: Record<string, number> = {};
    const startTime = Date.now();
    let source = 'fallback';

    // ── Try CoinGecko first ──
    try {
      const ids = symbols
        .map((s: string) => symbolIds[s])
        .filter(Boolean)
        .join(',');

      if (ids) {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (response.ok) {
          const data = await response.json();
          symbols.forEach((symbol: string) => {
            const id = symbolIds[symbol];
            if (id && data[id]?.usd) {
              prices[symbol] = data[id].usd;
            }
          });
          source = 'coingecko';
        }
      }
    } catch (error) {
      console.error('CoinGecko API failed:', error);
    }

    // ── Fill any missing symbols with fallbacks ──
    symbols.forEach((symbol: string) => {
      if (!prices[symbol] && fallbackPrices[symbol] !== undefined) {
        prices[symbol] = fallbackPrices[symbol];
        // If we had some live prices but fell back for this one, mark mixed
        if (source === 'coingecko') source = 'mixed';
      }
    });

    // ── Warn about any symbols with no price at all ──
    const missing = symbols.filter((s: string) => !prices[s]);
    if (missing.length > 0) {
      console.warn(`No price found for symbols: ${missing.join(', ')}`);
    }

    const responseTime = Date.now() - startTime;

    return Response.json({
      prices,
      source,
      missing_symbols: missing,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
