import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createBitcoinTransaction, broadcastTransaction, getNetworkFee, decryptPrivateKey } from '@/functions/bitcoinService';

export default function BitcoinSendDialog({ isOpen, onClose, wallet }) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState('10');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [fees, setFees] = useState(null);

  const btcBalance = wallet?.balances?.BTC || 0;
  const satoshis = btcBalance * 100000000;

  React.useEffect(() => {
    if (isOpen) {
      getNetworkFee().then(setFees).catch(console.error);
    }
  }, [isOpen]);

  const estimatedFee = amount ? (parseFloat(amount) * 100000000 * parseInt(feeRate) * 226 / 1e8).toFixed(8) : '0';

  const handleSend = async () => {
    if (!toAddress.trim() || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    if (parseFloat(amount) > btcBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsProcessing(true);
    try {
      // Decrypt private key
      const privateKeyWIF = decryptPrivateKey(wallet.private_key_encrypted);
      
      // Create transaction
      const txData = await createBitcoinTransaction({
        fromAddress: wallet.address,
        toAddress,
        amount: Math.floor(parseFloat(amount) * 100000000), // Convert to satoshis
        privateKeyWIF,
        feeRate: parseInt(feeRate)
      });

      toast.loading('Broadcasting to network...');

      // Broadcast to mainnet
      const txid = await broadcastTransaction(txData.txHex);
      
      setTxHash(txid);
      toast.success('Transaction broadcast successfully!');
      
      setTimeout(() => {
        onClose();
        setToAddress('');
        setAmount('');
        setTxHash(null);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Send Bitcoin (Mainnet)</DialogTitle>
        </DialogHeader>

        {txHash ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-400 font-semibold text-sm">Broadcast Successful</p>
                <p className="text-white/70 text-xs mt-1">Your transaction is now on the Bitcoin mainnet.</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-white/50 text-xs mb-1">Transaction ID</p>
              <div className="flex items-center gap-2">
                <code className="text-white font-mono text-xs flex-1 truncate">{txHash}</code>
                <a
                  href={`https://mempool.space/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <Button onClick={onClose} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs">
                This sends real Bitcoin on mainnet. Double-check all details before confirming.
              </p>
            </div>

            <div>
              <Label className="text-white/70 text-sm">Balance</Label>
              <p className="text-white font-bold mt-1">
                {btcBalance.toFixed(8)} BTC
              </p>
            </div>

            <div>
              <Label className="text-white/70 text-sm">Recipient Address</Label>
              <Input
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="bc1q..."
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white/70 text-sm">Amount (BTC)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  step="0.00000001"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  onClick={() => setAmount(btcBalance.toString())}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  MAX
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-white/70 text-sm">Fee Rate (sat/byte)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  min="1"
                  className="bg-white/5 border-white/10 text-white"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => setFeeRate('5')}
                    className="px-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs"
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => setFeeRate('10')}
                    className="px-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs"
                  >
                    Std
                  </button>
                  <button
                    onClick={() => setFeeRate('20')}
                    className="px-2 rounded bg-white/5 hover:bg-white/10 text-white text-xs"
                  >
                    Fast
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex justify-between text-white/70 text-sm mb-2">
                <span>Estimated Fee:</span>
                <span>{estimatedFee} BTC</span>
              </div>
              <div className="flex justify-between text-white text-sm font-semibold">
                <span>Total:</span>
                <span>{(parseFloat(amount || 0) + parseFloat(estimatedFee)).toFixed(8)} BTC</span>
              </div>
            </div>

            <Button
              onClick={handleSend}
              disabled={isProcessing || !toAddress || !amount}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ minHeight: '44px' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                'Broadcast to Mainnet'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}