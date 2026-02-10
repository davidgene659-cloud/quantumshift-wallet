import React from 'react';
import { Grid3x3, TrendingUp, Users, Activity } from 'lucide-react';

export default function DAppActivity({ timeRange }) {
  const activities = [
    { dapp: 'Uniswap', interactions: 24, volume: '$5,240', change: '+12%' },
    { dapp: 'Aave', interactions: 8, volume: '$2,100', change: '+5%' },
    { dapp: 'Compound', interactions: 15, volume: '$3,800', change: '-3%' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6">DApp Activity</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <Grid3x3 className="w-8 h-8 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold text-white">47</p>
          <p className="text-white/50 text-sm">Total Interactions</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <Activity className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">$11.1K</p>
          <p className="text-white/50 text-sm">Total Volume</p>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.dapp} className="bg-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{activity.dapp}</span>
              <span className={`text-sm ${
                activity.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                {activity.change}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">{activity.interactions} interactions</span>
              <span className="text-white/70">{activity.volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}