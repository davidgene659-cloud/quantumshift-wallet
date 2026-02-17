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
import CrossChainBridge from '@/components/portfolio/CrossChainBridge';
import AssetDistribution from '@/components/portfolio/AssetDistribution';
import DebugPanel from '@/components/wallet/DebugPanel';
import WalletSweeper from '@/components/wallet/WalletSweeper';
import MarketAlerts from '@/components/analytics/MarketAlerts';
import BridgeComparison from '@/components/crosschain/BridgeComparison';
import CrossChainExecutor from '@/components/crosschain/CrossChainExecutor';
import BalanceGuardianWidget from '@/components/ai/BalanceGuardianWidget';

const tokenPrices = {
  BTC: { price: 43250, change24h: 2.34 },
  ETH: { price: 2280, change24h: -1.23 },
  USDT: { price: 1, change24h: 0.01 },
  USDC: { price: 1, change24h: 0.00 },
  WETH: { price: 2280, change24h: -1.23 },
  SOL: { price: 98.5, change24h: 5.67 },
  BNB: { price: 312, change24h: 1.45 },
  DOGE: { price: 0.082, change24h: -2.89 },
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

  // Remove simulated wallet data entirely

  const { data: allWalletBalances, refetch: refetchBalances, error: balanceError } = useQuery({
    queryKey: ['allWalletBalances', user?.id],
    queryFn: async () => {
      if (!user?.id) return { wallets: [], total_balance_usd: 0 };
      const response = await base44.functions.invoke('checkAllBalances', {});
      console.log('checkAllBalances response:', response.data);
      return response.data;
    },
    enabled: !!user?.id,
    staleTime: 5000,
    refetchInterval: false,
    retry: 1
  });

  const { data: allTokenBalances, refetch: refetchTokens, error: tokenError } = useQuery({
    queryKey: ['allTokenBalances', user?.id],
    queryFn: async () => {
      if (!user?.id) return { tokens: [], total_usd: 0 };
      
      const wallets = await base44.entities.ImportedWallet.filter({ 
        user_id: user.id,
        is_active: true 
      });

      const tokenChainWallets = wallets.filter(w => 
        ['ethereum', 'polygon', 'bsc', 'solana'].includes(w.blockchain)
      ).slice(0, 3);

      const allTokens = [];
      for (const wallet of tokenChainWallets) {
        try {
          const response = await base44.functions.invoke('getTokenBalances', {
            address: wallet.address,
            blockchain: wallet.blockchain
          });
          if (response.data.tokens) {
            allTokens.push(...response.data.tokens);
          }
        } catch (error) {
          console.error('Token fetch failed:', wallet.address);
        }
      }

      const totalUsd = allTokens.reduce((sum, t) => sum + (t.usd_value || 0), 0);
      return { tokens: allTokens, total_usd: totalUsd };
    },
    enabled: !!user?.id,
    staleTime: 5000,
    refetchInterval: false,
    retry: 1
  });

  // Only real wallet balances
  const tokens = [];

  // Add native coin balances from imported wallets
  if (allWalletBalances?.wallets) {
    allWalletBalances.wallets.forEach(wallet => {
      const symbol = wallet.symbol || 
                     (wallet.blockchain === 'ethereum' ? 'ETH' : 
                      wallet.blockchain === 'bitcoin' ? 'BTC' :
                      wallet.blockchain === 'solana' ? 'SOL' :
                      wallet.blockchain === 'polygon' ? 'MATIC' :
                      wallet.blockchain === 'bsc' ? 'BNB' : 'UNKNOWN');
      
      const existingIndex = tokens.findIndex(t => t.symbol === symbol);
      // CRITICAL: Use fallback prices if wallet.price is 0 or missing
      const price = (wallet.price && wallet.price > 0) ? wallet.price : (tokenPrices[symbol]?.price || 0);
      
      if (existingIndex >= 0) {
        tokens[existingIndex].balance += wallet.balance;
        // Update price if we have a better one
        if (price > 0 && (!tokens[existingIndex].price || tokens[existingIndex].price === 0)) {
          tokens[existingIndex].price = price;
        }
        tokens[existingIndex].wallets.push(wallet);
      } else {
        tokens.push({
          symbol,
          balance: wallet.balance,
          price: price,
          change24h: tokenPrices[symbol]?.change24h || 0,
          wallets: [wallet]
        });
      }
    });
  }

  // Add ERC-20/BEP-20/SPL token balances
  if (allTokenBalances?.tokens) {
    allTokenBalances.tokens.forEach(token => {
      const existingIndex = tokens.findIndex(t => 
        t.symbol === token.symbol && t.contract === token.contract
      );
      
      const tokenPrice = (token.price && token.price > 0) ? token.price : (tokenPrices[token.symbol]?.price || 0);
      
      if (existingIndex >= 0) {
        tokens[existingIndex].balance += token.balance;
        if (tokenPrice > 0 && (!tokens[existingIndex].price || tokens[existingIndex].price === 0)) {
          tokens[existingIndex].price = tokenPrice;
        }
      } else if (token.balance > 0) {
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          contract: token.contract,
          balance: token.balance,
          price: tokenPrice,
          change24h: 0,
          blockchain: token.blockchain
        });
      }
    });
  }

  const realTotal = allWalletBalances?.total_balance_usd || 0;
  const tokensTotal = allTokenBalances?.total_usd || 0;
  const totalValue = realTotal + tokensTotal;

  const handleRefresh = async () => {
    await Promise.all([refetchBalances(), refetchTokens()]);
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

        {/* Balance Guardian AI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <BalanceGuardianWidget
            totalValue={totalValue}
            tokens={tokens}
            allWalletBalances={allWalletBalances}
            allTokenBalances={allTokenBalances}
          />
        </motion.div>

        {/* Debug Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <DebugPanel
            allWalletBalances={allWalletBalances}
            allTokenBalances={allTokenBalances}
            balanceError={balanceError}
            tokenError={tokenError}
            totalValue={totalValue}
            realTotal={realTotal}
            tokensTotal={tokensTotal}
            tokens={tokens}
          />
        </motion.div>

        {/* Market Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <MarketAlerts />
        </motion.div>

        {/* Security Monitor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
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

        {/* Wallet Sweeper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <WalletSweeper />
        </motion.div>

        {/* Cross-Chain Executor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
        >
          <CrossChainExecutor />
        </motion.div>

        {/* Bridge Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.275 }}
        >
          <BridgeComparison />
        </motion.div>

        {/* Cross-Chain Bridge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <CrossChainBridge tokens={tokens} />
        </motion.div>

        {/* Asset Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <AssetDistribution tokens={tokens} totalValue={totalValue} />
        </motion.div>

        {/* Token Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Your Assets</h2>
              <div className="mt-2 space-y-1">
                <p className="text-white/50 text-sm">
                  Total Spendable: {showBalance ? `$${totalValue.toFixed(2)}` : '••••••'}
                </p>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>Native: ${showBalance ? realTotal.toFixed(2) : '••••'}</span>
                  <span>•</span>
                  <span>Tokens: ${showBalance ? tokensTotal.toFixed(2) : '••••'}</span>
                  <span>•</span>
                  <span className="text-green-400">{tokens.length} assets</span>
                </div>
              </div>
            </div>
            <button className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors">
              View All
            </button>
          </div>
          {tokens.length > 0 ? (
            <div className="grid gap-3">
              {tokens.map((token, index) => {
                const tokenUsdValue = token.balance * (token.price || 0);
                return (
                  <motion.div
                    key={`${token.symbol}-${token.contract || index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <TokenCard
                      symbol={token.symbol}
                      name={token.name}
                      balance={showBalance ? token.balance : 0}
                      usdValue={showBalance ? tokenUsdValue : 0}
                      change24h={token.change24h || 0}
                    />
                  </motion.div>
                );
              })}
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