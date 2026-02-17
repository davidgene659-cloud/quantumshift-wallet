import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings as SettingsIcon, Eye, EyeOff, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WalletDetails from '@/components/wallet/WalletDetails';
import { createPageUrl } from '@/utils';
import PortfolioChart from '@/components/wallet/PortfolioChart';
import QuickActions from '@/components/wallet/QuickActions';
import TokenCard from '@/components/wallet/TokenCard';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { PrivateKeyImportDialog } from '@/components/wallet/PrivateKeyImport';
import AIChatbot from '@/components/chat/AIChatbot';
import SecurityMonitor from '@/components/ai/SecurityMonitor';
import PortfolioShield from '@/components/portfolio/PortfolioShield';
import RewardsSystem from '@/components/gamification/RewardsSystem';
import SponsorBanner from '@/components/sponsors/SponsorBanner';
import { Download, Gift, BarChart3 } from 'lucide-react';
import DashboardCustomizer from '@/components/analytics/DashboardCustomizer';

const tokenPrices = {
  BTC: { price: 43250, change24h: 2.34 },
  ETH: { price: 2280, change24h: -1.23 },
  USDT: { price: 1, change24h: 0.01 },
  SOL: { price: 98.5, change24h: 5.67 },
  BNB: { price: 312, change24h: 1.45 },
  DOGE: { price: 0.082, change24h: -2.89 },
  USDC: { price: 1, change24h: 0.00 },
  ADA: { price: 0.45, change24h: 3.12 },
  MATIC: { price: 0.88, change24h: -0.45 },
  AVAX: { price: 35.2, change24h: 1.89 },
};

export default function Portfolio() {
  const [showBalance, setShowBalance] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const wallets = await base44.entities.Wallet.filter({ user_id: user.id });
      return wallets[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: allWalletBalances, refetch: refetchBalances } = useQuery({
    queryKey: ['allWalletBalances', user?.id],
    queryFn: async () => {
      const response = await base44.functions.invoke('checkAllBalances', {});
      return response.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Combine simulated tokens with real wallet balances
  const tokens = [];
  
  // Add simulated balances
  if (walletData?.balances) {
    Object.entries(walletData.balances).forEach(([symbol, balance]) => {
      if (Number(balance) > 0) {
        tokens.push({
          symbol,
          balance: Number(balance) || 0,
          price: tokenPrices[symbol]?.price || 0,
          change24h: tokenPrices[symbol]?.change24h || 0,
          source: 'simulated'
        });
      }
    });
  }

  // Add real imported wallet balances
  if (allWalletBalances?.wallets) {
    allWalletBalances.wallets.forEach(wallet => {
      const symbol = wallet.blockchain === 'ethereum' ? 'ETH' : 
                     wallet.blockchain === 'bitcoin' ? 'BTC' : 'UNKNOWN';
      
      const existingIndex = tokens.findIndex(t => t.symbol === symbol && t.source === 'real');
      
      if (existingIndex >= 0) {
        tokens[existingIndex].balance += wallet.balance;
      } else {
        tokens.push({
          symbol,
          balance: wallet.balance,
          price: wallet.price,
          change24h: tokenPrices[symbol]?.change24h || 0,
          source: 'real',
          wallets: [wallet]
        });
      }
    });
  }

  const simulatedTotal = walletData?.total_usd_value || 0;
  const realTotal = allWalletBalances?.total_balance_usd || 0;
  const totalValue = simulatedTotal + realTotal;

  const handleRefresh = async () => {
    await refetchBalances();
    return new Promise(resolve => {
      setTimeout(resolve, 500);
    });
  };

  return (
    <motion.div 
      key="portfolio"
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
                <p className="text-white/50 text-sm select-none">Welcome back,</p>
                <h1 className="text-2xl font-bold text-white select-none">{user?.full_name || 'Crypto Trader'}</h1>
              </div>
              <div className="flex items-center gap-3 select-none">
                <button 
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all select-none"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  {showBalance ? <Eye className="w-5 h-5 text-white/70" /> : <EyeOff className="w-5 h-5 text-white/70" />}
                </button>
                <button 
                  onClick={() => setShowWalletDetails(true)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all select-none"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                >
                  <Info className="w-5 h-5 text-white/70" />
                </button>
                <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative select-none" style={{ minWidth: '44px', minHeight: '44px' }}>
                  <Bell className="w-5 h-5 text-white/70" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                <button 
                  onClick={() => setShowCustomizer(true)}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all select-none" 
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Customize Dashboard"
                >
                  <BarChart3 className="w-5 h-5 text-white/70" />
                </button>
                <button 
                  onClick={() => setShowImport(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all select-none flex items-center gap-2" 
                  style={{ minHeight: '44px' }}
                >
                  <Download className="w-5 h-5 text-white" />
                  <span className="text-white font-medium text-sm">Import Wallet</span>
                </button>
                <Link to={createPageUrl('Settings')}>
                  <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all select-none" style={{ minWidth: '44px', minHeight: '44px' }}>
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

        {/* Security Monitor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SecurityMonitor />
        </motion.div>

        {/* Portfolio Shield */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <PortfolioShield />
        </motion.div>

        {/* Sponsor Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
        >
          <SponsorBanner />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Quick Actions</h2>
            <Link to={createPageUrl('AdvancedAnalytics')}>
              <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Advanced Analytics
              </button>
            </Link>
          </div>
          <QuickActions />
        </motion.div>

        {/* Rewards System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <RewardsSystem />
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
          {tokens.length > 0 ? (
            <div className="grid gap-3">
              {tokens.map((token, index) => (
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
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white/50">No assets found. Start by importing a wallet or making a deposit.</p>
            </div>
          )}
        </motion.div>
      </div>

      <PrivateKeyImportDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={(wallets) => {
          console.log('Imported wallets:', wallets);
        }}
      />

      <AIChatbot />

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
        <DialogContent className="bg-gray-900 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Wallet Overview</DialogTitle>
          </DialogHeader>
          <WalletDetails />
        </DialogContent>
      </Dialog>

      {/* Dashboard Customizer */}
      <DashboardCustomizer 
        isOpen={showCustomizer} 
        onClose={() => setShowCustomizer(false)}
        userId={user?.id}
      />
      </PullToRefresh>
      </motion.div>
      );
      }