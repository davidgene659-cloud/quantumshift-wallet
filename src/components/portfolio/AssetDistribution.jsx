import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';

const blockchainColors = {
  ethereum: '#627EEA',
  bitcoin: '#F7931A',
  solana: '#14F195',
  polygon: '#8247E5',
  bsc: '#F3BA2F',
  avalanche: '#E84142',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  tron: '#EB0029'
};

export default function AssetDistribution({ tokens = [], totalValue = 0 }) {
  const distribution = useMemo(() => {
    const byChain = {};
    
    tokens.forEach(token => {
      const chain = token.blockchain || 'unknown';
      const value = token.balance * (token.price || 0);
      
      if (!byChain[chain]) {
        byChain[chain] = { value: 0, count: 0 };
      }
      byChain[chain].value += value;
      byChain[chain].count += 1;
    });

    return Object.entries(byChain).map(([chain, data]) => ({
      name: chain.charAt(0).toUpperCase() + chain.slice(1),
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue * 100) : 0,
      count: data.count,
      color: blockchainColors[chain] || '#888888'
    })).sort((a, b) => b.value - a.value);
  }, [tokens, totalValue]);

  if (distribution.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Asset Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
                formatter={(value) => `$${value.toFixed(2)}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {distribution.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-white/50 text-sm">{item.count} tokens</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">${item.value.toFixed(2)}</p>
                <Badge variant="outline" className="text-xs">
                  {item.percentage.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}