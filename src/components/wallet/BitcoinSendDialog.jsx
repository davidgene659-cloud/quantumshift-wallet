import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createAndSignTransaction, broadcastTransaction, getBalance } from '@/functions/bitcoinService';

export default function BitcoinSendDialog({ isOpen, onClose, selectedToken, onSuccess }) {
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleSend = async () => {
    if (!selectedToken || !sendAmount || !recipientAddress || !privateKeyInput) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSending(true);
    setTxStatus('signing');

    try {
      // Convert BTC to satoshis
      const amountSatoshis = Math.round(parseFloat(sendAmount) * 100000000);

      // Sign transaction
      toast.loading('Signing transaction...');
      const rawTx = await createAndSignTransaction(
        privateKeyInput,
        recipientAddress,
        amountSatoshis,
        selectedToken.address
      );

      // Broadcast
      setTxStatus('broadcasting');
      toast.loading('Broadcasting to Bitcoin mainnet...');
      const result = await broadcastTransaction(rawTx);

      setTxStatus('success');
      toast.success(`Transaction broadcast! TXID: ${result}`);
      
      setTimeout(() => {
        onClose();
        onSuccess(result);
        setPrivateKeyInput('');
        setSendAmount('');
        setRecipientAddress('');
        setShowKeyInput(false);
        setTxStatus(null);
      }, 2000);
    } catch (error) {
      setTxStatus('error');
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Send Bitcoin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!txStatus ? (
            <>
              <div>
                <Label className="text-white/70">Available Balance</Label>
                <p className="text-2xl font-bold text-white mt-1">
                  {selectedToken?.balance.toFixed(6)} BTC
                </p>
                <p className="text-white/50 text-sm">
                  ≈ ${(selectedToken?.balance * 43250).toFixed(2)}
                </p>
              </div>

              <div>
                <Label className="text-white/70">Amount (BTC)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white"
                    step="0.00000001"
                  />
                  <Button
                    onClick={() => setSendAmount(selectedToken?.balance.toString())}
                    variant="outline"
                    className="border-white/20 text-white"
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white/70">Recipient Bitcoin Address</Label>
                <Input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="1A1z7agoat..."
                  className="bg-white/5 border-white/10 text-white mt-2 font-mono text-xs"
                />
              </div>

              {showKeyInput && (
                <div>
                  <Label className="text-white/70">Private Key (WIF)</Label>
                  <Input
                    type="password"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="KwdB..."
                    className="bg-white/5 border-white/10 text-white mt-2 font-mono text-xs"
                  />
                  <p className="text-red-400 text-xs mt-2">⚠️ Never share your private key</p>
                </div>
              )}

              {!showKeyInput && (
                <Button
                  onClick={() => setShowKeyInput(true)}
                  variant="outline"
                  className="w-full border-white/20 text-white"
                >
                  Enter Private Key to Sign
                </Button>
              )}

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm">
                  Fee will be calculated automatically (~25 sat/vB)
                </p>
              </div>

              <Button
                onClick={handleSend}
                disabled={isSending || !sendAmount || !recipientAddress || !privateKeyInput}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500"
                style={{ minHeight: '44px' }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Bitcoin'
                )}
              </Button>
            </>
          ) : txStatus === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Transaction Broadcast Successfully!</p>
              <p className="text-white/50 text-sm mt-2">Check block explorer to confirm</p>
            </div>
          ) : txStatus === 'error' ? (
            <div className="text-center py-6">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Transaction Failed</p>
              <p className="text-white/50 text-sm mt-2">Check the error message above</p>
              <Button
                onClick={() => {
                  setTxStatus(null);
                  setShowKeyInput(false);
                }}
                className="mt-4 w-full"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-white/50 mx-auto animate-spin mb-3" />
              <p className="text-white/70">
                {txStatus === 'signing' ? 'Signing transaction...' : 'Broadcasting to mainnet...'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}