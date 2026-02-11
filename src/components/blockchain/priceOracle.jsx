// Real-time price oracle using CoinGecko API (free, no auth required)

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Map token symbols to CoinGecko IDs
const TOKEN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  USDT: 'tether',
  USDC: 'usd-coin',
  DOGE: 'dogecoin',
  BNB: 'binancecoin',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
};

export const priceOracle = {
  // Fetch current prices for multiple tokens
  async getPrices(symbols = Object.keys(TOKEN_IDS)) {
    try {
      const ids = symbols
        .map(symbol => TOKEN_IDS[symbol.toUpperCase()])
        .filter(Boolean)
        .join(',');

      if (!ids) return {};

      const response = await fetch(
        `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
      );

      if (!response.ok) throw new Error('Price fetch failed');
      
      const data = await response.json();
      const prices = {};

      Object.entries(TOKEN_IDS).forEach(([symbol, id]) => {
        if (data[id]) {
          prices[symbol] = {
            current: data[id].usd || 0,
            change24h: data[id].usd_24h_change || 0,
            marketCap: data[id].usd_market_cap || 0,
          };
        }
      });

      return prices;
    } catch (error) {
      console.error('Price oracle error:', error);
      return {};
    }
  },

  // Fetch price for a single token
  async getPrice(symbol) {
    try {
      const id = TOKEN_IDS[symbol.toUpperCase()];
      if (!id) throw new Error(`Unknown token: ${symbol}`);

      const response = await fetch(
        `${COINGECKO_BASE_URL}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`
      );

      if (!response.ok) throw new Error('Price fetch failed');
      
      const data = await response.json();
      return {
        current: data[id]?.usd || 0,
        change24h: data[id]?.usd_24h_change || 0,
      };
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      return { current: 0, change24h: 0 };
    }
  },

  // Fetch historical prices (last 30 days)
  async getHistoricalPrices(symbol, days = 30) {
    try {
      const id = TOKEN_IDS[symbol.toUpperCase()];
      if (!id) throw new Error(`Unknown token: ${symbol}`);

      const response = await fetch(
        `${COINGECKO_BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      if (!response.ok) throw new Error('Historical price fetch failed');
      
      const data = await response.json();
      return data.prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        price,
      }));
    } catch (error) {
      console.error(`Failed to fetch historical prices for ${symbol}:`, error);
      return [];
    }
  },
};