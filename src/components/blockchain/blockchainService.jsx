import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-app-encryption-key-change-this'; // In production, use env variable

export const encryptPrivateKey = (privateKey) => {
  return CryptoJS.AES.encrypt(privateKey, ENCRYPTION_KEY).toString();
};

export const decryptPrivateKey = (encryptedKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Bitcoin
export const bitcoinService = {
  async getBalance(address) {
    const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    const satoshis = await response.text();
    return parseFloat(satoshis) / 100000000; // Convert to BTC
  },

  async broadcastTransaction(signedTxHex) {
    const response = await fetch('https://blockchain.info/pushtx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `tx=${signedTxHex}`
    });
    if (!response.ok) throw new Error('Broadcast failed');
    return await response.text();
  },

  async getTransactionStatus(txHash) {
    const response = await fetch(`https://blockchain.info/rawtx/${txHash}`);
    const data = await response.json();
    return {
      confirmations: data.block_height ? 1 : 0,
      status: data.block_height ? 'confirmed' : 'pending'
    };
  }
};

// Ethereum (using public RPC)
export const ethereumService = {
  async getBalance(address) {
    const response = await fetch('https://eth.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    });
    const data = await response.json();
    const weiBalance = parseInt(data.result, 16);
    return weiBalance / 1e18; // Convert to ETH
  },

  async broadcastTransaction(signedTxHex) {
    const response = await fetch('https://eth.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [signedTxHex],
        id: 1
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  },

  async getTransactionStatus(txHash) {
    const response = await fetch('https://eth.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1
      })
    });
    const data = await response.json();
    if (!data.result) return { confirmations: 0, status: 'pending' };
    return {
      confirmations: data.result.status === '0x1' ? 1 : 0,
      status: data.result.status === '0x1' ? 'confirmed' : 'failed'
    };
  },

  async getTokenBalance(address, tokenContract) {
    // ERC-20 balanceOf call
    const data = `0x70a08231000000000000000000000000${address.slice(2)}`;
    const response = await fetch('https://eth.llamarpc.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: tokenContract, data }, 'latest'],
        id: 1
      })
    });
    const result = await response.json();
    return parseInt(result.result, 16) / 1e6; // Assuming 6 decimals for USDT
  }
};

// Get balance for any supported chain
export const getBalance = async (address, network) => {
  try {
    switch (network.toLowerCase()) {
      case 'bitcoin':
      case 'btc':
        return await bitcoinService.getBalance(address);
      case 'ethereum':
      case 'eth':
        return await ethereumService.getBalance(address);
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  } catch (error) {
    console.error(`Failed to fetch balance for ${network}:`, error);
    return 0;
  }
};

// Get token contract addresses
export const TOKEN_CONTRACTS = {
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
};

export const getTokenBalance = async (address, token, network = 'ethereum') => {
  try {
    if (network.toLowerCase() === 'ethereum' || network.toLowerCase() === 'eth') {
      const contract = TOKEN_CONTRACTS[token.toUpperCase()];
      if (!contract) return 0;
      return await ethereumService.getTokenBalance(address, contract);
    }
    return 0;
  } catch (error) {
    console.error(`Failed to fetch ${token} balance:`, error);
    return 0;
  }
};