import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

const generateMockData = (points, volatility) => {
  let value = 10000 + Math.random() * 5000;
  return Array.from({ length: points }, (_, i) => {
    value = value + (Math.random() - 0.48) * volatility;
    return {
      time: i,
      value: Math.max(0, value)
    };
  });
};

export default function PortfolioChart({ totalValue }) {
  const [activeTimeframe, setActiveTimeframe] = useState('1W');
  const [data] = useState(() => generateMockData(50, 500));
  
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const change = ((lastValue - firstValue) / firstValue) * 100;
  const isPositive = change >= 0;

  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-white/50 text-sm mb-1">Total Portfolio Value</p>
          <motion.h2 
            key={totalValue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white"
          >
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </motion.h2>
          <p className={`text-sm mt-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}% this {activeTimeframe.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTimeframe === tf 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px'
              }}
              labelStyle={{ display: 'none' }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'Value']}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={isPositive ? "#10b981" : "#ef4444"} 
              strokeWidth={2}
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}