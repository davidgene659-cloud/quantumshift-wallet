// Map tokens to their supported networks
const NETWORK_TOKENS = {
  BTC: ['Bitcoin'],
  ETH: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
  USDT: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Binance Smart Chain'],
  USDC: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
  BNB: ['Binance Smart Chain'],
  MATIC: ['Polygon'],
  SOL: ['Solana'],
  ADA: ['Cardano'],
  DOGE: ['Bitcoin'],
  LINK: ['Ethereum', 'Polygon', 'Arbitrum'],
  AVAX: ['Avalanche'],
};

const NETWORK_DISPLAY = {
  'Bitcoin': { symbol: 'BTC', color: 'from-orange-500 to-amber-500' },
  'Ethereum': { symbol: 'ETH', color: 'from-indigo-500 to-purple-500' },
  'Binance Smart Chain': { symbol: 'BSC', color: 'from-amber-500 to-yellow-500' },
  'Polygon': { symbol: 'MATIC', color: 'from-purple-500 to-pink-500' },
  'Avalanche': { symbol: 'AVAX', color: 'from-red-500 to-rose-500' },
  'Arbitrum': { symbol: 'ARB', color: 'from-blue-500 to-cyan-500' },
  'Optimism': { symbol: 'OP', color: 'from-red-500 to-pink-500' },
  'Solana': { symbol: 'SOL', color: 'from-green-500 to-teal-500' },
  'Cardano': { symbol: 'ADA', color: 'from-blue-500 to-cyan-500' },
};

export const getNetworkTokens = (networkName) => {
  const supportedTokens = [];
  Object.entries(NETWORK_TOKENS).forEach(([token, networks]) => {
    if (networks.includes(networkName)) {
      supportedTokens.push(token);
    }
  });
  return supportedTokens;
};

export const getNetworkDisplay = (networkName) => {
  return NETWORK_DISPLAY[networkName] || { symbol: networkName, color: 'from-gray-500 to-gray-600' };
};

export { NETWORK_TOKENS, NETWORK_DISPLAY };