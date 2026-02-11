import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BacktestEngine({ botConfig }) {
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('1y');

  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Backtest a trading strategy for ${botConfig.trading_pair} over the last year with these parameters:
        - Buy Signal: ${botConfig.strategy_config.buy_signal.indicator} at ${botConfig.strategy_config.buy_signal.threshold}
        - Sell Signal: ${botConfig.strategy_config.sell_signal.indicator} at ${botConfig.strategy_config.sell_signal.threshold}
        - Position Size: ${botConfig.strategy_config.position_size}%
        - Stop Loss: ${botConfig.strategy_config.stop_loss}%
        - Take Profit: ${botConfig.strategy_config.take_profit}%
        
        Return JSON with: total_trades, winning_trades, win_rate, total_return_percent, max_drawdown_percent, sharpe_ratio, daily_returns_chart`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            total_trades: { type: 'number' },
            winning_trades: { type: 'number' },
            win_rate: { type: 'number' },
            total_return_percent: { type: 'number' },
            max_drawdown_percent: { type: 'number' },
            sharpe_ratio: { type: 'number' },
            daily_returns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  portfolio_value: { type: 'number' },
                  cumulative_return: { type: 'number' }
                }
              }
            }
          }
        }
      });

      setBacktestResults(result);
      setChartData(result.daily_returns || []);
    } catch (error) {
      console.error('Backtest failed:', error);
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Backtest Strategy</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Historical Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                <SelectItem value="1m" className="text-white">Last Month</SelectItem>
                <SelectItem value="3m" className="text-white">Last 3 Months</SelectItem>
                <SelectItem value="6m" className="text-white">Last 6 Months</SelectItem>
                <SelectItem value="1y" className="text-white">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={runBacktest}
            disabled={isBacktesting}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
            style={{ minHeight: '44px' }}
          >
            {isBacktesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </div>
      </Card>

      {backtestResults && (
        <>
          <Card className="bg-gray-900 border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Backtest Results</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-white">{backtestResults.total_trades}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Win Rate</p>
                <p className="text-2xl font-bold text-green-400">{(backtestResults.win_rate * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Total Return</p>
                <p className={`text-2xl font-bold ${backtestResults.total_return_percent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {backtestResults.total_return_percent.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Max Drawdown</p>
                <p className="text-2xl font-bold text-red-400">{backtestResults.max_drawdown_percent.toFixed(2)}%</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Sharpe Ratio</p>
                <p className="text-2xl font-bold text-white">{backtestResults.sharpe_ratio.toFixed(2)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/50 text-sm">Winning Trades</p>
                <p className="text-2xl font-bold text-white">{backtestResults.winning_trades}</p>
              </div>
            </div>
          </Card>

          {chartData.length > 0 && (
            <Card className="bg-gray-900 border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Portfolio Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                  <Legend />
                  <Line type="monotone" dataKey="portfolio_value" stroke="#8b5cf6" dot={false} />
                  <Line type="monotone" dataKey="cumulative_return" stroke="#10b981" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
}