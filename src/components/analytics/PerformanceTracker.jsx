import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function PerformanceTracker({ userId }) {
  const [timeframe, setTimeframe] = useState('30d');

  const { data: snapshots = [] } = useQuery({
    queryKey: ['portfolioSnapshots', userId, timeframe],
    queryFn: async () => {
      const snaps = await base44.entities.PortfolioSnapshot.filter({ user_id: userId });
      return snaps.sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
    },
    enabled: !!userId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', userId],
    queryFn: () => base44.entities.Transaction.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const chartData = snapshots.map(snap => ({
    date: format(new Date(snap.snapshot_date), 'MMM dd'),
    value: snap.total_value_usd,
  }));

  const calculateStats = () => {
    if (snapshots.length < 2) return { change: 0, changePercent: 0, high: 0, low: 0 };
    
    const values = snapshots.map(s => s.total_value_usd);
    const first = values[0];
    const last = values[values.length - 1];
    
    return {
      change: last - first,
      changePercent: ((last - first) / first) * 100,
      high: Math.max(...values),
      low: Math.min(...values),
    };
  };

  const stats = calculateStats();

  const tokenPerformance = () => {
    const performance = {};
    snapshots.forEach(snap => {
      if (snap.holdings) {
        Object.entries(snap.holdings).forEach(([token, balance]) => {
          if (!performance[token]) performance[token] = [];
          performance[token].push({ date: snap.snapshot_date, balance });
        });
      }
    });
    return performance;
  };

  const exportReport = async () => {
    const report = {
      period: timeframe,
      generated: new Date().toISOString(),
      stats,
      snapshots,
      transactions: transactions.slice(0, 50),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Performance Tracker
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList className="bg-white/5">
            <TabsTrigger value="7d">7D</TabsTrigger>
            <TabsTrigger value="30d">30D</TabsTrigger>
            <TabsTrigger value="90d">90D</TabsTrigger>
            <TabsTrigger value="1y">1Y</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Total Change</p>
              <p className={`text-2xl font-bold ${stats.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.change >= 0 ? '+' : ''}${stats.change.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Percentage</p>
              <p className={`text-2xl font-bold ${stats.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Period High</p>
              <p className="text-2xl font-bold text-white">${stats.high.toFixed(2)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/50 text-sm">Period Low</p>
              <p className="text-2xl font-bold text-white">${stats.low.toFixed(2)}</p>
            </div>
          </div>

          <TabsContent value={timeframe} className="mt-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#ffffff50" />
                  <YAxis stroke="#ffffff50" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #ffffff20', borderRadius: '8px' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="bg-white/5 rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/50">No historical data yet. Check back after 24 hours.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}