import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, Zap, Clock, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TransactionBuilder({ isOpen, onClose, wallet }) {
  const [step, setStep] = useState(1); // 1: details, 2: gas, 3: review, 4: confirm
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [gasOption, setGasOption] = useState('standard');
  const [txPreview, setTxPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState(null);

  const gasOptions = [
    { 
      value: 'slow', 
      label: 'Slow', 
      icon: Clock,
      time: '5-10 min',
      price: '20 Gwei',
      cost: '0.00042 ETH',
      color: 'text-blue-400'
    },
    { 
      value: 'standard', 
      label: 'Standard', 
      icon: Zap,
      time: '2-5 min',
      price: '30 Gwei',
      cost: '0.00063 ETH',
      color: 'text-purple-400'
    },
    { 
      value: 'fast', 
      label: 'Fast', 
      icon: Zap,
      time: '< 2 min',
      price: '50 Gwei',
      cost: '0.00105 ETH',
      color: 'text-orange-400'
    }
  ];

  const handlePreviewTransaction = async () => {
    if (!toAddress || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedGas = gasOptions.find(g => g.value === gasOption);
      
      setTxPreview({
        from: wallet.address,
        to: toAddress,
        amount: parseFloat(amount),
        blockchain: wallet.blockchain,
        gas: selectedGas,
        total: parseFloat(amount) + parseFloat(selectedGas.cost.split(' ')[0])
      });
      
      setStep(3);
    } catch (error) {
      toast.error('Failed to preview transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignAndBroadcast = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('signTransaction', {
        wallet_id: wallet.id,
        to_address: toAddress,
        amount: amount,
        blockchain: wallet.blockchain,
        gas_option: gasOption
      });

      if (response.data.success) {
        setTxResult(response.data);
        setStep(4);
        toast.success('Transaction sent successfully!');
      } else {
        toast.error('Transaction failed: ' + response.data.error);
      }
    } catch (error) {
      toast.error('Failed to sign transaction: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            Secure Transaction Builder
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Transaction Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">From Wallet</Label>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mt-2">
                <p className="text-white font-medium">{wallet?.label || 'Wallet'}</p>
                <p className="text-white/50 text-sm font-mono">{wallet?.address}</p>
                <p className="text-purple-400 text-sm mt-1">Balance: {wallet?.balance} {wallet?.blockchain?.toUpperCase()}</p>
              </div>
            </div>

            <div>
              <Label className="text-white/70">Recipient Address</Label>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white/70">Amount</Label>
              <Input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!toAddress || !amount}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Continue to Gas Options
            </Button>
          </div>
        )}

        {/* Step 2: Gas Options */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-white font-medium">Choose Transaction Speed</h3>
            
            <div className="space-y-3">
              {gasOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setGasOption(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      gasOption === option.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${option.color}`} />
                        <div className="text-left">
                          <p className="text-white font-medium">{option.label}</p>
                          <p className="text-white/50 text-sm">{option.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{option.price}</p>
                        <p className="text-white/50 text-sm">{option.cost}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-blue-400 text-sm">
                💡 Gas prices are dynamic. Choose 'Fast' for urgent transactions or 'Slow' during off-peak hours to save costs.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handlePreviewTransaction}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Review Transaction
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && txPreview && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-medium mb-3">Transaction Summary</h3>
              
              <div className="flex justify-between">
                <span className="text-white/70">From</span>
                <span className="text-white font-mono text-sm">{txPreview.from.slice(0, 10)}...{txPreview.from.slice(-8)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">To</span>
                <span className="text-white font-mono text-sm">{txPreview.to.slice(0, 10)}...{txPreview.to.slice(-8)}</span>
              </div>
              
              <div className="h-px bg-white/10 my-2" />
              
              <div className="flex justify-between">
                <span className="text-white/70">Amount</span>
                <span className="text-white font-medium">{txPreview.amount} {txPreview.blockchain.toUpperCase()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Gas Fee ({txPreview.gas.label})</span>
                <span className="text-white/70">{txPreview.gas.cost}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Est. Time</span>
                <span className="text-white/70">{txPreview.gas.time}</span>
              </div>
              
              <div className="h-px bg-white/10 my-2" />
              
              <div className="flex justify-between text-lg">
                <span className="text-white font-medium">Total</span>
                <span className="text-purple-400 font-bold">{txPreview.total.toFixed(6)} {txPreview.blockchain.toUpperCase()}</span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">
                Double-check all details. Transactions cannot be reversed once confirmed on the blockchain.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSignAndBroadcast}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign & Send
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && txResult && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <h3 className="text-white text-xl font-bold">Transaction Sent!</h3>
            <p className="text-white/70">Your transaction has been broadcast to the network</p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-white/70">Transaction Hash</span>
              </div>
              <p className="text-purple-400 font-mono text-sm break-all">{txResult.transaction_hash}</p>
              
              <div className="flex justify-between mt-3">
                <span className="text-white/70">Status</span>
                <span className="text-yellow-400">{txResult.status}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/70">Est. Confirmation</span>
                <span className="text-white">{txResult.estimated_time}</span>
              </div>
            </div>

            <Button
              onClick={() => {
                onClose();
                setStep(1);
                setToAddress('');
                setAmount('');
                setTxResult(null);
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}