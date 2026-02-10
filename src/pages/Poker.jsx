import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Users, Trophy, DollarSign, Spade } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PokerTable from '@/components/poker/PokerTable';
import AIChatbot from '@/components/chat/AIChatbot';

const buyInOptions = [10, 25, 50, 100, 250, 500];

export default function Poker() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [buyIn, setBuyIn] = useState(50);
  const queryClient = useQueryClient();

  const { data: games = [] } = useQuery({
    queryKey: ['pokerGames'],
    queryFn: () => base44.entities.PokerGame.list(),
  });

  const createGameMutation = useMutation({
    mutationFn: (data) => base44.entities.PokerGame.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pokerGames'] });
      setShowCreateDialog(false);
    },
  });

  const handleCreateTable = () => {
    createGameMutation.mutate({
      table_id: Math.random().toString(36).substring(7).toUpperCase(),
      buy_in: buyIn,
      max_players: 9,
      current_players: [],
      pot: 0,
      status: 'waiting',
      blinds: { small: Math.floor(buyIn / 100), big: Math.floor(buyIn / 50) },
      house_fee_collected: 0,
    });
  };

  const handleJoinTable = (game) => {
    console.log('Joining table:', game.id);
  };

  const waitingGames = games.filter(g => g.status === 'waiting');
  const activeGames = games.filter(g => g.status === 'in_progress');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-emerald-950/30 to-gray-950 p-4 md:p-6">
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
              <h1 className="text-2xl font-bold text-white">Texas Hold'em</h1>
              <p className="text-white/50 text-sm">Sit & Go • 5% rake per hand</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Table
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Users, label: 'Players Online', value: '1,234', color: 'text-emerald-400' },
            { icon: Spade, label: 'Active Tables', value: activeGames.length + waitingGames.length, color: 'text-white' },
            { icon: DollarSign, label: 'Total Pot', value: '$45,678', color: 'text-amber-400' },
            { icon: Trophy, label: 'Your Wins', value: '12', color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-white/70 text-sm">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Available Tables */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Available Tables</h2>
          {games.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => (
                <PokerTable
                  key={game.id}
                  game={game}
                  onJoin={handleJoinTable}
                />
              ))}
            </div>
          ) : (
            <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-2xl p-12 text-center">
              <Spade className="w-12 h-12 text-emerald-400/50 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No tables available</h3>
              <p className="text-white/50 mb-4">Be the first to create a poker table</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                Create Table
              </Button>
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-white font-bold mb-4">How Sit & Go Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Join a Table', desc: 'Select a buy-in amount and join an available table' },
              { step: '2', title: 'Play & Win', desc: 'Compete against players worldwide in Texas Hold\'em' },
              { step: '3', title: 'Cash Out', desc: 'Winners receive the pot minus 5% house fee' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{item.title}</h4>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Create Table Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create Poker Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white/70">Select Buy-in Amount</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {buyInOptions.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBuyIn(amount)}
                    className={`p-3 rounded-xl text-center font-semibold transition-all ${
                      buyIn === amount 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Blinds</span>
                <span className="text-white">${Math.floor(buyIn/100)} / ${Math.floor(buyIn/50)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Max Players</span>
                <span className="text-white">9</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">House Fee</span>
                <span className="text-white">5% per pot</span>
              </div>
            </div>

            <Button
              onClick={handleCreateTable}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Create Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AIChatbot />
    </div>
  );
}