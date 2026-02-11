import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';

const NETWORK = bitcoin.networks.bitcoin; // mainnet
const BLOCKCHAIR_API = 'https://api.blockchair.com/bitcoin';

// Decrypt private key (basic example - use proper encryption in production)
export const decryptPrivateKey = (encrypted) => {
  // In production, use proper AES encryption/decryption
  // For now, returning as-is. You should implement proper decryption.
  return encrypted;
};

// Get UTXO from blockchain
export const getUTXOs = async (address) => {
  try {
    const response = await axios.get(`${BLOCKCHAIR_API}/addresses/${address}?key=nanimouspro`);
    const data = response.data.data[address];
    
    if (!data || !data.utxo) {
      return [];
    }

    return data.utxo.map(utxo => ({
      txid: utxo.transaction_hash,
      vout: utxo.index,
      value: utxo.value,
      satoshis: utxo.value
    }));
  } catch (error) {
    console.error('Failed to get UTXOs:', error);
    throw new Error('Failed to fetch UTXOs from blockchain');
  }
};

// Get current network fee (in satoshis per byte)
export const getNetworkFee = async () => {
  try {
    const response = await axios.get('https://api.blockchain.com/v3/payments/fees/estimates');
    // Returns fees in satoshis/byte
    return {
      slow: response.data.slow,
      standard: response.data.standard,
      fast: response.data.fast
    };
  } catch (error) {
    // Fallback fees
    return {
      slow: 5,
      standard: 10,
      fast: 20
    };
  }
};

// Sign and create transaction
export const createBitcoinTransaction = async (params) => {
  const {
    fromAddress,
    toAddress,
    amount, // in satoshis
    privateKeyWIF,
    feeRate = 10 // sat/byte
  } = params;

  try {
    // Validate addresses
    try {
      bitcoin.address.toOutputScript(fromAddress, NETWORK);
      bitcoin.address.toOutputScript(toAddress, NETWORK);
    } catch {
      throw new Error('Invalid Bitcoin address');
    }

    // Get UTXOs
    const utxos = await getUTXOs(fromAddress);
    if (utxos.length === 0) {
      throw new Error('No unspent outputs found');
    }

    // Create transaction builder
    const txb = new bitcoin.TransactionBuilder(NETWORK);

    // Select UTXOs (simple selection - takes first available)
    let inputAmount = 0;
    const inputs = [];
    for (const utxo of utxos) {
      inputs.push(utxo);
      inputAmount += utxo.satoshis;
      if (inputAmount >= amount + (feeRate * 226)) break; // 226 = avg tx size
    }

    if (inputAmount < amount) {
      throw new Error('Insufficient balance');
    }

    // Calculate fee
    const txSize = 226; // Approximate size in bytes
    const fee = feeRate * txSize;
    const change = inputAmount - amount - fee;

    if (change < 0) {
      throw new Error('Insufficient balance for fee');
    }

    // Add inputs
    const keyPair = bitcoin.ECPair.fromWIF(privateKeyWIF, NETWORK);
    for (const input of inputs) {
      txb.addInput(input.txid, input.vout);
    }

    // Add outputs
    txb.addOutput(toAddress, amount);
    if (change > 546) { // Dust limit
      txb.addOutput(fromAddress, change);
    }

    // Sign inputs
    for (let i = 0; i < inputs.length; i++) {
      txb.sign(i, keyPair);
    }

    const tx = txb.build();
    const txHex = tx.toHex();

    return {
      tx,
      txHex,
      fee,
      change,
      size: txSize
    };
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
};

// Broadcast transaction to network
export const broadcastTransaction = async (txHex) => {
  try {
    // Using blockchain.info API
    const response = await axios.post(
      'https://blockchain.info/pushtx',
      `tx=${txHex}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.includes('error')) {
      throw new Error(response.data);
    }

    // Extract txid from response
    const txid = response.data.trim();
    return txid;
  } catch (error) {
    console.error('Broadcast error:', error);
    throw new Error(`Failed to broadcast: ${error.message}`);
  }
};

// Get transaction status
export const getTransactionStatus = async (txid) => {
  try {
    const response = await axios.get(`${BLOCKCHAIR_API}/transactions/${txid}?key=nanimouspro`);
    const tx = response.data.data[txid];
    
    return {
      txid,
      confirmations: tx.confirmations,
      status: tx.confirmations > 0 ? 'confirmed' : 'pending',
      time: tx.time,
      amount: tx.output_total,
      fee: tx.fee
    };
  } catch (error) {
    throw new Error('Failed to get transaction status');
  }
};