import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, Zap, Clock, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Global libraries – check for correct global names
const { ethers } = window;
const bitcoin = window.bitcoin;               // bitcoinjs-lib exposes window.bitcoin
const bip32 = window.bip32;                   // bip32 exposes window.bip32
const bip39 = window.bip39;                   // bip39 exposes window.bip39
const ecc = window.tinysecp256k1;              // tiny-secp256k1 exposes window.tinysecp256k1

// Initialize bitcoinjs-lib with the secp256k1 library (required for signing)
if (bitcoin && ecc) {
  bitcoin.initEccLib(ecc);
}

// Network configurations
const NETWORKS = {
  ethereum: {
    type: 'evm',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY', // Replace with your Infura key
    nativeSymbol: 'ETH',
    explorer: 'https://etherscan.io/tx/'
  },
  base: {
    type: 'evm',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    nativeSymbol: 'ETH',
    explorer: 'https://basescan.org/tx/'
  },
  polygon: {
    type: 'evm',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeSymbol: 'MATIC',
    explorer: 'https://polygonscan.com/tx/'
  },
  bsc: {
    type: 'evm',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeSymbol: 'BNB',
    explorer: 'https://bscscan.com/tx/'
  },
  arbitrum: {
    type: 'evm',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeSymbol: 'ETH',
    explorer: 'https://arbiscan.io/tx/'
  },
  optimism: {
    type: 'evm',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeSymbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io/tx/'
  },
  bitcoin: {
    type: 'utxo',
    name: 'Bitcoin',
    network: bitcoin?.networks?.bitcoin || { message: 'Bitcoin network not loaded' }, // fallback
    apiBase: 'https://mempool.space/api',
    nativeSymbol: 'BTC',
    explorer: 'https://mempool.space/tx/',
    derivationPath: "m/44'/0'/0'/0/0" // BIP44 for Bitcoin mainnet
  }
};

export default function TransactionBuilder({ isOpen, onClose, wallet }) {
  // Step: 1=details, 2=fee, 3=review, 4=result
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState(wallet?.blockchain || 'ethereum');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeOption, setFeeOption] = useState('standard');
  const [txPreview, setTxPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState(null);
  
  // EVM-specific state
  const [evmAddress, setEvmAddress] = useState('');
  const [evmPrivateKey, setEvmPrivateKey] = useState('');
  const [evmBalance, setEvmBalance] = useState(null);
  const [gasPrices, setGasPrices] = useState(null);
  const [estimatedGas, setEstimatedGas] = useState(null);
  
  // Bitcoin-specific state
  const [btcAddress, setBtcAddress] = useState('');
  const [btcPrivateKey, setBtcPrivateKey] = useState(null); // Will hold the bip32 node
  const [btcBalance, setBtcBalance] = useState(null); // in satoshis
  const [utxos, setUtxos] = useState([]);
  const [feeRates, setFeeRates] = useState(null); // { fastestFee, halfHourFee, hourFee } from mempool.space
  const [estimatedVSize, setEstimatedVSize] = useState(null);
  const [selectedUtxos, setSelectedUtxos] = useState([]); // UTXOs we will spend

  // Derive keys from mnemonic when component opens
  useEffect(() => {
    if (!wallet?.mnemonic) return;
    try {
      // ----- EVM derivation (using ethers) -----
      const evmNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic);
      setEvmPrivateKey(evmNode.privateKey);
      setEvmAddress(evmNode.address);

      // ----- Bitcoin derivation (using bip39 + bip32) -----
      if (bip39 && bip32 && bitcoin) {
        // Convert mnemonic to seed
        const seed = bip39.mnemonicToSeedSync(wallet.mnemonic);
        const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
        const btcNode = root.derivePath(NETWORKS.bitcoin.derivationPath);
        setBtcPrivateKey(btcNode);
        setBtcAddress(bitcoin.payments.p2pkh({ pubkey: btcNode.publicKey, network: bitcoin.networks.bitcoin }).address);
      } else {
        console.warn('Bitcoin libraries not loaded – Bitcoin functionality disabled');
      }
    } catch (e) {
      console.error('Failed to derive keys:', e);
      toast.error('Invalid mnemonic or missing libraries');
    }
  }, [wallet?.mnemonic]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setToAddress('');
      setAmount('');
      setFeeOption('standard');
      setTxPreview(null);
      setTxResult(null);
      setEvmBalance(null);
      setGasPrices(null);
      setEstimatedGas(null);
      setBtcBalance(null);
      setUtxos([]);
      setFeeRates(null);
      setEstimatedVSize(null);
      setSelectedUtxos([]);
    }
  }, [isOpen]);

  // Fetch network-specific data when inputs change
  useEffect(() => {
    const network = NETWORKS[selectedNetwork];
    if (!network) return;

    if (network.type === 'evm') {
      if (!evmAddress) return;
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);

      provider.getBalance(evmAddress).then(bal => {
        setEvmBalance(ethers.formatEther(bal));
      }).catch(console.error);

      provider.getFeeData().then(fees => {
        const baseGasPrice = fees.gasPrice;
        setGasPrices({
          slow: baseGasPrice * 80n / 100n,
          standard: baseGasPrice,
          fast: baseGasPrice * 120n / 100n
        });
      }).catch(console.error);

      if (toAddress && amount && parseFloat(amount) > 0 && ethers.isAddress(toAddress)) {
        const value = ethers.parseEther(amount);
        provider.estimateGas({
          from: evmAddress,
          to: toAddress,
          value: value
        }).then(gas => {
          setEstimatedGas(gas);
        }).catch(err => {
          console.error('Gas estimation failed:', err);
          setEstimatedGas(null);
          toast.error('Could not estimate gas. Check recipient address or amount.');
        });
      }
    } else if (network.type === 'utxo' && network.name === 'Bitcoin') {
      if (!btcAddress) return;

      // Fetch balance and UTXOs
      fetch(`${network.apiBase}/address/${btcAddress}`)
        .then(res => res.json())
        .then(data => {
          const funded = data.chain_stats.funded_txo_sum;
          const spent = data.chain_stats.spent_txo_sum;
          setBtcBalance(funded - spent);
        })
        .catch(err => {
          console.error('Failed to fetch BTC balance:', err);
          toast.error('Could not fetch Bitcoin balance');
        });

      fetch(`${network.apiBase}/address/${btcAddress}/utxo`)
        .then(res => res.json())
        .then(setUtxos)
        .catch(err => {
          console.error('Failed to fetch UTXOs:', err);
          toast.error('Could not fetch UTXOs');
        });

      // Fetch recommended fee rates
      fetch(`${network.apiBase}/v1/fees/recommended`)
        .then(res => res.json())
        .then(data => {
          setFeeRates({
            slow: data.hourFee,      // sat/vbyte
            standard: data.halfHourFee,
            fast: data.fastestFee
          });
        })
        .catch(console.error);
    }
  }, [selectedNetwork, evmAddress, btcAddress, toAddress, amount]);

  // Simple UTXO selection: select enough UTXOs to cover amount + fee (approximate)
  useEffect(() => {
    if (!utxos.length || !amount || !feeRates || !feeOption) {
      setSelectedUtxos([]);
      setEstimatedVSize(null);
      return;
    }
    const amountSat = Math.floor(parseFloat(amount) * 1e8);
    const feeRate = feeRates[feeOption];
    // Start with a dummy vsize to approximate fee
    let selected = [];
    let totalSelected = 0;
    let vsize = 10; // overhead
    for (const utxo of utxos) {
      selected.push(utxo);
      totalSelected += utxo.value;
      vsize += 68; // approximate input size
      // Rough fee: (vsize) * feeRate
      const estimatedFee = vsize * feeRate;
      if (totalSelected >= amountSat + estimatedFee) break;
    }
    if (totalSelected < amountSat) {
      // Not enough funds
      setSelectedUtxos([]);
      setEstimatedVSize(null);
    } else {
      setSelectedUtxos(selected);
      setEstimatedVSize(vsize + 31 * 2); // add two outputs (recipient + change)
    }
  }, [utxos, amount, feeRates, feeOption]);

  // Compute fee options for the current network
  const getFeeOptions = () => {
    const network = NETWORKS[selectedNetwork];
    if (!network) return [];

    if (network.type === 'evm') {
      if (!gasPrices || !estimatedGas) return [];
      return [
        {
          value: 'slow',
          label: 'Slow',
          icon: Clock,
          time: '5-10 min',
          price: ethers.formatUnits(gasPrices.slow, 'gwei') + ' Gwei',
          cost: ethers.formatEther(gasPrices.slow * estimatedGas),
          color: 'text-blue-400'
        },
        {
          value: 'standard',
          label: 'Standard',
          icon: Zap,
          time: '2-5 min',
          price: ethers.formatUnits(gasPrices.standard, 'gwei') + ' Gwei',
          cost: ethers.formatEther(gasPrices.standard * estimatedGas),
          color: 'text-purple-400'
        },
        {
          value: 'fast',
          label: 'Fast',
          icon: Zap,
          time: '< 2 min',
          price: ethers.formatUnits(gasPrices.fast, 'gwei') + ' Gwei',
          cost: ethers.formatEther(gasPrices.fast * estimatedGas),
          color: 'text-orange-400'
        }
      ];
    } else if (network.type === 'utxo') {
      if (!feeRates || !estimatedVSize) return [];
      return [
        {
          value: 'slow',
          label: 'Slow',
          icon: Clock,
          time: '1-2 hours',
          price: feeRates.slow + ' sat/vB',
          cost: ((feeRates.slow * estimatedVSize) / 1e8).toFixed(8),
          color: 'text-blue-400'
        },
        {
          value: 'standard',
          label: 'Standard',
          icon: Zap,
          time: '30-60 min',
          price: feeRates.standard + ' sat/vB',
          cost: ((feeRates.standard * estimatedVSize) / 1e8).toFixed(8),
          color: 'text-purple-400'
        },
        {
          value: 'fast',
          label: 'Fast',
          icon: Zap,
          time: '10-30 min',
          price: feeRates.fast + ' sat/vB',
          cost: ((feeRates.fast * estimatedVSize) / 1e8).toFixed(8),
          color: 'text-orange-400'
        }
      ];
    }
    return [];
  };

  const feeOptions = getFeeOptions();

  const handleNext = () => {
    if (step === 1) {
      // Validate step 1
      const network = NETWORKS[selectedNetwork];
      if (!toAddress || !amount) {
        toast.error('Please fill in all fields');
        return;
      }
      if (network.type === 'evm' && !ethers.isAddress(toAddress)) {
        toast.error('Invalid EVM address');
        return;
      }
      if (network.type === 'utxo' && !toAddress.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/)) {
        toast.error('Invalid Bitcoin address');
        return;
      }
      if (parseFloat(amount) <= 0) {
        toast.error('Amount must be greater than 0');
        return;
      }
      // Check balance
      if (network.type === 'evm' && evmBalance && parseFloat(amount) > parseFloat(evmBalance)) {
        toast.error('Insufficient balance');
        return;
      }
      if (network.type === 'utxo' && btcBalance !== null) {
        const amountSat = Math.floor(parseFloat(amount) * 1e8);
        if (amountSat > btcBalance) {
          toast.error('Insufficient balance');
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (feeOptions.length === 0) {
        toast.error('Fee estimation not ready. Please wait.');
        return;
      }
      // Build preview based on network type
      const network = NETWORKS[selectedNetwork];
      if (network.type === 'evm') {
        const value = ethers.parseEther(amount);
        const gasPrice = gasPrices[feeOption];
        const tx = {
          from: evmAddress,
          to: toAddress,
          value: value,
          gasLimit: estimatedGas,
          gasPrice: gasPrice,
          chainId: network.chainId,
          nonce: null
        };
        setTxPreview(tx);
      } else {
        // Bitcoin preview
        const feeRate = feeRates[feeOption];
        const amountSat = Math.floor(parseFloat(amount) * 1e8);
        const fee = feeRate * estimatedVSize;
        setTxPreview({
          to: toAddress,
          amountSat,
          fee,
          feeRate,
          utxos: selectedUtxos,
          vsize: estimatedVSize
        });
      }
      setStep(3);
    } else if (step === 3) {
      // Send transaction
      handleSendTransaction();
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSendTransaction = async () => {
    setIsProcessing(true);
    const network = NETWORKS[selectedNetwork];
    try {
      if (network.type === 'evm') {
        await handleSendEVM();
      } else {
        await handleSendBitcoin();
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed: ' + (error.message || 'Unknown error'));
      setTxResult(null);
      setStep(4); // Show failure state
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEVM = async () => {
    const network = NETWORKS[selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const walletSigner = new ethers.Wallet(evmPrivateKey, provider);

    const nonce = await provider.getTransactionCount(evmAddress);
    const signedTx = await walletSigner.sendTransaction({
      ...txPreview,
      nonce: nonce,
      type: 2
    });

    setTxResult({
      hash: signedTx.hash,
      explorerUrl: network.explorer + signedTx.hash
    });
    setStep(4);
    toast.success('Transaction sent!');
  };

  const handleSendBitcoin = async () => {
    const network = NETWORKS.bitcoin;
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    let totalInput = 0;
    // Add selected UTXOs as inputs
    txPreview.utxos.forEach(utxo => {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptpubkey, 'hex'),
          value: utxo.value
        }
      });
      totalInput += utxo.value;
    });

    // Add recipient output
    psbt.addOutput({
      address: txPreview.to,
      value: txPreview.amountSat
    });

    // Calculate change
    const change = totalInput - txPreview.amountSat - txPreview.fee;
    if (change > 0) {
      psbt.addOutput({
        address: btcAddress, // In production, use a fresh change address
        value: change
      });
    }

    // Sign all inputs
    for (let i = 0; i < txPreview.utxos.length; i++) {
      psbt.signInput(i, btcPrivateKey);
    }

    psbt.finalizeAllInputs();
    const txHex = psbt.extractTransaction().toHex();

    // Broadcast via Mempool.space
    const broadcastResponse = await fetch(`${network.apiBase}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex
    });

    if (!broadcastResponse.ok) {
      const errorText = await broadcastResponse.text();
      throw new Error(`Broadcast failed: ${errorText}`);
    }

    const txid = await broadcastResponse.text();
    setTxResult({
      hash: txid,
      explorerUrl: network.explorer + txid
    });
    setStep(4);
    toast.success('Bitcoin transaction sent!');
  };

  const renderStep = () => {
    const network = NETWORKS[selectedNetwork];
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label>Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/20">
                  {Object.entries(NETWORKS).map(([key, net]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                      {net.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipient Address</Label>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder={network.type === 'evm' ? '0x...' : 'bc1... or 1...'}
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Amount ({network.nativeSymbol})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            {network.type === 'evm' && evmBalance !== null && (
              <div className="text-sm text-white/70">
                Balance: {parseFloat(evmBalance).toFixed(6)} {network.nativeSymbol}
              </div>
            )}
            {network.type === 'utxo' && btcBalance !== null && (
              <div className="text-sm text-white/70">
                Balance: {(btcBalance / 1e8).toFixed(8)} {network.nativeSymbol}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-white font-medium">
              {network.type === 'evm' ? 'Select Gas Price' : 'Select Fee Rate'}
            </h3>
            <div className="grid gap-3">
              {feeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = feeOption === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFeeOption(option.value)}
                    className={`w-full p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${option.color}`} />
                        <span className="text-white font-medium">{option.label}</span>
                      </div>
                      <span className="text-white/70 text-sm">{option.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-white/50">{option.price}</span>
                      <span className="text-white font-mono">{option.cost} {network.nativeSymbol}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {feeOptions.length === 0 && (
              <div className="flex items-center justify-center text-white/50">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Estimating fees...
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-white font-medium">Review Transaction</h3>
            <div className="bg-black/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-white/50">Network</span>
                <span className="text-white">{network.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">From</span>
                <span className="text-white font-mono text-sm">
                  {network.type === 'evm' ? truncate(evmAddress) : truncate(btcAddress)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">To</span>
                <span className="text-white font-mono text-sm">{truncate(toAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Amount</span>
                <span className="text-white">{amount} {network.nativeSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Fee</span>
                <span className="text-white">
                  {feeOptions.find(o => o.value === feeOption)?.cost} {network.nativeSymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">Total</span>
                <span className="text-white font-medium">
                  {network.type === 'evm'
                    ? (parseFloat(amount) + parseFloat(feeOptions.find(o => o.value === feeOption)?.cost || 0)).toFixed(6)
                    : (parseFloat(amount) + parseFloat(feeOptions.find(o => o.value === feeOption)?.cost || 0)).toFixed(8)
                  } {network.nativeSymbol}
                </span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 text-center">
            {txResult ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
                <h3 className="text-white text-lg font-medium">Transaction Sent!</h3>
                <p className="text-white/70 text-sm break-all">
                  Hash: {truncate(txResult.hash, 10, 10)}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => window.open(txResult.explorerUrl, '_blank')}
                  >
                    View on Explorer
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto" />
                <h3 className="text-white text-lg font-medium">Transaction Failed</h3>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => setStep(1)}
                >
                  Try Again
                </Button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const truncate = (str, start = 6, end = 4) =>
    str ? `${str.slice(0, start)}...${str.slice(-end)}` : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0B0E1A] border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Send Transaction
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s === step
                    ? 'bg-purple-600 text-white'
                    : s < step
                    ? 'bg-green-600 text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 4 && <div className={`w-12 h-0.5 mx-1 ${s < step ? 'bg-green-600' : 'bg-white/20'}`} />}
            </div>
          ))}
        </div>

        {renderStep()}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isProcessing}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={isProcessing || (step === 2 && feeOptions.length === 0)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : step === 3 ? (
                'Confirm & Send'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}