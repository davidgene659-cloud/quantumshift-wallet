import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, Zap, Clock, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Use global ethers (loaded from CDN)
const { ethers } = window;

// Network configuration
const NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY', // Replace with your Infura key or use a public endpoint
    nativeSymbol: 'ETH',
    explorer: 'https://etherscan.io/tx/'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    nativeSymbol: 'ETH',
    explorer: 'https://basescan.org/tx/'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    nativeSymbol: 'MATIC',
    explorer: 'https://polygonscan.com/tx/'
  },
  bsc: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeSymbol: 'BNB',
    explorer: 'https://bscscan.com/tx/'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeSymbol: 'ETH',
    explorer: 'https://arbiscan.io/tx/'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    nativeSymbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io/tx/'
  }
};

export default function TransactionBuilder({ isOpen, onClose, wallet }) {
  // Step: 1=details, 2=gas, 3=review, 4=result
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState(wallet?.blockchain || 'ethereum');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [gasOption, setGasOption] = useState('standard');
  const [txPreview, setTxPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [balance, setBalance] = useState(null);
  const [gasPrices, setGasPrices] = useState(null);
  const [estimatedGas, setEstimatedGas] = useState(null);

  // Derive wallet from mnemonic when component opens or mnemonic changes
  useEffect(() => {
    if (!wallet?.mnemonic) return;
    try {
      const hdNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic);
      setPrivateKey(hdNode.privateKey);
      setAddress(hdNode.address);
    } catch (e) {
      console.error('Failed to derive wallet:', e);
      toast.error('Invalid mnemonic');
    }
  }, [wallet?.mnemonic]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setToAddress('');
      setAmount('');
      setGasOption('standard');
      setTxPreview(null);
      setTxResult(null);
      setBalance(null);
      setGasPrices(null);
      setEstimatedGas(null);
    }
  }, [isOpen]);

  // Fetch balance, gas prices, and estimate gas when step advances or inputs change
  useEffect(() => {
    if (!address || !selectedNetwork) return;
    const network = NETWORKS[selectedNetwork];
    if (!network) return;
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);

    // Fetch native balance
    provider.getBalance(address).then(bal => {
      setBalance(ethers.formatEther(bal));
    }).catch(console.error);

    // Fetch current gas price
    provider.getFeeData().then(fees => {
      const baseGasPrice = fees.gasPrice;
      setGasPrices({
        slow: baseGasPrice * 80n / 100n, // 20% less
        standard: baseGasPrice,
        fast: baseGasPrice * 120n / 100n  // 20% more
      });
    }).catch(console.error);

    // Estimate gas if we have recipient and amount
    if (toAddress && amount && parseFloat(amount) > 0) {
      const value = ethers.parseEther(amount);
      provider.estimateGas({
        from: address,
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
  }, [address, selectedNetwork, toAddress, amount]);

  // Compute gas cost for each option (only when gasPrices and estimatedGas are available)
  const gasOptions = gasPrices && estimatedGas ? [
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
  ] : [];

  const handleNext = () => {
    if (step === 1) {
      if (!toAddress || !amount) {
        toast.error('Please fill in all fields');
        return;
      }
      if (!ethers.isAddress(toAddress)) {
        toast.error('Invalid recipient address');
        return;
      }
      if (parseFloat(amount) <= 0) {
        toast.error('Amount must be greater than 0');
        return;
      }
      if (balance && parseFloat(amount) > parseFloat(balance)) {
        toast.error('Insufficient balance');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!gasPrices || !estimatedGas) {
        toast.error('Gas estimation not ready. Please wait.');
        return;
      }
      // Build preview transaction
      const network = NETWORKS[selectedNetwork];
      const value = ethers.parseEther(amount);
      const gasPrice = gasPrices[gasOption];
      const tx = {
        from: address,
        to: toAddress,
        value: value,
        gasLimit: estimatedGas,
        gasPrice: gasPrice,
        chainId: network.chainId,
        nonce: null // will be filled later
      };
      setTxPreview(tx);
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
    if (!privateKey || !txPreview) return;
    setIsProcessing(true);
    try {
      const network = NETWORKS[selectedNetwork];
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const walletSigner = new ethers.Wallet(privateKey, provider);

      // Get current nonce
      const nonce = await provider.getTransactionCount(address);
      const signedTx = await walletSigner.sendTransaction({
        ...txPreview,
        nonce: nonce,
        type: 2, // EIP-1559 not used here; using legacy for simplicity
      });

      setTxResult({
        hash: signedTx.hash,
        explorerUrl: network.explorer + signedTx.hash
      });
      setStep(4);
      toast.success('Transaction sent!');
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed: ' + (error.reason || error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
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
                placeholder="0x..."
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Amount ({NETWORKS[selectedNetwork]?.nativeSymbol})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>
            {balance !== null && (
              <div className="text-sm text-white/70">
                Balance: {parseFloat(balance).toFixed(6)} {NETWORKS[selectedNetwork]?.nativeSymbol}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-white font-medium">Select Gas Price</h3>
            <div className="grid gap-3">
              {gasOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = gasOption === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setGasOption(option.value)}
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
                      <span className="text-white font-mono">{option.cost} {NETWORKS[selectedNetwork]?.nativeSymbol}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {!gasPrices && (
              <div className="flex items-center justify-center text-white/50">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Estimating gas...
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
                <span className="text-white">{NETWORKS[selectedNetwork]?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">From</span>
                <span className="text-white font-mono text-sm">{address ? truncate(address) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">To</span>
                <span className="text-white font-mono text-sm">{truncate(toAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Amount</span>
                <span className="text-white">{amount} {NETWORKS[selectedNetwork]?.nativeSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Gas Fee</span>
                <span className="text-white">
                  {gasOptions.find(o => o.value === gasOption)?.cost} {NETWORKS[selectedNetwork]?.nativeSymbol}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2">
                <span className="text-white/50">Total</span>
                <span className="text-white font-medium">
                  {(parseFloat(amount) + parseFloat(gasOptions.find(o => o.value === gasOption)?.cost || 0)).toFixed(6)} {NETWORKS[selectedNetwork]?.nativeSymbol}
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
              disabled={isProcessing || (step === 2 && (!gasPrices || !estimatedGas))}
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

