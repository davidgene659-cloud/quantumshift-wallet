import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Cpu, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MinerCard from '@/components/mining/MinerCard';
import AIChatbot from '@/components/chat/AIChatbot';

const coins = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'from-orange-500 to-amber-600' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'from-indigo-500 to-purple-600' },
  { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', color: 'from-gray-400 to-gray-600' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: 'from-amber-400 to-yellow-500' },
];

const miningTiers = [
  { id: 'starter', name: 'Starter', price: 0, hashrate: '10 TH/s', daily: '0.00001 BTC' },
  { id: 'standard', name: 'Standard', price: 49, hashrate: '50 TH/s', daily: '0.00005 BTC' },
  { id: 'professional', name: 'Professional', price: 199, hashrate: '200 TH/s', daily: '0.0002 BTC' },
  { id: 'enterprise', name: 'Enterprise', price: 999, hashrate: '1000 TH/s', daily: '0.001 BTC' },
];

export default function CloudMining() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const queryClient = useQueryClient();

  const { data: miners = [] } = useQuery({
    queryKey: ['cloudMiners'],
    queryFn: () => base44.entities.CloudMiner.list(),
  });

  const createMinerMutation = useMutation({
    mutationFn: (data) => base44.entities.CloudMiner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudMiners'] });
      setShowCreateDialog(false);
      setSelectedCoin(null);
    },
  });

  const handleCreateMiner = (coin) => {
    createMinerMutation.mutate({
      coin: coin,
      hashrate: 10,
      status: 'active',
      tier: 'starter',
      total_mined: 0,
      daily_estimate: 0.00001,
    });
  };

  const totalMined = miners.reduce((acc, m) => ({
    ...acc,
    [m.coin]: (acc[m.coin] || 0) + (m.total_mined || 0)
  }), {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
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
              <h1 className="text-2xl font-bold text-white">Cloud Mining</h1>
              <p className="text-white/50 text-sm">Mine crypto without hardware</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowTierDialog(true)}
              variant="outline"
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Miner
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
          {coins.map((coin) => (
            <div key={coin.symbol} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${coin.color} flex items-center justify-center text-white font-bold`}>
                  {coin.icon}
                </div>
                <span className="text-white/70 text-sm">{coin.symbol} Mined</span>
              </div>
              <p className="text-xl font-bold text-white">{(totalMined[coin.symbol] || 0).toFixed(8)}</p>
            </div>
          ))}
        </motion.div>

        {/* Active Hashrate Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-r from-rose-500/20 to-red-500/20 border border-rose-500/30 rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">Total Active Hashrate</p>
              <p className="text-3xl font-bold text-white">
                {miners.filter(m => m.status === 'active').reduce((acc, m) => acc + (m.hashrate || 0), 0)} TH/s
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Active Miners</p>
            <p className="text-3xl font-bold text-emerald-400">{miners.filter(m => m.status === 'active').length}</p>
          </div>
        </motion.div>

        {/* Miners Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Your Miners</h2>
          {miners.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {miners.map((miner) => (
                <MinerCard key={miner.id} miner={miner} />
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <Cpu className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No miners yet</h3>
              <p className="text-white/50 mb-4">Start cloud mining to earn passive crypto income</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-rose-500 to-red-500"
              >
                Start Mining
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Miner Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Mining</DialogTitle>
          </DialogHeader>
          <p className="text-white/60 mb-4">Select a coin to mine</p>
          <div className="grid grid-cols-2 gap-3">
            {coins.map((coin) => (
              <motion.button
                key={coin.symbol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCreateMiner(coin.symbol)}
                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-left"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${coin.color} flex items-center justify-center text-xl font-bold text-white`}>
                  {coin.icon}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{coin.symbol}</h4>
                  <p className="text-white/50 text-sm">{coin.name}</p>
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
            <DialogTitle>Mining Plans</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-4 gap-3 mt-4">
            {miningTiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border ${
                  tier.id === 'professional' ? 'border-rose-500 bg-rose-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <h4 className="text-white font-bold mb-1">{tier.name}</h4>
                <p className="text-2xl font-bold text-white mb-3">
                  ${tier.price}<span className="text-sm text-white/50">/mo</span>
                </p>
                <div className="space-y-2 text-sm text-white/70">
                  <p>• {tier.hashrate}</p>
                  <p>• ~{tier.daily}/day</p>
                </div>
                <Button
                  className={`w-full mt-4 ${
                    tier.id === 'professional' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {tier.price === 0 ? 'Current' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AIChatbot />
    </div>
  );
}