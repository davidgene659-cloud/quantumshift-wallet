import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Settings, TrendingUp, Zap, RefreshCw, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const botIcons = {
  arbitrage: RefreshCw,
  grid: TrendingUp,
  dca: Coins,
  flash_loan: Zap
};

const botColors = {
  arbitrage: 'from-blue-500 to-cyan-500',
  grid: 'from-purple-500 to-pink-500',
  dca: 'from-green-500 to-emerald-500',
  flash_loan: 'from-amber-500 to-orange-500'
};

const tierColors = {
  free: 'bg-gray-500',
  basic: 'bg-blue-500',
  pro: 'bg-purple-500',
  elite: 'bg-amber-500'
};

export default function BotCard({ bot, onToggle, onConfigure }) {
  const Icon = botIcons[bot.bot_type] || RefreshCw;
  const isActive = bot.status === 'active';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${botColors[bot.bot_type]} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold capitalize">{bot.bot_type.replace('_', ' ')} Bot</h3>
            <Badge className={`${tierColors[bot.tier]} text-white text-xs`}>
              {bot.tier.toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'
        }`}>
          {isActive ? 'Active' : 'Paused'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-white/50 text-xs mb-1">Total Profit</p>
          <p className={`text-lg font-bold ${bot.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${bot.total_profit?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-white/50 text-xs mb-1">Total Trades</p>
          <p className="text-lg font-bold text-white">{bot.total_trades || 0}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => onToggle(bot)}
          className={`flex-1 ${
            isActive 
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? 'Pause' : 'Start'}
        </Button>
        <Button
          onClick={() => onConfigure(bot)}
          variant="outline"
          className="border-white/10 text-white hover:bg-white/10"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}