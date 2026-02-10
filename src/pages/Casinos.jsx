import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, Sparkles, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIChatbot from '@/components/chat/AIChatbot';
import { toast } from '@/components/ui/use-toast';

const casinos = [
  { name: 'Stake.com', icon: '💎', description: 'Leading crypto casino with sports betting', bonus: '200% up to $2000', games: '3000+', color: 'from-emerald-500 to-teal-500', url: 'https://stake.com', verified: true },
  { name: 'BC.Game', icon: '🎲', description: 'Provably fair casino with original games', bonus: '300% up to $20,000', games: '8000+', color: 'from-blue-500 to-cyan-500', url: 'https://bc.game', verified: true },
  { name: 'Rollbit', icon: '🎰', description: 'Casino with NFT lottery and sports', bonus: '150% up to $5000', games: '4000+', color: 'from-purple-500 to-pink-500', url: 'https://rollbit.com', verified: true },
  { name: 'Duelbits', icon: '⚔️', description: 'Battle-style casino with PvP games', bonus: '100% up to $500 + 100 FS', games: '2500+', color: 'from-orange-500 to-red-500', url: 'https://duelbits.com', verified: true },
  { name: 'Roobet', icon: '🦘', description: 'Fun casino with exclusive games', bonus: '$10 Free Play', games: '3500+', color: 'from-yellow-500 to-orange-500', url: 'https://roobet.com', verified: true },
  { name: 'Shuffle.com', icon: '🃏', description: 'New-gen casino with instant deposits', bonus: 'Up to $3000 + 100 FS', games: '5000+', color: 'from-indigo-500 to-purple-500', url: 'https://shuffle.com', verified: true },
  { name: 'Bitsler', icon: '🎯', description: 'Veteran crypto casino since 2015', bonus: '100% up to 1 BTC', games: '4500+', color: 'from-green-500 to-emerald-500', url: 'https://bitsler.com', verified: true },
  { name: 'Cloudbet', icon: '☁️', description: 'Casino with best odds on sports', bonus: '100% up to 5 BTC', games: '2000+', color: 'from-sky-500 to-blue-500', url: 'https://cloudbet.com', verified: true },
  { name: 'FortuneJack', icon: '🍀', description: 'Premium casino with VIP rewards', bonus: '110% up to 1.5 BTC', games: '3000+', color: 'from-amber-500 to-yellow-500', url: 'https://fortunejack.com', verified: true },
  { name: 'Winz.io', icon: '🏆', description: 'Fast casino with instant withdrawals', bonus: '300% up to €/$3000', games: '6000+', color: 'from-rose-500 to-pink-500', url: 'https://winz.io', verified: true },
];

export default function Casinos() {
  const [connectingTo, setConnectingTo] = useState(null);

  const handleConnect = (casino) => {
    setConnectingTo(casino.name);
    
    // Simulate wallet connection
    setTimeout(() => {
      setConnectingTo(null);
      toast({
        title: "Connected!",
        description: `Your wallet is connected to ${casino.name}. Opening in new tab...`,
      });
      window.open(casino.url, '_blank');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Portfolio')}>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Crypto Casinos</h1>
              <p className="text-white/50 text-sm">Top platforms with WalletConnect</p>
            </div>
          </div>
        </motion.div>

        {/* Features Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h3 className="text-white font-bold">One-Click Anonymous Access</h3>
          </div>
          <p className="text-white/70 text-sm mb-4">
            Connect your wallet instantly to any casino below. No KYC, no sign-up, completely anonymous. 
            Your wallet address is your identity.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-white text-sm">No KYC Required</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-white text-sm">Instant Deposits</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-white text-sm">Auto WalletConnect</span>
            </div>
          </div>
        </motion.div>

        {/* Casinos Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {casinos.map((casino, index) => (
            <motion.div
              key={casino.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${casino.color} flex items-center justify-center text-3xl shadow-lg`}>
                    {casino.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{casino.name}</h3>
                      {casino.verified && (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-white/50 text-sm">{casino.games} games</p>
                  </div>
                </div>
              </div>

              <p className="text-white/70 text-sm mb-3">{casino.description}</p>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                <p className="text-amber-400 text-sm font-medium">{casino.bonus}</p>
              </div>

              <button
                onClick={() => handleConnect(casino)}
                disabled={connectingTo === casino.name}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                  connectingTo === casino.name
                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                    : `bg-gradient-to-r ${casino.color} hover:shadow-lg text-white`
                }`}
              >
                {connectingTo === casino.name ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Connect & Play
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6"
        >
          <h4 className="text-red-400 font-semibold mb-2">Responsible Gaming</h4>
          <p className="text-white/70 text-sm">
            Gambling carries risk and should be for entertainment only. Only gamble what you can afford to lose. 
            These platforms are 18+ and may not be legal in all jurisdictions. Check your local laws before playing.
          </p>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
}