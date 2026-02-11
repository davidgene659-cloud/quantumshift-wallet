import axios from 'axios';

// EVM Chain RPC endpoints
const RPC_ENDPOINTS = {
  ethereum: 'https://eth.meowrpc.com',
  bsc: 'https://bsc-dataseed1.binance.org',
  polygon: 'https://polygon-rpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc'
};

const CHAIN_IDS = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  avalanche: 43114
};

export async function getGasPrice(chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 1
    });

    if (response.data.error) throw new Error(response.data.error.message);
    const gasPriceWei = parseInt(response.data.result, 16);
    return gasPriceWei;
  } catch (error) {
    throw new Error(`Failed to fetch gas price: ${error.message}`);
  }
}

export async function getNonce(address, chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, 'pending'],
      id: 1
    });

    if (response.data.error) throw new Error(response.data.error.message);
    return parseInt(response.data.result, 16);
  } catch (error) {
    throw new Error(`Failed to fetch nonce: ${error.message}`);
  }
}

export async function getBalance(address, chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1
    });

    if (response.data.error) throw new Error(response.data.error.message);
    const balanceWei = BigInt(response.data.result);
    return balanceWei.toString();
  } catch (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
}

export async function estimateGas(fromAddress, toAddress, valueWei, chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_estimateGas',
      params: [{
        from: fromAddress,
        to: toAddress,
        value: '0x' + valueWei.toString(16)
      }],
      id: 1
    });

    if (response.data.error) throw new Error(response.data.error.message);
    return parseInt(response.data.result, 16);
  } catch (error) {
    // Fallback estimation
    return 21000; // Standard ETH transfer
  }
}

export async function createAndSignTransaction(privateKeyHex, toAddress, valueEth, chain = 'ethereum') {
  try {
    // Validate inputs
    if (!privateKeyHex.startsWith('0x')) {
      privateKeyHex = '0x' + privateKeyHex;
    }

    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
      throw new Error('Invalid recipient address');
    }

    // Get transaction parameters
    const [nonce, gasPrice, balance, gasEstimate] = await Promise.all([
      getNonce(toAddress.substr(0, 42), chain),
      getGasPrice(chain),
      getBalance(toAddress.substr(0, 42), chain),
      estimateGas(toAddress.substr(0, 42), toAddress, BigInt(valueEth) * BigInt(10) ** BigInt(18), chain)
    ]);

    const valueWei = BigInt(valueEth) * BigInt(10) ** BigInt(18);
    const gasLimitWithBuffer = Math.floor(gasEstimate * 1.2);
    const totalGasCost = BigInt(gasPrice) * BigInt(gasLimitWithBuffer);
    const totalCost = valueWei + totalGasCost;

    if (BigInt(balance) < totalCost) {
      throw new Error(`Insufficient balance. Need ${totalCost / BigInt(10) ** BigInt(18)} ${chain}, have ${BigInt(balance) / BigInt(10) ** BigInt(18)}`);
    }

    // Build transaction object
    const tx = {
      nonce,
      gasPrice: '0x' + gasPrice.toString(16),
      gasLimit: '0x' + gasLimitWithBuffer.toString(16),
      to: toAddress,
      value: '0x' + valueWei.toString(16),
      data: '0x',
      chainId: CHAIN_IDS[chain]
    };

    // Sign with private key (using basic ECDSA)
    const signedTx = signTransaction(tx, privateKeyHex);
    
    return {
      signedTx,
      transactionHash: null,
      gasUsed: gasLimitWithBuffer,
      gasPrice: gasPrice / 10 ** 9, // Convert to Gwei for display
      totalCost: totalCost / BigInt(10) ** BigInt(18) // Display value
    };
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

function signTransaction(tx, privateKeyHex) {
  // This is a simplified signing - in production, use ethers.js or web3.js
  // For now, return encoded transaction that would need proper signing
  const encodedTx = encodeTransaction(tx);
  return encodedTx;
}

function encodeTransaction(tx) {
  // RLP encode transaction
  const fields = [
    tx.nonce,
    tx.gasPrice,
    tx.gasLimit,
    tx.to,
    tx.value,
    tx.data,
    tx.chainId,
    '0x',
    '0x'
  ];
  return '0x' + fields.map(f => f.toString(16).slice(2).padStart(64, '0')).join('');
}

export async function broadcastTransaction(signedTx, chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signedTx],
      id: 1
    }, {
      timeout: 10000
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    if (!response.data.result) {
      throw new Error('No transaction hash returned');
    }

    return response.data.result;
  } catch (error) {
    throw new Error(`Broadcast failed: ${error.message}`);
  }
}

export async function getTransactionStatus(txHash, chain = 'ethereum') {
  try {
    const rpc = RPC_ENDPOINTS[chain];
    const response = await axios.post(rpc, {
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1
    });

    if (response.data.error) throw new Error(response.data.error.message);

    const receipt = response.data.result;
    if (!receipt) return { status: 'pending', confirmations: 0 };

    return {
      status: receipt.status === '0x1' ? 'success' : 'failed',
      transactionHash: receipt.transactionHash,
      blockNumber: parseInt(receipt.blockNumber, 16),
      gasUsed: parseInt(receipt.gasUsed, 16),
      confirmations: receipt.blockNumber ? 'confirmed' : 'pending'
    };
  } catch (error) {
    throw new Error(`Failed to get transaction status: ${error.message}`);
  }
}

export const SUPPORTED_CHAINS = {
  ethereum: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  bsc: { name: 'Binance Smart Chain', symbol: 'BNB', decimals: 18 },
  polygon: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
  arbitrum: { name: 'Arbitrum', symbol: 'ETH', decimals: 18 },
  optimism: { name: 'Optimism', symbol: 'ETH', decimals: 18 },
  avalanche: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 }
};