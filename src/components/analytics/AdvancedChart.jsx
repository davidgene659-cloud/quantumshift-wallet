import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Settings, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const generateMockData = (days = 30) => {
  const data = [];
  let value = 50000;
  for (let i = 0; i < days; i++) {
    value = value + (Math.random() - 0.45) * 2000;
    data.push({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: Math.round(value),
      sma: Math.round(value * 0.98),
      ema: Math.round(value * 1.01)
    });
  }
  return data;
};

export default function AdvancedChart({ totalValue }) {
  const [timeframe, setTimeframe] = useState('30');
  const [chartType, setChartType] = useState('area');
  const [showSettings, setShowSettings] = useState(false);
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: false,
    volume: false
  });

  const data = generateMockData(parseInt(timeframe));
  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  const toggleIndicator = (indicator) => {
    setIndicators(prev => ({ ...prev, [indicator]: !prev[indicator] }));
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Portfolio Value', 'SMA', 'EMA'],
      ...data.map(d => [d.date, d.portfolio, d.sma, d.ema])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Portfolio Performance</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportData}
            variant="outline"
            size="sm"
            className="border-white/20 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowSettings(true)}
            variant="outline"
            size="sm"
            className="border-white/20 text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-2 mb-4">
        {['7', '30', '90', '365'].map((days) => (
          <button
            key={days}
            onClick={() => setTimeframe(days)}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${
              timeframe === days
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {days === '7' ? '7D' : days === '30' ? '1M' : days === '90' ? '3M' : '1Y'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <defs>
            <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey="date" stroke="#ffffff50" style={{ fontSize: '12px' }} />
          <YAxis stroke="#ffffff50" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="portfolio"
            stroke="#a855f7"
            strokeWidth={2}
            fill={chartType === 'area' ? 'url(#colorPortfolio)' : undefined}
            name="Portfolio"
          />
          {indicators.sma && (
            <Line
              type="monotone"
              dataKey="sma"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              name="SMA (20)"
            />
          )}
          {indicators.ema && (
            <Line
              type="monotone"
              dataKey="ema"
              stroke="#10b981"
              strokeWidth={1.5}
              dot={false}
              name="EMA (20)"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>

      {/* Chart Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Chart Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <h4 className="text-white/70 text-sm mb-3">Chart Type</h4>
              <div className="grid grid-cols-2 gap-2">
                {['area', 'line'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`p-3 rounded-lg border transition-all capitalize ${
                      chartType === type
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white/70 text-sm mb-3">Indicators</h4>
              <div className="space-y-2">
                {Object.entries(indicators).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      value
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/70'
                    }`}
                  >
                    <span className="capitalize">{key === 'sma' ? 'Simple Moving Average (SMA)' : key === 'ema' ? 'Exponential Moving Average (EMA)' : 'Volume'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}