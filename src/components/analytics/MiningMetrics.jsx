import React from 'react';
import { Cpu, Zap, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MiningMetrics({ timeRange }) {
  const mockData = [
    { coin: 'BTC', earnings: 0.0042 },
    { coin: 'ETH', earnings: 0.067 },
    { coin: 'LTC', earnings: 1.24 },
    { coin: 'DOGE', earnings: 850 },
  ];

  const totalEarningsUSD = 1247.50;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6">Mining Metrics</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <Cpu className="w-8 h-8 text-purple-400 mb-2" />
          <p className="text-2xl font-bold text-white">${totalEarningsUSD}</p>
          <p className="text-white/50 text-sm">Total Earnings</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <Zap className="w-8 h-8 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">124.5 TH/s</p>
          <p className="text-white/50 text-sm">Total Hashrate</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={mockData}>
          <XAxis dataKey="coin" stroke="#ffffff50" />
          <YAxis stroke="#ffffff50" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Bar dataKey="earnings" fill="url(#gradient)" radius={[8, 8, 0, 0]} />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}