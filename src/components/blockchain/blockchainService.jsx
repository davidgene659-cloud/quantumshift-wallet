import CryptoJS from 'crypto-js';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';

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
      case 'solana':
      case 'sol':
        return await solanaService.getBalance(address);
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  } catch (error) {
    console.error(`Failed to fetch balance for ${network}:`, error);
    return 0;
  }
};

// Sign and broadcast Bitcoin transaction
export const sendBitcoinTransaction = async (privateKeyWIF, recipientAddress, amount, feeRate = 10) => {
  try {
    const keyPair = bitcoin.ECPair.fromWIF(privateKeyWIF, bitcoin.networks.bitcoin);
    const senderAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;

    // Get UTXO (simplified - in production, use proper UTXO management)
    const utxos = await fetch(`https://blockchain.info/unspent?active=${senderAddress}`)
      .then(r => r.json())
      .then(data => data.unspent_outputs);

    if (!utxos || utxos.length === 0) throw new Error('No UTXOs available');

    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    let totalInput = 0;
    for (const utxo of utxos) {
      const tx = await fetch(`https://blockchain.info/rawtx/${utxo.tx_hash}?format=hex`).then(r => r.text());
      psbt.addInput({
        hash: utxo.tx_hash,
        index: utxo.tx_output_n,
        nonWitnessUtxo: Buffer.from(tx, 'hex'),
      });
      totalInput += utxo.value / 1e8;
      if (totalInput >= amount) break;
    }

    const fee = (psbt.inputCount * 148 + 34 * 2 + 10) / 1000 * feeRate / 1e8;
    const change = totalInput - amount - fee;

    psbt.addOutput({
      address: recipientAddress,
      value: Math.floor(amount * 1e8),
    });

    if (change > 0) {
      psbt.addOutput({
        address: senderAddress,
        value: Math.floor(change * 1e8),
      });
    }

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    return await bitcoinService.broadcastTransaction(txHex);
  } catch (error) {
    console.error('Bitcoin transaction failed:', error);
    throw error;
  }
};

// Sign and broadcast Ethereum transaction
export const sendEthereumTransaction = async (privateKey, toAddress, amount, gasLimit = '21000') => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const signer = wallet.connect(provider);

    const tx = await signer.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString()),
      gasLimit: gasLimit,
    });

    return tx.hash;
  } catch (error) {
    console.error('Ethereum transaction failed:', error);
    throw error;
  }
};

// Sign and broadcast Solana transaction
export const sendSolanaTransaction = async (privateKeyBase58, recipientAddress, amount) => {
  try {
    // Note: Solana transaction signing requires @solana/web3.js library
    // This is a placeholder - implement with proper Solana SDK
    throw new Error('Solana transactions require additional SDK setup. Use @solana/web3.js');
  } catch (error) {
    console.error('Solana transaction failed:', error);
    throw error;
  }
};

// Solana RPC endpoint (using public Helius RPC)
const SOLANA_RPC = 'https://rpc.helius.so?api-key=fake-key'; // Use env var in production

// Solana service
export const solanaService = {
  async getBalance(address) {
    try {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });
      const data = await response.json();
      return (data.result?.value || 0) / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch Solana balance:', error);
      return 0;
    }
  },

  async broadcastTransaction(signedTxBase64) {
    try {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [signedTxBase64, { skipPreflight: false }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.result;
    } catch (error) {
      console.error('Solana broadcast failed:', error);
      throw error;
    }
  },

  async getTransactionStatus(txSignature) {
    try {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignatureStatus',
          params: [txSignature],
        }),
      });
      const data = await response.json();
      const status = data.result?.value;
      return {
        confirmations: status?.confirmations || 0,
        status: status?.err ? 'failed' : status?.confirmationStatus || 'pending',
      };
    } catch (error) {
      console.error('Failed to fetch Solana tx status:', error);
      return { confirmations: 0, status: 'unknown' };
    }
  },
};

// Get token contract addresses
export const TOKEN_CONTRACTS = {
  // Ethereum
  USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  // Solana token mints
  SOL_USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenErt',
  SOL_USDC: 'EPjFWaLb3odccccVch3sSwbzhdDMsKx9c9X8pkgJwUv',
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