import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, RefreshCw, TrendingUp, Coins, Zap, Crown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BotCard from '@/components/bots/BotCard';
import TradingAIOptimizer from '@/components/bots/TradingAIOptimizer';
import CustomStrategyBuilder from '@/components/bots/CustomStrategyBuilder';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import AIChatbot from '@/components/chat/AIChatbot';
import SentimentAnalysis from '@/components/bots/SentimentAnalysis';
import VolatilityPredictor from '@/components/bots/VolatilityPredictor';

const botTypes = [
  { type: 'arbitrage', name: 'Arbitrage Bot', icon: RefreshCw, description: 'Exploit price differences across exchanges', color: 'from-blue-500 to-cyan-500' },
  { type: 'grid', name: 'Grid Trading Bot', icon: TrendingUp, description: 'Buy low, sell high automatically', color: 'from-purple-500 to-pink-500' },
  { type: 'dca', name: 'DCA Bot', icon: Coins, description: 'Dollar cost averaging strategy', color: 'from-green-500 to-emerald-500' },
  { type: 'flash_loan', name: 'Flash Loan Bot', icon: Zap, description: 'Arbitrage with borrowed funds', color: 'from-amber-500 to-orange-500' },
];

const tiers = [
  { id: 'free', name: 'Free', price: 0, features: ['1 bot', 'Basic pairs', '10 trades/day'] },
  { id: 'basic', name: 'Basic', price: 29, features: ['3 bots', 'All pairs', '100 trades/day'] },
  { id: 'pro', name: 'Pro', price: 99, features: ['10 bots', 'All pairs', 'Unlimited trades', 'Priority execution'] },
  { id: 'elite', name: 'Elite', price: 299, features: ['Unlimited bots', 'Flash loans', 'VIP support', 'Custom strategies'] },
];

export default function TradingBots() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showStrategyBuilder, setShowStrategyBuilder] = useState(false);
  const queryClient = useQueryClient();

  const { data: bots = [] } = useQuery({
    queryKey: ['tradingBots'],
    queryFn: () => base44.entities.TradingBot.list(),
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['tradingStrategies'],
    queryFn: () => base44.entities.TradingStrategy.list(),
  });

  const createBotMutation = useMutation({
    mutationFn: (data) => base44.entities.TradingBot.create(data),
    onMutate: async (newBot) => {
      await queryClient.cancelQueries({ queryKey: ['tradingBots'] });
      const previousBots = queryClient.getQueryData(['tradingBots']);
      queryClient.setQueryData(['tradingBots'], (old = []) => [...old, { ...newBot, id: 'temp-' + Date.now() }]);
      return { previousBots };
    },
    onError: (err, newBot, context) => {
      queryClient.setQueryData(['tradingBots'], context.previousBots);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      setShowCreateDialog(false);
    },
  });

  const updateBotMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradingBot.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tradingBots'] });
      const previousBots = queryClient.getQueryData(['tradingBots']);
      queryClient.setQueryData(['tradingBots'], (old = []) => old.map(bot => bot.id === id ? { ...bot, ...data } : bot));
      return { previousBots };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tradingBots'], context.previousBots);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tradingBots'] }),
  });

  const createStrategyMutation = useMutation({
    mutationFn: (data) => base44.entities.TradingStrategy.create(data),
    onMutate: async (newStrategy) => {
      await queryClient.cancelQueries({ queryKey: ['tradingStrategies'] });
      const previousStrategies = queryClient.getQueryData(['tradingStrategies']);
      queryClient.setQueryData(['tradingStrategies'], (old = []) => [...old, { ...newStrategy, id: 'temp-' + Date.now() }]);
      return { previousStrategies };
    },
    onError: (err, newStrategy, context) => {
      queryClient.setQueryData(['tradingStrategies'], context.previousStrategies);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingStrategies'] });
      setShowStrategyBuilder(false);
    },
  });

  const handleCreateBot = (type) => {
    createBotMutation.mutate({
      bot_type: type,
      status: 'paused',
      tier: 'free',
      total_profit: 0,
      total_trades: 0,
      config: { pairs: ['BTC/USDT', 'ETH/USDT'], min_profit_percent: 0.5, max_trade_amount: 1000 }
    });
  };

  const handleToggleBot = (bot) => {
    updateBotMutation.mutate({
      id: bot.id,
      data: { status: bot.status === 'active' ? 'paused' : 'active' }
    });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
  };

  return (
    <motion.div 
      key="tradingbots"
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
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Portfolio')}>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Trading Bots</h1>
              <p className="text-white/50 text-sm">AI-powered automated trading</p>
            </div>
          </div>
          <div className="flex gap-3">
            {bots.length > 0 && (
              <TradingAIOptimizer
                bots={bots}
                onOptimize={(analysis) => {
                  console.log('Applying AI optimization:', analysis);
                }}
              />
            )}
            <Button
              onClick={() => setShowTierDialog(true)}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
            <Button
              onClick={() => setShowStrategyBuilder(true)}
              variant="outline"
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Custom Strategy
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Bot
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Profit', value: '$1,234.56', color: 'text-emerald-400' },
            { label: 'Active Bots', value: bots.filter(b => b.status === 'active').length, color: 'text-white' },
            { label: 'Total Trades', value: bots.reduce((acc, b) => acc + (b.total_trades || 0), 0), color: 'text-white' },
            { label: 'Win Rate', value: '67.8%', color: 'text-emerald-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <p className="text-white/50 text-sm mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* AI Analytics */}
        {bots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-4"
          >
            <SentimentAnalysis tradingPairs={['BTC/USDT', 'ETH/USDT', 'SOL/USDT']} />
            <VolatilityPredictor tradingPairs={['BTC/USDT', 'ETH/USDT']} />
          </motion.div>
        )}

        {/* Bots Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Your Bots</h2>
          {bots.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {bots.map((bot) => (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  onToggle={handleToggleBot}
                  onConfigure={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <RefreshCw className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No bots yet</h3>
              <p className="text-white/50 mb-4">Create your first trading bot to start earning</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Create Bot
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Bot Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Bot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-4">
            {botTypes.map((bot) => (
              <motion.button
                key={bot.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreateBot(bot.type)}
                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-left"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bot.color} flex items-center justify-center`}>
                  <bot.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">{bot.name}</h4>
                  <p className="text-white/50 text-sm">{bot.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tier Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upgrade Your Plan</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-4 gap-3 mt-4">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border ${
                  tier.id === 'pro' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <h4 className="text-white font-bold mb-1">{tier.name}</h4>
                <p className="text-2xl font-bold text-white mb-3">
                  ${tier.price}<span className="text-sm text-white/50">/mo</span>
                </p>
                <ul className="space-y-2 text-sm">
                  {tier.features.map((f, i) => (
                    <li key={i} className="text-white/70">• {f}</li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-4 ${
                    tier.id === 'pro' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {tier.price === 0 ? 'Current' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CustomStrategyBuilder
        isOpen={showStrategyBuilder}
        onClose={() => setShowStrategyBuilder(false)}
        onSave={(strategy) => createStrategyMutation.mutate(strategy)}
      />

      <AIChatbot />
      </PullToRefresh>
    </motion.div>
  );
}