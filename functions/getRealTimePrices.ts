import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbols } = await req.json();
    
    // Fallback prices (updated manually)
    const fallbackPrices = {
      BTC: 43250,
      ETH: 2280,
      USDT: 1.00,
      USDC: 1.00,
      SOL: 98.5,
      BNB: 312,
      DOGE: 0.082,
      ADA: 0.45,
      MATIC: 0.88,
      AVAX: 35.2,
      DOT: 6.8,
      XRP: 0.52,
      LTC: 72.5
    };

    const prices = {};
    const startTime = Date.now();
    
    try {
      // Try CoinGecko API (free tier)
      const symbolIds = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        USDT: 'tether',
        USDC: 'usd-coin',
        SOL: 'solana',
        BNB: 'binancecoin',
        DOGE: 'dogecoin',
        ADA: 'cardano',
        MATIC: 'matic-network',
        AVAX: 'avalanche-2',
        DOT: 'polkadot',
        XRP: 'ripple',
        LTC: 'litecoin'
      };

      const ids = symbols.map(s => symbolIds[s]).filter(Boolean).join(',');
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        symbols.forEach(symbol => {
          const id = symbolIds[symbol];
          if (data[id]?.usd) {
            prices[symbol] = data[id].usd;
          }
        });
      }
    } catch (error) {
      console.error('CoinGecko API failed:', error);
    }

    // Fill missing prices with fallbacks
    symbols.forEach(symbol => {
      if (!prices[symbol] && fallbackPrices[symbol]) {
        prices[symbol] = fallbackPrices[symbol];
      }
    });

    const responseTime = Date.now() - startTime;

    return Response.json({
      prices,
      source: Object.keys(prices).length > 0 ? 'coingecko' : 'fallback',
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});