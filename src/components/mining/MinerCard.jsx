import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Clock, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const coinColors = {
  BTC: 'from-orange-500 to-amber-600',
  ETH: 'from-indigo-500 to-purple-600',
  LTC: 'from-gray-400 to-gray-600',
  DOGE: 'from-amber-400 to-yellow-500'
};

const coinIcons = {
  BTC: '₿',
  ETH: 'Ξ',
  LTC: 'Ł',
  DOGE: 'Ð'
};

const tierLimits = {
  starter: { hashrate: 10, daily: 0.00001 },
  standard: { hashrate: 50, daily: 0.00005 },
  professional: { hashrate: 200, daily: 0.0002 },
  enterprise: { hashrate: 1000, daily: 0.001 }
};

export default function MinerCard({ miner }) {
  const isActive = miner.status === 'active';
  const limits = tierLimits[miner.tier];
  const efficiency = (miner.hashrate / limits.hashrate) * 100;
  const queryClient = useQueryClient();

  const cashOutMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const wallets = await base44.entities.Wallet.filter({ user_id: user.id });
      
      if (wallets[0]) {
        const currentBalances = wallets[0].balances || {};
        const currentBalance = parseFloat(currentBalances[miner.coin] || 0);
        
        await base44.entities.Wallet.update(wallets[0].id, {
          balances: {
            ...currentBalances,
            [miner.coin]: currentBalance + (miner.total_mined || 0),
          },
        });
      }

      await base44.entities.Transaction.create({
        user_id: user.id,
        type: 'mining_reward',
        from_token: 'MINING',
        to_token: miner.coin,
        from_amount: 0,
        to_amount: miner.total_mined || 0,
        fee: 0,
        usd_value: miner.total_mined || 0,
      });

      await base44.entities.CloudMiner.update(miner.id, {
        total_mined: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cloudMiners']);
      queryClient.invalidateQueries(['wallet']);
      toast.success(`Cashed out ${miner.total_mined?.toFixed(8)} ${miner.coin} to wallet 0xdd8D...2713`);
    },
  });

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${coinColors[miner.coin]} flex items-center justify-center text-2xl font-bold text-white`}>
            {coinIcons[miner.coin]}
          </div>
          <div>
            <h3 className="text-white font-semibold">{miner.coin} Miner</h3>
            <Badge variant="outline" className="border-white/20 text-white/70 text-xs capitalize">
              {miner.tier}
            </Badge>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          {isActive ? 'Mining' : 'Paused'}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/60">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Hashrate</span>
          </div>
          <span className="text-white font-semibold">{miner.hashrate} TH/s</span>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/50">Efficiency</span>
            <span className="text-white">{efficiency.toFixed(1)}%</span>
          </div>
          <Progress value={efficiency} className="h-2 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>Total Mined</span>
            </div>
            <p className="text-white font-bold">{miner.total_mined?.toFixed(8) || '0.00000000'} {miner.coin}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-white/50 text-xs mb-1">
              <Clock className="w-3 h-3" />
              <span>Daily Est.</span>
            </div>
            <p className="text-emerald-400 font-bold">+{miner.daily_estimate?.toFixed(8) || limits.daily.toFixed(8)} {miner.coin}</p>
          </div>
        </div>

        {miner.total_mined > 0 && (
          <Button
            onClick={() => cashOutMutation.mutate()}
            disabled={cashOutMutation.isPending}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 mt-3"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {cashOutMutation.isPending ? 'Processing...' : `Cash Out to 0xdd8D...2713`}
          </Button>
        )}
      </div>
    </motion.div>
  );
}