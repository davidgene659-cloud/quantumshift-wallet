import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function BotAnalytics({ botId }) {
  const { data: trades = [] } = useQuery({
    queryKey: ['botTrades', botId],
    queryFn: async () => {
      return await base44.entities.BotTrade.filter({ bot_id: botId }, '-entry_time', 50);
    }
  });

  const { data: botConfig } = useQuery({
    queryKey: ['botConfig', botId],
    queryFn: async () => {
      return await base44.entities.TradingBotConfig.filter({ id: botId })[0];
    }
  });

  const closedTrades = trades.filter(t => t.status !== 'open');
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
  const winningTrades = closedTrades.filter(t => t.profit_loss > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  // Prepare P&L chart data
  const plChartData = closedTrades.map((trade, idx) => ({
    date: new Date(trade.entry_time).toLocaleDateString(),
    profit: trade.profit_loss,
    cumulative: closedTrades.slice(0, idx + 1).reduce((sum, t) => sum + (t.profit_loss || 0), 0)
  }));

  // Win/Loss distribution
  const wlData = [
    { name: 'Wins', value: winningTrades.length, fill: '#10b981' },
    { name: 'Losses', value: closedTrades.length - winningTrades.length, fill: '#ef4444' }
  ];

  // Average trade duration
  const avgTradeStats = closedTrades.length > 0 ? {
    avgDuration: closedTrades.reduce((sum, t) => {
      if (t.exit_time && t.entry_time) {
        const diff = new Date(t.exit_time) - new Date(t.entry_time);
        return sum + diff;
      }
      return sum;
    }, 0) / closedTrades.length / (1000 * 60 * 60), // Convert to hours
    largestWin: Math.max(...winningTrades.map(t => t.profit_loss || 0)),
    largestLoss: Math.min(...closedTrades.filter(t => t.profit_loss < 0).map(t => t.profit_loss || 0))
  } : { avgDuration: 0, largestWin: 0, largestLoss: 0 };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-white/10 p-4">
          <p className="text-white/50 text-sm">Total Trades</p>
          <p className="text-2xl font-bold text-white mt-2">{closedTrades.length}</p>
        </Card>
        <Card className="bg-gray-900 border-white/10 p-4">
          <p className="text-white/50 text-sm">Win Rate</p>
          <p className="text-2xl font-bold text-white mt-2">{winRate.toFixed(1)}%</p>
        </Card>
        <Card className="bg-gray-900 border-white/10 p-4">
          <p className="text-white/50 text-sm">Total P&L</p>
          <p className={`text-2xl font-bold mt-2 flex items-center gap-1 ${totalProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfit > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            ${totalProfit.toFixed(2)}
          </p>
        </Card>
        <Card className="bg-gray-900 border-white/10 p-4">
          <p className="text-white/50 text-sm">Avg Duration</p>
          <p className="text-2xl font-bold text-white mt-2">{avgTradeStats.avgDuration.toFixed(1)}h</p>
        </Card>
      </div>

      {/* P&L Chart */}
      {plChartData.length > 0 && (
        <Card className="bg-gray-900 border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Profit & Loss Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={plChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
              <Legend />
              <Line type="monotone" dataKey="cumulative" stroke="#8b5cf6" name="Cumulative P&L" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Win/Loss Distribution */}
      {closedTrades.length > 0 && (
        <Card className="bg-gray-900 border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Trade Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={wlData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`}>
                {wlData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Trade Statistics */}
      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Trade Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-white/50 text-sm">Largest Win</p>
            <p className="text-lg font-bold text-green-400 mt-1">${avgTradeStats.largestWin.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/50 text-sm">Largest Loss</p>
            <p className="text-lg font-bold text-red-400 mt-1">${avgTradeStats.largestLoss.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-white/50 text-sm">Profit Factor</p>
            <p className="text-lg font-bold text-white mt-1">
              {avgTradeStats.largestLoss !== 0 ? (Math.abs(avgTradeStats.largestWin) / Math.abs(avgTradeStats.largestLoss)).toFixed(2) : 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Trades */}
      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {trades.slice(0, 10).map((trade) => (
            <div key={trade.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{trade.side.toUpperCase()} @ ${trade.entry_price.toFixed(2)}</p>
                <p className="text-white/50 text-xs">{new Date(trade.entry_time).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${trade.profit_loss > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${trade.profit_loss?.toFixed(2) || 'Pending'}
                </p>
                <p className="text-white/50 text-xs">{trade.status}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}