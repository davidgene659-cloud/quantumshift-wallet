import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send as SendIcon, Scan, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TokenSelector, { tokens } from '@/components/swap/TokenSelector';
import AIChatbot from '@/components/chat/AIChatbot';
import NetworkWalletSelector from '@/components/wallet/NetworkWalletSelector';
import { getNetworkTokens, getNetworkDisplay } from '@/components/wallet/NetworkTokens';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { decryptPrivateKey, sendBitcoinTransaction, sendEthereumTransaction, sendSolanaTransaction } from '@/components/blockchain/blockchainService';

export default function Send() {
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      base44.entities.Wallet.filter({ user_id: user.id }).then(fetchedWallets => {
        setWallets(fetchedWallets);
        if (fetchedWallets.length > 0) {
          const primaryWallet = fetchedWallets.find(w => w.is_primary);
          setSelectedWalletId((primaryWallet || fetchedWallets[0]).id);
          // Set default token based on primary network
          const network = (primaryWallet || fetchedWallets[0]).networks?.[0];
          if (network) {
            const networkTokens = getNetworkTokens(network);
            setToken(networkTokens[0] || 'ETH');
          }
        }
      }).catch(err => console.error('Failed to fetch wallets:', err));
    }
  }, [user]);

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const selectedToken = tokens.find(t => t.symbol === token);
  const usdValue = amount && selectedToken ? (parseFloat(amount) * selectedToken.price).toFixed(2) : '0.00';
  
  // Get available tokens for selected wallet's network
  const walletNetwork = selectedWallet?.networks?.[0];
  const availableTokens = walletNetwork ? getNetworkTokens(walletNetwork) : [];
  const networkDisplay = walletNetwork ? getNetworkDisplay(walletNetwork) : { symbol: 'Unknown', color: 'from-gray-500' };

  const handleSend = async () => {
    if (!amount || !address) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!selectedWallet || !selectedWallet.encrypted_private_key) {
      setError('No wallet configured. Please import a wallet first.');
      setShowWarning(true);
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const decryptedKey = decryptPrivateKey(selectedWallet.encrypted_private_key);
      let txHash;

      // Determine network from wallet
      const network = walletNetwork === 'Bitcoin' ? 'bitcoin' : walletNetwork === 'Solana' ? 'solana' : 'ethereum';

      if (network === 'bitcoin') {
        txHash = await sendBitcoinTransaction(decryptedKey, address, parseFloat(amount));
      } else if (network === 'solana') {
        txHash = await sendSolanaTransaction(decryptedKey, address, parseFloat(amount));
      } else {
        txHash = await sendEthereumTransaction(decryptedKey, address, amount);
      }

      // Record transaction
      await base44.entities.Transaction.create({
        user_id: user.id,
        type: 'transfer_out',
        from_token: token,
        from_amount: parseFloat(amount),
        to_token: token,
        to_amount: parseFloat(amount),
        fee: parseFloat(amount) * 0.001,
        status: 'completed',
        usd_value: parseFloat(usdValue),
        tx_hash: txHash,
        network: walletNetwork
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmount('');
        setAddress('');
      }, 3000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to={createPageUrl('Portfolio')}>
            <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Send Crypto</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-10 bg-gray-900/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Transaction Sent!</h3>
              <p className="text-white/60">{amount} {token} sent successfully</p>
            </motion.div>
          )}

          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <NetworkWalletSelector 
                wallets={wallets} 
                selectedWalletId={selectedWalletId} 
                onSelectWallet={(id) => {
                  setSelectedWalletId(id);
                  const newWallet = wallets.find(w => w.id === id);
                  const newNetwork = newWallet?.networks?.[0];
                  if (newNetwork) {
                    const newTokens = getNetworkTokens(newNetwork);
                    setToken(newTokens[0] || 'ETH');
                  }
                }}
              />
            )}

            {/* Network Info */}
            {walletNetwork && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${networkDisplay.color} flex items-center justify-center text-sm font-bold text-white`}>
                  {networkDisplay.symbol[0]}
                </div>
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider">Network</p>
                  <p className="text-white font-semibold">{walletNetwork}</p>
                </div>
              </div>
            )}

            {/* Token Selection */}
            <div>
              <Label className="text-white/70 mb-2 block">Select Token</Label>
              <div className="flex items-center gap-3">
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:bg-white/15 transition-all"
                >
                  {availableTokens.map(tokenSymbol => (
                    <option key={tokenSymbol} value={tokenSymbol}>
                      {tokenSymbol}
                    </option>
                  ))}
                </select>
                <span className="text-white/50 text-sm">Balance: 0.00</span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-white/70 mb-2 block">Amount</Label>
              <div className="bg-white/5 rounded-2xl p-4">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-transparent border-none text-3xl font-bold text-white placeholder:text-white/30 focus-visible:ring-0 p-0"
                />
                <p className="text-white/40 text-sm mt-2">≈ ${usdValue} USD</p>
              </div>
            </div>

            {/* Recipient Address */}
            <div>
              <Label className="text-white/70 mb-2 block">Recipient Address</Label>
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter wallet address"
                  className="bg-white/5 border-white/10 text-white pr-12 h-14"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-all">
                  <Scan className="w-5 h-5 text-white/50" />
                </button>
              </div>
            </div>

            {/* Network Fee */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Network Fee</span>
                  <span className="text-white">~$2.50</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Platform Fee (5%)</span>
                  <span className="text-white">${(parseFloat(usdValue) * 0.05).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={!amount || parseFloat(amount) <= 0 || !address || isSending}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-lg rounded-2xl"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <SendIcon className="w-5 h-5 mr-2" />}
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </motion.div>
      </div>

      <AIChatbot />

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Wallet Not Configured
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70">{error}</p>
          <Link to={createPageUrl('Portfolio')}>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
              Go to Portfolio
            </Button>
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}