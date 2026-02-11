import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SwapCard from '@/components/swap/SwapCard';
import AIChatbot from '@/components/chat/AIChatbot';

const recentSwaps = [
  { from: 'ETH', to: 'USDT', amount: '1.5', value: '$3,420', time: '2h ago' },
  { from: 'BTC', to: 'ETH', amount: '0.1', value: '$4,325', time: '1d ago' },
  { from: 'SOL', to: 'USDT', amount: '50', value: '$4,925', time: '3d ago' },
];

export default function Swap() {
  const handleSwapComplete = (swap) => {
    console.log('Swap completed:', swap);
  };

  return (
    <motion.div 
      key="swap"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6"
    >
      <div className="max-w-lg mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-white">Swap</h1>
          </div>
          <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <History className="w-5 h-5 text-white/70" />
          </button>
        </motion.div>

        {/* Swap Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SwapCard onSwapComplete={handleSwapComplete} />
        </motion.div>

        {/* Recent Swaps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5"
        >
          <h3 className="text-white font-semibold mb-4">Recent Swaps</h3>
          <div className="space-y-3">
            {recentSwaps.map((swap, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-white font-medium">
                    {swap.from} → {swap.to}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{swap.value}</p>
                  <p className="text-white/50 text-xs">{swap.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <AIChatbot />
    </motion.div>
  );
}