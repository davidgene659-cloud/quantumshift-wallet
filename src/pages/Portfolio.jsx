import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PortfolioChart from '@/components/wallet/PortfolioChart';
import QuickActions from '@/components/wallet/QuickActions';
import TokenCard from '@/components/wallet/TokenCard';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import PrivateKeyImport from '@/components/wallet/PrivateKeyImport';
import AIChatbot from '@/components/chat/AIChatbot';
import { Download } from 'lucide-react';

const mockTokens = [
  { symbol: 'BTC', balance: 0.5432, price: 43250, change24h: 2.34 },
  { symbol: 'ETH', balance: 3.245, price: 2280, change24h: -1.23 },
  { symbol: 'USDT', balance: 5000, price: 1, change24h: 0.01 },
  { symbol: 'SOL', balance: 45.67, price: 98.5, change24h: 5.67 },
  { symbol: 'BNB', balance: 12.3, price: 312, change24h: 1.45 },
  { symbol: 'DOGE', balance: 15000, price: 0.082, change24h: -2.89 },
];

export default function Portfolio() {
  const [showBalance, setShowBalance] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const totalValue = mockTokens.reduce((acc, t) => acc + (t.balance * t.price), 0);

  const handleRefresh = async () => {
    return new Promise(resolve => {
      setTimeout(resolve, 1000);
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6"
    >
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-white/50 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{user?.full_name || 'Crypto Trader'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              {showBalance ? <Eye className="w-5 h-5 text-white/70" /> : <EyeOff className="w-5 h-5 text-white/70" />}
            </button>
            <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative" style={{ minWidth: '44px', minHeight: '44px' }}>
              <Bell className="w-5 h-5 text-white/70" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button 
              onClick={() => setShowImport(true)}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all" 
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <Download className="w-5 h-5 text-white/70" />
            </button>
            <Link to={createPageUrl('Settings')}>
              <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all" style={{ minWidth: '44px', minHeight: '44px' }}>
                <SettingsIcon className="w-5 h-5 text-white/70" />
              </button>
            </Link>
            </div>
        </motion.div>

        {/* Portfolio Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PortfolioChart totalValue={showBalance ? totalValue : 0} />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <QuickActions />
        </motion.div>

        {/* Token Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Your Assets</h2>
            <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">
              View All
            </button>
          </div>
          <div className="grid gap-3">
            {mockTokens.map((token, index) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <TokenCard
                  symbol={token.symbol}
                  balance={showBalance ? token.balance : 0}
                  usdValue={showBalance ? token.balance * token.price : 0}
                  change24h={token.change24h}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <PrivateKeyImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={(wallets) => {
          console.log('Imported wallets:', wallets);
        }}
      />

      <AIChatbot />
      </PullToRefresh>
      </motion.div>
      );
      }