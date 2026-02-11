import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import { decryptPrivateKey } from './blockchainService';

// Bitcoin transaction signing
export const signBitcoinTransaction = async (privateKeyEncrypted, inputs, outputs, network = 'mainnet') => {
  try {
    const privateKey = decryptPrivateKey(privateKeyEncrypted);
    const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), {
      network: network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
    });

    const psbt = new bitcoin.Psbt({
      network: network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
    });

    // Add inputs
    inputs.forEach(input => {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: Buffer.from(input.scriptPubKey, 'hex'),
          value: Math.floor(input.amount * 1e8) // Convert BTC to satoshis
        }
      });
    });

    // Add outputs
    outputs.forEach(output => {
      psbt.addOutput({
        address: output.address,
        value: Math.floor(output.amount * 1e8) // Convert BTC to satoshis
      });
    });

    // Sign all inputs
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    return psbt.extractTransaction().toHex();
  } catch (error) {
    throw new Error(`Bitcoin signing failed: ${error.message}`);
  }
};

// Ethereum transaction signing
export const signEthereumTransaction = async (privateKeyEncrypted, recipient, amount, gasLimit = 21000, gasPrice = null) => {
  try {
    const privateKey = decryptPrivateKey(privateKeyEncrypted);
    const wallet = new ethers.Wallet(privateKey);

    // Get current gas price if not provided
    if (!gasPrice) {
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      gasPrice = await provider.getFeeData();
    }

    const tx = {
      to: recipient,
      value: ethers.parseEther(amount.toString()),
      gasLimit: gasLimit,
      gasPrice: gasPrice.gasPrice || gasPrice,
      nonce: 0 // Should be fetched from network
    };

    const signedTx = await wallet.signTransaction(tx);
    return signedTx;
  } catch (error) {
    throw new Error(`Ethereum signing failed: ${error.message}`);
  }
};

// Solana transaction signing (requires @solana/web3.js)
export const signSolanaTransaction = async (privateKeyEncrypted, recipient, amount) => {
  try {
    const privateKey = decryptPrivateKey(privateKeyEncrypted);
    // Note: Solana requires @solana/web3.js which needs to be installed separately
    throw new Error('Solana signing requires additional library setup. Install @solana/web3.js');
  } catch (error) {
    throw new Error(`Solana signing failed: ${error.message}`);
  }
};

// Generic transaction validator
export const validateTransaction = (token, amount, recipientAddress, balance) => {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (amount > balance) {
    throw new Error(`Insufficient balance. You have ${balance} ${token}`);
  }

  if (!recipientAddress || recipientAddress.trim() === '') {
    throw new Error('Recipient address is required');
  }

  // Network-specific validation
  switch (token) {
    case 'BTC':
      if (!recipientAddress.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/)) {
        throw new Error('Invalid Bitcoin address');
      }
      break;
    case 'ETH':
    case 'USDT':
    case 'USDC':
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid Ethereum address');
      }
      break;
    case 'SOL':
      if (!recipientAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
        throw new Error('Invalid Solana address');
      }
      break;
    default:
      throw new Error(`Unsupported token: ${token}`);
  }
};