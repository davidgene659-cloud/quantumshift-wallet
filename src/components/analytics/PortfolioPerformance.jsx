import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function PortfolioPerformance({ timeRange }) {
  const mockData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    value: 10000 + Math.random() * 5000 + i * 100,
  }));

  const change = ((mockData[mockData.length - 1].value - mockData[0].value) / mockData[0].value * 100).toFixed(2);
  const isPositive = change >= 0;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Portfolio Performance</h3>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
          isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="font-semibold">{isPositive ? '+' : ''}{change}%</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-white">
          ${mockData[mockData.length - 1].value.toLocaleString()}
        </p>
        <p className="text-white/50 text-sm">Total Portfolio Value</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={mockData}>
          <XAxis dataKey="date" stroke="#ffffff20" tick={{ fill: '#ffffff50' }} />
          <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff50' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}