import React from 'react';
import { Bot, TrendingUp, Target, Zap } from 'lucide-react';

export default function TradingStats({ timeRange }) {
  const stats = [
    { label: 'Total Trades', value: '1,247', icon: Zap, color: 'from-blue-500 to-cyan-500' },
    { label: 'Win Rate', value: '68.4%', icon: Target, color: 'from-green-500 to-emerald-500' },
    { label: 'Profit', value: '+$12,450', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    { label: 'Active Bots', value: '5', icon: Bot, color: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6">Trading Statistics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/5 rounded-xl p-4">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-white/50 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Best Performing Bot</span>
            <span className="text-white font-semibold">Grid Bot #3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/70">Avg Trade Duration</span>
            <span className="text-white font-semibold">4.2 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}