import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send as SendIcon, Scan, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenSelector, { tokens } from '@/components/swap/TokenSelector';
import AIChatbot from '@/components/chat/AIChatbot';

export default function Send() {
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedToken = tokens.find(t => t.symbol === token);
  const usdValue = amount && selectedToken ? (parseFloat(amount) * selectedToken.price).toFixed(2) : '0.00';

  const handleSend = async () => {
    if (!amount || !address) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSending(false);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setAmount('');
      setAddress('');
    }, 3000);
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
            {/* Token Selection */}
            <div>
              <Label className="text-white/70 mb-2 block">Select Token</Label>
              <div className="flex items-center gap-3">
                <TokenSelector selected={token} onSelect={setToken} />
                <span className="text-white/50">Balance: 0.00 {token}</span>
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
    </div>
  );
}