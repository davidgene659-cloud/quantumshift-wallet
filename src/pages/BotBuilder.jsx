import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import StrategyBuilder from '@/components/bots/StrategyBuilder';
import BacktestEngine from '@/components/bots/BacktestEngine';
import BotAnalytics from '@/components/bots/BotAnalytics';

export default function BotBuilder() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  const [newBotData, setNewBotData] = useState({
    bot_name: '',
    strategy_type: 'momentum',
    trading_pair: 'BTC/USD',
    exchange: 'local_wallet',
    execution_mode: 'manual'
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      return await base44.auth.me();
    }
  });

  const { data: bots = [] } = useQuery({
    queryKey: ['tradingBots', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.TradingBotConfig.filter({ user_id: user.id }, '-created_at');
    },
    enabled: !!user
  });

  const createBotMutation = useMutation({
    mutationFn: async (botData) => {
      return await base44.entities.TradingBotConfig.create({
        user_id: user.id,
        ...botData,
        strategy_config: {
          buy_signal: { indicator: 'rsi', threshold: 30, timeframe: '1h' },
          sell_signal: { indicator: 'rsi', threshold: 70, timeframe: '1h' },
          position_size: 10,
          stop_loss: 5,
          take_profit: 10,
          max_open_positions: 1,
          daily_loss_limit: 100
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      toast.success('Bot created successfully');
      setShowCreateDialog(false);
      setNewBotData({
        bot_name: '',
        strategy_type: 'momentum',
        trading_pair: 'BTC/USD',
        exchange: 'local_wallet',
        execution_mode: 'manual'
      });
    },
    onError: () => {
      toast.error('Failed to create bot');
    }
  });

  const deleteBotMutation = useMutation({
    mutationFn: async (botId) => {
      return await base44.entities.TradingBotConfig.delete(botId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
      toast.success('Bot deleted');
      setSelectedBot(null);
    }
  });

  const toggleBotMutation = useMutation({
    mutationFn: async (botId) => {
      const bot = bots.find(b => b.id === botId);
      const newStatus = bot.status === 'active' ? 'stopped' : 'active';
      return await base44.entities.TradingBotConfig.update(botId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white">Trading Bots</h1>
            <p className="text-white/50 text-sm mt-1">Create and manage AI-powered trading strategies</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Bot
          </Button>
        </motion.div>

        {/* Bot List or Detail */}
        {!selectedBot ? (
          <div className="grid gap-4">
            {bots.length === 0 ? (
              <Card className="bg-gray-900 border-white/10 p-8 text-center">
                <p className="text-white/70 mb-4">No trading bots yet. Create your first bot to get started.</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  Create Your First Bot
                </Button>
              </Card>
            ) : (
              bots.map(bot => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedBot(bot)}
                  className="cursor-pointer"
                >
                  <Card className="bg-gray-900 border-white/10 hover:border-white/20 transition-all p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{bot.bot_name}</h3>
                        <div className="flex gap-4 mt-2 text-sm text-white/50">
                          <span>{bot.trading_pair}</span>
                          <span>•</span>
                          <span className="capitalize">{bot.strategy_type}</span>
                          <span>•</span>
                          <span className="capitalize">{bot.exchange}</span>
                          <span>•</span>
                          <span className={`capitalize ${bot.status === 'active' ? 'text-green-400' : 'text-white/50'}`}>
                            {bot.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${bot.total_profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${bot.total_profit.toFixed(2)}
                        </p>
                        <p className="text-white/50 text-sm">{bot.total_trades} trades</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bot Header */}
            <div className="flex items-center justify-between">
              <div>
                <button onClick={() => setSelectedBot(null)} className="text-purple-400 hover:text-purple-300 text-sm mb-2">
                  ← Back to Bots
                </button>
                <h1 className="text-3xl font-bold text-white">{selectedBot.bot_name}</h1>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => toggleBotMutation.mutate(selectedBot.id)}
                  className={selectedBot.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  style={{ minHeight: '44px' }}
                >
                  {selectedBot.status === 'active' ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Bot
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Bot
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => deleteBotMutation.mutate(selectedBot.id)}
                  variant="destructive"
                  style={{ minHeight: '44px' }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bot Tabs */}
            <Tabs defaultValue="strategy" className="space-y-6">
              <TabsList className="bg-gray-900 border-white/10 border">
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="backtest">Backtest</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="strategy">
                <StrategyBuilder
                  strategy={selectedBot}
                  onStrategyChange={async (config) => {
                    await base44.entities.TradingBotConfig.update(selectedBot.id, {
                      strategy_config: config
                    });
                    queryClient.invalidateQueries({ queryKey: ['tradingBots'] });
                    toast.success('Strategy updated');
                  }}
                />
              </TabsContent>

              <TabsContent value="backtest">
                <BacktestEngine botConfig={selectedBot} />
              </TabsContent>

              <TabsContent value="analytics">
                <BotAnalytics botId={selectedBot.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Create Bot Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-gray-900 border-white/20">
            <DialogHeader>
              <DialogTitle className="text-white">Create Trading Bot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-white/70">Bot Name</Label>
                <Input
                  value={newBotData.bot_name}
                  onChange={(e) => setNewBotData({ ...newBotData, bot_name: e.target.value })}
                  placeholder="My Trading Bot"
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
              </div>

              <div>
                <Label className="text-white/70">Strategy Type</Label>
                <Select value={newBotData.strategy_type} onValueChange={(val) => setNewBotData({ ...newBotData, strategy_type: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="momentum" className="text-white">Momentum</SelectItem>
                    <SelectItem value="mean_reversion" className="text-white">Mean Reversion</SelectItem>
                    <SelectItem value="dca" className="text-white">Dollar Cost Averaging</SelectItem>
                    <SelectItem value="grid" className="text-white">Grid Trading</SelectItem>
                    <SelectItem value="arbitrage" className="text-white">Arbitrage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/70">Trading Pair</Label>
                <Input
                  value={newBotData.trading_pair}
                  onChange={(e) => setNewBotData({ ...newBotData, trading_pair: e.target.value })}
                  placeholder="BTC/USD"
                  className="bg-white/5 border-white/10 text-white mt-2"
                />
              </div>

              <div>
                <Label className="text-white/70">Exchange</Label>
                <Select value={newBotData.exchange} onValueChange={(val) => setNewBotData({ ...newBotData, exchange: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="local_wallet" className="text-white">Local Wallet</SelectItem>
                    <SelectItem value="binance" className="text-white">Binance</SelectItem>
                    <SelectItem value="kraken" className="text-white">Kraken</SelectItem>
                    <SelectItem value="coinbase" className="text-white">Coinbase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white/70">Execution Mode</Label>
                <Select value={newBotData.execution_mode} onValueChange={(val) => setNewBotData({ ...newBotData, execution_mode: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="manual" className="text-white">Manual</SelectItem>
                    <SelectItem value="continuous" className="text-white">Continuous</SelectItem>
                    <SelectItem value="scheduled" className="text-white">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => createBotMutation.mutate(newBotData)}
                disabled={!newBotData.bot_name || createBotMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ minHeight: '44px' }}
              >
                {createBotMutation.isPending ? 'Creating...' : 'Create Bot'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}