import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings as SettingsIcon, Eye, EyeOff, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WalletDetails from '@/components/wallet/WalletDetails';
import { createPageUrl } from '@/utils';
import QuickActions from '@/components/wallet/QuickActions';
import TokenCard from '@/components/wallet/TokenCard';
import { PrivateKeyImportDialog } from '@/components/wallet/PrivateKeyImport';
import { Download, BarChart3 } from 'lucide-react';
import WalletSweeper from '@/components/wallet/WalletSweeper';
import CrossChainExecutor from '@/components/crosschain/CrossChainExecutor';

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

  const { data: allWalletBalances, refetch: refetchBalances } = useQuery({
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

  const { data: allTokenBalances, refetch: refetchTokens } = useQuery({
    queryKey: ['allTokenBalances', user?.id],
    queryFn: async () => {
      if (!user?.id) return { tokens: [], total_usd: 0 };

      const wallets = await base44.entities.ImportedWallet.filter({
        user_id: user.id,
        is_active: true
      });

      const tokenChainWallets = wallets.filter(w =>
        ['ethereum', 'polygon', 'bsc', 'solana', 'avalanche', 'arbitrum', 'optimism'].includes(w.blockchain)
      );

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

  const tokens = [];

  if (allWalletBalances?.wallets) {
    allWalletBalances.wallets.forEach(wallet => {
      const symbol = wallet.symbol ||
        (wallet.blockchain === 'ethereum' ? 'ETH' :
         wallet.blockchain === 'bitcoin' ? 'BTC' :
         wallet.blockchain === 'solana' ? 'SOL' :
         wallet.blockchain === 'polygon' ? 'MATIC' :
         wallet.blockchain === 'bsc' ? 'BNB' : 'UNKNOWN');

      const existingIndex = tokens.findIndex(t => t.symbol === symbol);
      const price = (wallet.price && wallet.price > 0) ? wallet.price : (tokenPrices[symbol]?.price || 0);

      if (existingIndex >= 0) {
        tokens[existingIndex].balance += wallet.balance;
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
            <button
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all relative select-none"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
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
              <span className="text-white font-medium text-sm">Import</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await base44.functions.invoke('exportWallets', {});
                  const blob = new Blob([response.data], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `wallet-export-${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                } catch (error) {
                  console.error('Export failed:', error);
                  alert('Export failed. Please try again.');
                }
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all select-none flex items-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <Download className="w-5 h-5 text-white rotate-180" />
              <span className="text-white font-medium text-sm">Export</span>
            </button>
            <Link to={createPageUrl('Settings')}>
              <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all select-none" style={{ minWidth: '44px', minHeight: '44px' }}>
                <SettingsIcon className="w-5 h-5 text-white/70" />
              </button>
            </Link>
          </div>
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
            <button
              onClick={handleRefresh}
              className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
            >
              Refresh
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

      {/* Wallet Details Dialog */}
      <Dialog open={showWalletDetails} onOpenChange={setShowWalletDetails}>
        <DialogContent className="bg-gray-900 border-white/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Wallet Overview</DialogTitle>
          </DialogHeader>
          <WalletDetails />
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}