import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';

// Bitcoin mainnet config
const BITCOIN_RPC = 'https://blockstream.info/api';
const NETWORK = bitcoin.networks.bitcoin;

export async function getUTXOs(address) {
  try {
    const response = await axios.get(`${BITCOIN_RPC}/address/${address}/utxo`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch UTXOs: ${error.message}`);
  }
}

export async function getBalance(address) {
  try {
    const response = await axios.get(`${BITCOIN_RPC}/address/${address}`);
    return response.data.chain_stats.funded_txo_sum - response.data.chain_stats.spent_txo_sum;
  } catch (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }
}

export async function estimateFee() {
  try {
    const response = await axios.get('https://mempool.space/api/v1/fees/recommended');
    return response.data.fastestFee; // sat/vB
  } catch (error) {
    // Fallback fee if API fails
    return 25;
  }
}

export async function createAndSignTransaction(privateKeyWIF, toAddress, amountSatoshis, fromAddress) {
  try {
    // Get UTXOs for this address
    const utxos = await getUTXOs(fromAddress);
    if (utxos.length === 0) throw new Error('No UTXOs available');

    // Calculate fee and total needed
    const feeRate = await estimateFee();
    const estimatedSize = 250; // rough estimate for single input, single output
    const fee = Math.ceil((feeRate * estimatedSize) / 1000);
    const totalNeeded = amountSatoshis + fee;

    // Find UTXOs that cover the amount
    let inputSum = 0;
    const inputs = [];
    for (const utxo of utxos) {
      inputs.push(utxo);
      inputSum += utxo.value;
      if (inputSum >= totalNeeded) break;
    }

    if (inputSum < totalNeeded) {
      throw new Error(`Insufficient balance. Need ${totalNeeded} sats, have ${inputSum} sats`);
    }

    // Create transaction
    const psbt = new bitcoin.Psbt({ network: NETWORK });

    // Add inputs
    for (const input of inputs) {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: Buffer.from(input.status.scriptpubkey, 'hex'),
          value: input.value
        }
      });
    }

    // Add output (to recipient)
    psbt.addOutput({
      address: toAddress,
      value: amountSatoshis
    });

    // Add change output if needed
    const change = inputSum - amountSatoshis - fee;
    if (change > 546) { // dust limit
      psbt.addOutput({
        address: fromAddress,
        value: change
      });
    }

    // Sign with private key
    const keyPair = bitcoin.ECPair.fromWIF(privateKeyWIF, NETWORK);
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const signedTx = psbt.extractTransaction();
    return signedTx.toHex();
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

export async function broadcastTransaction(rawTx) {
  try {
    const response = await axios.post('https://blockstream.info/api/tx', rawTx);
    return response.data;
  } catch (error) {
    throw new Error(`Broadcast failed: ${error.response?.data || error.message}`);
  }
}

export async function getTransactionStatus(txid) {
  try {
    const response = await axios.get(`${BITCOIN_RPC}/tx/${txid}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch transaction status: ${error.message}`);
  }
}