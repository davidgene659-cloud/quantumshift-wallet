import React from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PokerTable({ game, onJoin }) {
  const playersCount = game.current_players?.length || 0;
  const maxPlayers = game.max_players || 9;
  const isWaiting = game.status === 'waiting';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Table visual */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
      
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Table #{game.table_id?.slice(0, 6) || 'NEW'}</h3>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mt-1 ${
            isWaiting ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isWaiting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isWaiting ? 'Waiting for players' : 'In Progress'}
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs">Buy-in</p>
          <p className="text-white font-bold text-xl">${game.buy_in}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 text-white/50 mx-auto mb-1" />
          <p className="text-white font-semibold">{playersCount}/{maxPlayers}</p>
          <p className="text-white/40 text-xs">Players</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 text-white/50 mx-auto mb-1" />
          <p className="text-white font-semibold">${game.blinds?.small || 5}/{game.blinds?.big || 10}</p>
          <p className="text-white/40 text-xs">Blinds</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-white/50 mx-auto mb-1" />
          <p className="text-white font-semibold">Sit & Go</p>
          <p className="text-white/40 text-xs">Type</p>
        </div>
      </div>

      {/* Player avatars */}
      {playersCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex -space-x-2">
            {game.current_players?.slice(0, 5).map((player, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-gray-900 flex items-center justify-center text-white text-xs font-bold"
              >
                {player.username?.[0]?.toUpperCase() || 'P'}
              </div>
            ))}
          </div>
          {playersCount > 5 && (
            <span className="text-white/50 text-sm">+{playersCount - 5} more</span>
          )}
        </div>
      )}

      <Button
        onClick={() => onJoin(game)}
        disabled={!isWaiting || playersCount >= maxPlayers}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold"
      >
        {isWaiting && playersCount < maxPlayers ? (
          <>Join Table <ChevronRight className="w-4 h-4 ml-1" /></>
        ) : playersCount >= maxPlayers ? (
          'Table Full'
        ) : (
          'In Progress'
        )}
      </Button>

      <p className="text-center text-white/40 text-xs mt-2">5% hosting fee per hand</p>
    </motion.div>
  );
}