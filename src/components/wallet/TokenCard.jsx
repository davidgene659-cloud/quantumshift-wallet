import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const tokenIcons = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  BNB: '◆',
  SOL: '◎',
  XRP: '✕',
  ADA: '₳',
  DOGE: 'Ð',
  DOT: '●',
  MATIC: '⬡'
};

const tokenColors = {
  BTC: 'from-orange-500 to-amber-600',
  ETH: 'from-indigo-500 to-purple-600',
  USDT: 'from-green-500 to-emerald-600',
  BNB: 'from-yellow-500 to-orange-500',
  SOL: 'from-purple-500 to-pink-500',
  XRP: 'from-gray-600 to-gray-800',
  ADA: 'from-blue-500 to-cyan-500',
  DOGE: 'from-amber-400 to-yellow-500',
  DOT: 'from-pink-500 to-rose-600',
  MATIC: 'from-violet-500 to-purple-600'
};

export default function TokenCard({ symbol, name, balance, usdValue, change24h, onClick }) {
  const isPositive = change24h >= 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tokenColors[symbol] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
            {tokenIcons[symbol] || symbol[0]}
          </div>
          <div>
            <h3 className="text-white font-semibold">{symbol}</h3>
            {name && <p className="text-white/40 text-xs">{name}</p>}
            <p className="text-white/50 text-sm">{balance.toFixed(6)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-semibold">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? '+' : ''}{change24h.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}