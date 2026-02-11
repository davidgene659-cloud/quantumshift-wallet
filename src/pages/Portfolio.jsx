import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Settings as SettingsIcon, Eye, EyeOff, Info, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import WalletDetails from '@/components/wallet/WalletDetails';
import { createPageUrl } from '@/utils';
import QuickActions from '@/components/wallet/QuickActions';
import TokenCard from '@/components/wallet/TokenCard';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import PrivateKeyImport from '@/components/wallet/PrivateKeyImport';
import WalletManager from '@/components/wallet/WalletManager';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import AdvancedChart from '@/components/analytics/AdvancedChart';
import PLTracker from '@/components/analytics/PLTracker';
import TaxReport from '@/components/analytics/TaxReport';
import LastTransactionDetails from '@/components/wallet/LastTransactionDetails';
import AIChatbot from '@/components/chat/AIChatbot';
import SecurityMonitor from '@/components/ai/SecurityMonitor';
import PortfolioShield from '@/components/portfolio/PortfolioShield';
import RewardsSystem from '@/components/gamification/RewardsSystem';
import SponsorBanner from '@/components/sponsors/SponsorBanner';
import { notificationManager } from '@/components/notifications/NotificationManager';
import { Download, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { decryptPrivateKey, sendBitcoinTransaction, sendEthereumTransaction, sendSolanaTransaction } from '@/components/blockchain/blockchainService';
import { priceOracle } from '@/components/blockchain/priceOracle';

export default function Portfolio() {
  const [showBalance, setShowBalance] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [user, setUser] = useState(null);
  const [tokenPrices, setTokenPrices] = useState({
    BTC: 0,
    ETH: 0,
    USDT: 0,
    SOL: 0,
    BNB: 0,
    DOGE: 0,
    USDC: 0,
    ADA: 0,
    DOT: 0,
    MATIC: 0,
    AVAX: 0,
    LINK: 0
  });

  const queryClient = useQueryClient();

  // Fetch real-time prices and check notifications
  useEffect(() => {
    const fetchPrices = async () => {
      const prices = await priceOracle.getPrices();
      const formattedPrices = {};
      Object.entries(prices).forEach(([symbol, data]) => {
        formattedPrices[symbol] = data.current;
      });
      setTokenPrices(formattedPrices);

      // Check for price movements and trigger notifications
      if (user && Object.keys(tokenPrices).length > 0) {
        try {
          const preferences = await base44.entities.NotificationPreference.filter({ user_id: user.id });
          await notificationManager.checkPriceMovement(formattedPrices, tokenPrices, user, preferences);
        } catch (e) {
          // Silently fail if preferences don't exist
        }
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch notification preferences
  const { data: notificationPreferences = [] } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await base44.entities.NotificationPreference.filter({ user_id: user.id });
      } catch {
        return [];
      }
    },
    enabled: !!user
  });

  // Fetch wallet data
  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['wallets', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const result = await base44.entities.Wallet.filter({ user_id: user.id }, '-created_date');
      // Set primary wallet as selected by default
      const primaryWallet = result.find(w => w.is_primary);
      if (primaryWallet && !selectedWalletId) {
        setSelectedWalletId(primaryWallet.id);
      } else if (result.length > 0 && !selectedWalletId) {
        setSelectedWalletId(result[0].id);
      }
      return result;
    },
    enabled: !!user,
  });

  const currentWallet = wallets.find(w => w.id === selectedWalletId) || wallets[0];
  const balances = currentWallet?.balances || {};

  // Convert balances to token array
  const tokens = Object.entries(balances).map(([symbol, balance]) => ({
    symbol,
    balance: parseFloat(balance) || 0,
    price: tokenPrices[symbol] || 0,
    change24h: Math.random() * 10 - 5 // Mock change
  }));

  const totalValue = tokens.reduce((acc, t) => acc + (t.balance * t.price), 0);

  // Receive is read-only - transactions come from blockchain
  const receiveMutation = useMutation({
    mutationFn: async ({ token, amount }) => {
      throw new Error('Cannot manually receive funds. Real transactions will appear automatically when sent to your wallet address.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Funds received successfully');
      setShowReceiveDialog(false);
      setReceiveAmount('');
      setSelectedToken(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Transaction failed');
    }
  });

  // Send transaction mutation with notification trigger
   const sendMutation = useMutation({
     mutationFn: async ({ token, amount, recipient, walletType, network = 'ethereum' }) => {
       console.log('sendMutation.mutationFn called with:', { token, amount, recipient, network });
       if (!currentWallet) throw new Error('No wallet found');
       if (!currentWallet.encrypted_private_key) throw new Error('This wallet does not support sending');
      
      const currentBalance = balances[token] || 0;
      if (currentBalance < amount) throw new Error('Insufficient balance');

      try {
        const decryptedKey = decryptPrivateKey(currentWallet.encrypted_private_key);
        let txHash;

        // Route to appropriate blockchain network
        if (network.toLowerCase() === 'bitcoin' || token === 'BTC') {
          txHash = await sendBitcoinTransaction(decryptedKey, recipient, amount);
        } else if (network.toLowerCase() === 'solana' || token === 'SOL') {
          txHash = await sendSolanaTransaction(decryptedKey, recipient, amount);
        } else {
          // Default to Ethereum
          txHash = await sendEthereumTransaction(decryptedKey, recipient, amount.toString());
        }

        // Update wallet balance
        const newBalance = currentBalance - amount;
        await base44.entities.Wallet.update(currentWallet.id, {
          balances: {
            ...balances,
            [token]: newBalance
          },
          total_usd_value: Object.entries(balances).reduce((sum, [key, bal]) => {
            const price = tokenPrices[key] || 0;
            const newBal = key === token ? newBalance : bal;
            return sum + (newBal * price);
          }, 0)
        });

        // Record transaction
        const transaction = await base44.entities.Transaction.create({
          user_id: user.id,
          type: 'transfer_out',
          from_token: token,
          from_amount: amount,
          to_token: token,
          to_amount: amount,
          fee: amount * 0.001,
          status: 'completed',
          usd_value: amount * (tokenPrices[token] || 0),
          tx_hash: txHash,
          network: network
        });

        // Trigger transaction notification
        if (notificationPreferences.length > 0) {
          await notificationManager.checkTransactionStatus([transaction], user, notificationPreferences);
        }

        return txHash;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
       console.log('Send transaction success');
       queryClient.invalidateQueries({ queryKey: ['wallets'] });
       queryClient.invalidateQueries({ queryKey: ['transactions'] });
       toast.success('Transaction sent successfully');
       setShowSendDialog(false);
       setSendAmount('');
       setRecipientAddress('');
       setSelectedToken(null);
     },
     onError: (error) => {
       console.error('Send transaction error:', error);
       toast.error(error.message || 'Transaction failed');
     }
    });

  const handleSend = () => {
    if (!selectedToken || !sendAmount || !recipientAddress) {
      toast.error('Please fill all fields');
      return;
    }
    if (!currentWallet?.encrypted_private_key) {
      toast.error('This wallet does not support sending');
      return;
    }

    // Determine network based on token
    let network = 'ethereum';
    if (selectedToken.symbol === 'BTC') network = 'bitcoin';
    else if (selectedToken.symbol === 'SOL') network = 'solana';

    console.log('Sending transaction:', {
      token: selectedToken.symbol,
      amount: parseFloat(sendAmount),
      recipient: recipientAddress,
      network
    });

    sendMutation.mutate({
      token: selectedToken.symbol,
      amount: parseFloat(sendAmount),
      recipient: recipientAddress,
      walletType: currentWallet.wallet_type,
      network: network
    });
  };

  const openSendDialog = (token) => {
    setSelectedToken(token);
    setShowSendDialog(true);
  };

  const openReceiveDialog = (token) => {
    setSelectedToken(token);
    setShowReceiveDialog(true);
  };

  const handleReceive = () => {
    if (!selectedToken || !receiveAmount) {
      toast.error('Please enter an amount');
      return;
    }
    receiveMutation.mutate({
      token: selectedToken.symbol,
      amount: parseFloat(receiveAmount)
    });
  };

  const handleRefresh = async () => {
    return new Promise(resolve => {
      setTimeout(resolve, 1000);
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
                <WalletManager
                  wallets={wallets}
                  user={user}
                  selectedWalletId={selectedWalletId}
                  onSelectWallet={setSelectedWalletId}
                  onAddWallet={() => setShowImport(true)}
                />
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

        {/* Advanced Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AdvancedChart totalValue={totalValue} />
        </motion.div>

        {/* P&L Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <PLTracker wallets={wallets} />
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

        {/* Last Transaction Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <LastTransactionDetails user={user} />
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
        >
          <TransactionHistory user={user} wallets={wallets} selectedWalletId={selectedWalletId} />
        </motion.div>

        {/* Tax Report */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
        >
          <TaxReport user={user} />
        </motion.div>

        {/* Token Holdings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Your Assets</h2>
            <span className="text-purple-400 text-sm font-medium">
              {tokens.length} {tokens.length === 1 ? 'Asset' : 'Assets'}
            </span>
          </div>
          
          {isLoading ? (
            <div className="text-center text-white/50 py-8">Loading wallet...</div>
          ) : tokens.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-white/70 mb-4">No assets found. Import a wallet or deposit funds to get started.</p>
              <Button
                onClick={() => setShowImport(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Import Wallet
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {tokens.map((token, index) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="relative group"
                >
                  <TokenCard
                    symbol={token.symbol}
                    balance={showBalance ? token.balance : 0}
                    usdValue={showBalance ? token.balance * token.price : 0}
                    change24h={token.change24h}
                  />
                  <button
                    onClick={() => openSendDialog(token)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-purple-500 hover:bg-purple-600"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <PrivateKeyImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        user={user}
        onImport={() => {
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
          toast.success('Wallets imported successfully');
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

      {/* Send Token Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Send {selectedToken?.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white/70">From Wallet</Label>
              <p className="text-white/90 text-sm mt-1">{currentWallet?.wallet_name}</p>
              <p className="text-white/50 text-xs font-mono">
                {currentWallet?.wallet_address?.slice(0, 10)}...{currentWallet?.wallet_address?.slice(-8)}
              </p>
            </div>

            <div>
              <Label className="text-white/70">Available Balance</Label>
              <p className="text-2xl font-bold text-white mt-1">
                {selectedToken?.balance.toFixed(6)} {selectedToken?.symbol}
              </p>
              <p className="text-white/50 text-sm">
                ≈ ${(selectedToken?.balance * selectedToken?.price).toFixed(2)}
              </p>
            </div>

            <div>
              <Label className="text-white/70">Amount</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button
                  onClick={() => setSendAmount(selectedToken?.balance.toString())}
                  variant="outline"
                  className="border-white/20 text-white"
                >
                  MAX
                </Button>
              </div>
              {sendAmount && (
                <p className="text-white/50 text-sm mt-1">
                  ≈ ${(parseFloat(sendAmount || 0) * selectedToken?.price).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label className="text-white/70">Recipient Address</Label>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-400 text-sm">
                Network fee: ~{(parseFloat(sendAmount || 0) * 0.001).toFixed(6)} {selectedToken?.symbol}
              </p>
            </div>

            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !sendAmount || !recipientAddress}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ minHeight: '44px' }}
            >
              {sendMutation.isPending ? 'Processing...' : 'Send Transaction'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive Token Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Receive {selectedToken?.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white/70">To Wallet</Label>
              <p className="text-white/90 text-sm mt-1">{currentWallet?.wallet_name}</p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 mt-2">
                <p className="text-white text-xs font-mono break-all">
                  {currentWallet?.wallet_address}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-white/70">Amount to Receive</Label>
              <Input
                type="number"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white mt-2"
              />
              {receiveAmount && (
                <p className="text-white/50 text-sm mt-1">
                  ≈ ${(parseFloat(receiveAmount || 0) * selectedToken?.price).toFixed(2)}
                </p>
              )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                Send {selectedToken?.symbol} to the address above. This is a simulation for testing.
              </p>
            </div>

            <Button
              onClick={handleReceive}
              disabled={receiveMutation.isPending || !receiveAmount}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ minHeight: '44px' }}
            >
              {receiveMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </PullToRefresh>
      </motion.div>
      );
      }