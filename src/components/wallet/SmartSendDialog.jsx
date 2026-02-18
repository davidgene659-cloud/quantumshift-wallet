import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Lock, Zap, Clock, DollarSign, AlertTriangle, CheckCircle2, Coins } from 'lucide-react';
import { toast } from 'sonner';

// Global libraries
const { ethers } = window;
const bitcoin = window.bitcoin;
const bip32 = window.bip32;
const bip39 = window.bip39;
const ecc = window.tinysecp256k1;

if (bitcoin && ecc) {
  bitcoin.initEccLib(ecc);
}

// Network configurations
const NETWORKS = {
  ethereum: {
    type: 'evm',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'ETH',
    explorer: 'https://etherscan.io/tx/',
    quickNodeEndpoint: true
  },
  base: {
    type: 'evm',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'ETH',
    explorer: 'https://basescan.org/tx/',
    quickNodeEndpoint: true
  },
  polygon: {
    type: 'evm',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'MATIC',
    explorer: 'https://polygonscan.com/tx/',
    quickNodeEndpoint: true
  },
  bsc: {
    type: 'evm',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'BNB',
    explorer: 'https://bscscan.com/tx/',
    quickNodeEndpoint: true
  },
  arbitrum: {
    type: 'evm',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'ETH',
    explorer: 'https://arbiscan.io/tx/',
    quickNodeEndpoint: true
  },
  optimism: {
    type: 'evm',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://your-quicknode-endpoint.quiknode.pro/your-api-key/', // Replace with QuickNode endpoint
    nativeSymbol: 'ETH',
    explorer: 'https://optimistic.etherscan.io/tx/',
    quickNodeEndpoint: true
  },
  bitcoin: {
    type: 'utxo',
    name: 'Bitcoin',
    network: bitcoin?.networks?.bitcoin,
    apiBase: 'https://mempool.space/api',
    nativeSymbol: 'BTC',
    explorer: 'https://mempool.space/tx/',
    derivationPath: "m/44'/0'/0'/0/0"
  }
};

// Minimal ERC20 ABI for balanceOf and transfer
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export default function TransactionBuilder({ isOpen, onClose, wallet }) {
  // Step: 1=details, 2=fee, 3=review, 4=result
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState(wallet?.blockchain || 'ethereum');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(null); // null = native currency
  const [tokenList, setTokenList] = useState([]);
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
  const [tokenBalances, setTokenBalances] = useState({}); // address -> balance
  
  // Bitcoin-specific state
  const [btcAddress, setBtcAddress] = useState('');
  const [btcPrivateKey, setBtcPrivateKey] = useState(null);
  const [btcBalance, setBtcBalance] = useState(null);
  const [utxos, setUtxos] = useState([]);
  const [feeRates, setFeeRates] = useState(null);
  const [estimatedVSize, setEstimatedVSize] = useState(null);
  const [selectedUtxos, setSelectedUtxos] = useState([]);

  // Derive keys from mnemonic
  useEffect(() => {
    if (!wallet?.mnemonic) return;
    try {
      // EVM derivation
      const evmNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic);
      setEvmPrivateKey(evmNode.privateKey);
      setEvmAddress(evmNode.address);

      // Bitcoin derivation
      if (bip39 && bip32 && bitcoin) {
        const seed = bip39.mnemonicToSeedSync(wallet.mnemonic);
        const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
        const btcNode = root.derivePath(NETWORKS.bitcoin.derivationPath);
        setBtcPrivateKey(btcNode);
        setBtcAddress(bitcoin.payments.p2pkh({ pubkey: btcNode.publicKey, network: bitcoin.networks.bitcoin }).address);
      }
    } catch (e) {
      console.error('Failed to derive keys:', e);
      toast.error('Invalid mnemonic');
    }
  }, [wallet?.mnemonic]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setToAddress('');
      setAmount('');
      setSelectedToken(null);
      setTokenList([]);
      setFeeOption('standard');
      setTxPreview(null);
      setTxResult(null);
      setEvmBalance(null);
      setGasPrices(null);
      setEstimatedGas(null);
      setTokenBalances({});
      setBtcBalance(null);
      setUtxos([]);
      setFeeRates(null);
      setEstimatedVSize(null);
      setSelectedUtxos([]);
    }
  }, [isOpen]);

  // Fetch network data (balances, gas, fees)
  useEffect(() => {
    const network = NETWORKS[selectedNetwork];
    if (!network) return;

    if (network.type === 'evm') {
      if (!evmAddress) return;
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);

      // Native balance
      provider.getBalance(evmAddress).then(bal => {
        setEvmBalance(ethers.formatEther(bal));
      }).catch(console.error);

      // Gas prices
      provider.getFeeData().then(fees => {
        const baseGasPrice = fees.gasPrice;
        setGasPrices({
          slow: baseGasPrice * 80n / 100n,
          standard: baseGasPrice,
          fast: baseGasPrice * 120n / 100n
        });
      }).catch(console.error);

      // Estimate gas for native transfer (if applicable)
      if (toAddress && amount && parseFloat(amount) > 0 && ethers.isAddress(toAddress) && !selectedToken) {
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
        });
      }

      // Fetch ALL token balances using QuickNode Token API [citation:5]
      if (network.quickNodeEndpoint) {
        provider.send('qn_getWalletTokenBalance', [{
          wallet: evmAddress
        }]).then(result => {
          if (result && result.assets) {
            const tokens = result.assets.map(asset => ({
              address: asset.address,
              symbol: asset.symbol,
              name: asset.name,
              decimals: asset.decimals,
              balance: ethers.formatUnits(asset.amount, asset.decimals),
              rawBalance: asset.amount
            }));
            setTokenList(tokens);
            
            // Store raw balances for quick lookup
            const balanceMap = {};
            tokens.forEach(t => {
              balanceMap[t.address.toLowerCase()] = t.rawBalance;
            });
            setTokenBalances(balanceMap);
          }
        }).catch(err => {
          console.error('Failed to fetch token balances:', err);
          toast.error('Could not fetch token balances');
        });
      }
    } else if (network.type === 'utxo') {
      // Bitcoin data fetching (unchanged)
      if (!btcAddress) return;
      
      fetch(`${network.apiBase}/address/${btcAddress}`)
        .then(res => res.json())
        .then(data => {
          const funded = data.chain_stats.funded_txo_sum;
          const spent = data.chain_stats.spent_txo_sum;
          setBtcBalance(funded - spent);
        }).catch(console.error);

      fetch(`${network.apiBase}/address/${btcAddress}/utxo`)
        .then(res => res.json())
        .then(setUtxos)
        .catch(console.error);

      fetch(`${network.apiBase}/v1/fees/recommended`)
        .then(res => res.json())
        .then(data => {
          setFeeRates({
            slow: data.hourFee,
            standard: data.halfHourFee,
            fast: data.fastestFee
          });
        }).catch(console.error);
    }
  }, [selectedNetwork, evmAddress, btcAddress, toAddress, amount, selectedToken]);

  // Estimate gas for token transfer when token is selected
  useEffect(() => {
    if (!selectedToken || !toAddress || !amount || !evmAddress) return;
    
    const network = NETWORKS[selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    const tokenContract = new ethers.Contract(selectedToken.address, ERC20_ABI, provider);
    const amountInWei = ethers.parseUnits(amount, selectedToken.decimals);
    
    tokenContract.transfer.estimateGas(toAddress, amountInWei, { from: evmAddress })
      .then(gas => {
        setEstimatedGas(gas);
      })
      .catch(err => {
        console.error('Token gas estimation failed:', err);
        setEstimatedGas(null);
        toast.error('Cannot estimate gas. Check recipient address or amount.');
      });
  }, [selectedToken, toAddress, amount, evmAddress, selectedNetwork]);

  // Simple UTXO selection for Bitcoin (unchanged)
  useEffect(() => {
    if (!utxos.length || !amount || !feeRates || !feeOption) {
      setSelectedUtxos([]);
      setEstimatedVSize(null);
      return;
    }
    const amountSat = Math.floor(parseFloat(amount) * 1e8);
    const feeRate = feeRates[feeOption];
    let selected = [];
    let totalSelected = 0;
    let vsize = 10;
    for (const utxo of utxos) {
      selected.push(utxo);
      totalSelected += utxo.value;
      vsize += 68;
      const estimatedFee = vsize * feeRate;
      if (totalSelected >= amountSat + estimatedFee) break;
    }
    if (totalSelected < amountSat) {
      setSelectedUtxos([]);
      setEstimatedVSize(null);
    } else {
      setSelectedUtxos(selected);
      setEstimatedVSize(vsize + 31 * 2);
    }
  }, [utxos, amount, feeRates, feeOption]);

  // Compute fee options
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
      // Validation
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

      // Balance check
      if (network.type === 'evm') {
        if (selectedToken) {
          // Check token balance
          const token = tokenList.find(t => t.address === selectedToken.address);
          if (!token || parseFloat(amount) > parseFloat(token.balance)) {
            toast.error(`Insufficient ${selectedToken.symbol} balance`);
            return;
          }
        } else {
          // Check native balance
          if (evmBalance && parseFloat(amount) > parseFloat(evmBalance)) {
            toast.error('Insufficient native balance');
            return;
          }
        }
      } else if (network.type === 'utxo' && btcBalance !== null) {
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
      // Build preview
      const network = NETWORKS[selectedNetwork];
      if (network.type === 'evm') {
        const gasPrice = gasPrices[feeOption];
        setTxPreview({
          type: selectedToken ? 'token' : 'native',
          to: toAddress,
          amount: amount,
          token: selectedToken,
          gasLimit: estimatedGas,
          gasPrice: gasPrice,
          chainId: network.chainId
        });
      } else {
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
      handleSendTransaction();
    }
  };

  const handleBack = () => setStep(step - 1);

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
      setStep(4);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEVM = async () => {
    const network = NETWORKS[selectedNetwork];
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    const walletSigner = new ethers.Wallet(evmPrivateKey, provider);
    const nonce = await provider.getTransactionCount(evmAddress);

    let tx;
    if (txPreview.type === 'token') {
      // ERC20 token transfer [citation:5]
      const token = txPreview.token;
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, walletSigner);
      const amountInWei = ethers.parseUnits(txPreview.amount, token.decimals);
      
      tx = await tokenContract.transfer(txPreview.to, amountInWei, {
        gasLimit: txPreview.gasLimit,
        gasPrice: txPreview.gasPrice,
        nonce: nonce
      });
    } else {
      // Native transfer
      tx = await walletSigner.sendTransaction({
        to: txPreview.to,
        value: ethers.parseEther(txPreview.amount),
        gasLimit: txPreview.gasLimit,
        gasPrice: txPreview.gasPrice,
        nonce: nonce
      });
    }

    setTxResult({
      hash: tx.hash,
      explorerUrl: network.explorer + tx.hash
    });
    setStep(4);
    toast.success('Transaction sent!');
  };

  const handleSendBitcoin = async () => {
    const network = NETWORKS.bitcoin;
    const psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    let totalInput = 0;
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

    psbt.addOutput({
      address: txPreview.to,
      value: txPreview.amountSat
    });

    const change = totalInput - txPreview.amountSat - txPreview.fee;
    if (change > 0) {
      psbt.addOutput({
        address: btcAddress,
        value: change
      });
    }

    for (let i = 0; i < txPreview.utxos.length; i++) {
      psbt.signInput(i, btcPrivateKey);
    }

    psbt.finalizeAllInputs();
    const txHex = psbt.extractTransaction().toHex();

    const broadcastResponse = await fetch(`${network.apiBase}/tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex
    });

    if (!broadcastResponse.ok) {
      throw new Error('Broadcast failed: ' + await broadcastResponse.text());
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

            {network.type === 'evm' && (
              <div>
                <Label>Token (optional)</Label>
                <Select 
                  onValueChange={(value) => {
                    if (value === 'native') {
                      setSelectedToken(null);
                    } else {
                      const token = tokenList.find(t => t.address === value);
                      setSelectedToken(token);
                    }
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Native currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-white/20">
                    <SelectItem value="native" className="text-white hover:bg-white/10">
                      {network.nativeSymbol} (Native)
                    </SelectItem>
                    {tokenList.map(token => (
                      <SelectItem key={token.address} value={token.address} className="text-white hover:bg-white/10">
                        {token.symbol} - {parseFloat(token.balance).toFixed(4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <Label>
                Amount {selectedToken ? `(${selectedToken.symbol})` : `(${network.nativeSymbol})`}
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-white/5 border-white/20 text-white"
              />
            </div>

            {network.type === 'evm' && (
              <div className="text-sm text-white/70">
                {selectedToken ? (
                  <>Balance: {selectedToken.balance} {selectedToken.symbol}</>
                ) : (
                  evmBalance !== null && <>Balance: {parseFloat(evmBalance).toFixed(6)} {network.nativeSymbol}</>
                )}
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
              {selectedToken && (
                <div className="flex justify-between">
                  <span className="text-white/50">Token</span>
                  <span className="text-white">{selectedToken.symbol}</span>
                </div>
              )}
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
                <span className="text-white">
                  {amount} {selectedToken?.symbol || network.nativeSymbol}
                </span>
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
                  } {selectedToken?.symbol || network.nativeSymbol}
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

        {/* Navigation */}
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