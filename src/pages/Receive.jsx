import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Share2, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import TokenSelector, { tokens } from '@/components/swap/TokenSelector';
import AIChatbot from '@/components/chat/AIChatbot';

export default function Receive() {
  const [token, setToken] = useState('ETH');
  const [copied, setCopied] = useState(false);
  
  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
  const selectedToken = tokens.find(t => t.symbol === token);

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-2xl font-bold text-white">Receive Crypto</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6"
        >
          {/* Token Selection */}
          <div className="text-center">
            <p className="text-white/50 mb-4">Select token to receive</p>
            <div className="inline-flex">
              <TokenSelector selected={token} onSelect={setToken} />
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
                <QrCode className="w-24 h-24 text-white/30" />
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-white/50 text-sm mb-1">Network</p>
            <p className="text-white font-semibold">
              {token === 'BTC' ? 'Bitcoin' : token === 'SOL' ? 'Solana' : 'Ethereum (ERC-20)'}
            </p>
          </div>

          {/* Address */}
          <div>
            <p className="text-white/50 text-sm mb-2 text-center">Your {token} Address</p>
            <div className="bg-white/5 rounded-xl p-4 break-all text-center">
              <p className="text-white font-mono text-sm">{walletAddress}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Address'}
            </Button>
            <Button
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-amber-400 text-sm">
              Only send {token} to this address. Sending other tokens may result in permanent loss.
            </p>
          </div>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
}