import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const FALLBACK = {
  BTC: 43250,
  ETH: 2280,
  USDT: 1,
  USDC: 1,
  SOL: 98.5,
  BNB: 312,
  DOGE: 0.082,
  ADA: 0.45,
  MATIC: 0.88,
  AVAX: 35.2,
  DOT: 6.8,
  XRP: 0.52,
  LTC: 72.5,
  WETH: 2280,
  WBTC: 43250
};

const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  SOL: "solana",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  ADA: "cardano",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  XRP: "ripple",
  LTC: "litecoin",
  WETH: "weth",
  WBTC: "wrapped-bitcoin"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { symbols } = await req.json();
    const prices = {};

    const ids = symbols
      .map((s) => COINGECKO_IDS[s])
      .filter(Boolean)
      .join(",");

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        for (const symbol of symbols) {
          const id = COINGECKO_IDS[symbol];
          if (data[id]?.usd) {
            prices[symbol] = data[id].usd;
          }
        }
      }
    } catch {}

    // Fill missing with fallback
    for (const symbol of symbols) {
      if (!prices[symbol] && FALLBACK[symbol]) {
        prices[symbol] = FALLBACK[symbol];
      }
    }

    return Response.json({
      prices,
      source: Object.keys(prices).length ? "coingecko/fallback" : "fallback",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
