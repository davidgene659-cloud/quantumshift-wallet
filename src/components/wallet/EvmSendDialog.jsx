import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createAndSignTransaction, broadcastTransaction, getBalance, SUPPORTED_CHAINS } from '@/functions/evmService';

export default function EvmSendDialog({ isOpen, onClose, wallet, onSuccess }) {
  const [chain, setChain] = useState('ethereum');
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [balance, setBalance] = useState(null);

  React.useEffect(() => {
    if (isOpen && wallet) {
      // Get balance for the selected chain
      getBalance(wallet.address, chain)
        .then(balanceWei => {
          const balanceEth = parseInt(balanceWei) / 10 ** 18;
          setBalance(balanceEth);
        })
        .catch(error => {
          toast.error('Failed to fetch balance: ' + error.message);
        });
    }
  }, [isOpen, chain, wallet]);

  const handleSend = async () => {
    if (!recipientAddress || !sendAmount || !privateKeyInput) {
      toast.error('Please fill all fields');
      return;
    }

    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      toast.error('Invalid Ethereum address');
      return;
    }

    setIsSending(true);

    try {
      toast.loading('Creating and signing transaction...');

      const txData = await createAndSignTransaction(
        privateKeyInput,
        recipientAddress,
        parseFloat(sendAmount),
        chain
      );

      setEstimatedFee(txData.gasPrice);
      toast.loading('Broadcasting to ' + SUPPORTED_CHAINS[chain].name + '...');

      const hash = await broadcastTransaction(txData.signedTx, chain);
      
      setTxHash(hash);
      toast.success('Transaction broadcast! Hash: ' + hash.slice(0, 10) + '...');

      setTimeout(() => {
        onClose();
        onSuccess(hash);
        setPrivateKeyInput('');
        setSendAmount('');
        setRecipientAddress('');
        setShowKeyInput(false);
        setTxHash(null);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  };

  const getExplorerUrl = (hash) => {
    const explorers = {
      ethereum: 'https://etherscan.io/tx/',
      bsc: 'https://bscscan.com/tx/',
      polygon: 'https://polygonscan.com/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      avalanche: 'https://snowtrace.io/tx/'
    };
    return explorers[chain] + hash;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white">Send {SUPPORTED_CHAINS[chain]?.symbol || 'Token'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {txHash ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Transaction Broadcast!</p>
              <p className="text-white/50 text-sm mt-2 font-mono break-all">{txHash}</p>
              <a
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm mt-3 flex items-center justify-center gap-2"
              >
                View on Explorer <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-white/70">Chain</Label>
                <Select value={chain} onValueChange={setChain}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    {Object.entries(SUPPORTED_CHAINS).map(([key, data]) => (
                      <SelectItem key={key} value={key} className="text-white">
                        {data.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/70">Available Balance</Label>
                <p className="text-2xl font-bold text-white mt-1">
                  {balance !== null ? balance.toFixed(6) : '...'} {SUPPORTED_CHAINS[chain]?.symbol}
                </p>
              </div>

              <div>
                <Label className="text-white/70">Amount ({SUPPORTED_CHAINS[chain]?.symbol})</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10 text-white"
                    step="0.0001"
                  />
                  <Button
                    onClick={() => balance && setSendAmount((balance * 0.95).toString())}
                    variant="outline"
                    className="border-white/20 text-white"
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-white/70">Recipient Address</Label>
                <Input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="bg-white/5 border-white/10 text-white mt-2 font-mono text-xs"
                />
              </div>

              {showKeyInput && (
                <div>
                  <Label className="text-white/70">Private Key (Hex)</Label>
                  <Input
                    type="password"
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="0x..."
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

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  Gas fees will be calculated automatically based on current network conditions.
                </p>
              </div>

              <Button
                onClick={handleSend}
                disabled={isSending || !sendAmount || !recipientAddress || !privateKeyInput}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                style={{ minHeight: '44px' }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send ${SUPPORTED_CHAINS[chain]?.symbol}`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}