import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Plus } from 'lucide-react';

export default function StrategyBuilder({ strategy, onStrategyChange }) {
  const [buySignal, setBuySignal] = useState(strategy?.strategy_config?.buy_signal || { indicator: 'rsi', threshold: 30 });
  const [sellSignal, setSellSignal] = useState(strategy?.strategy_config?.sell_signal || { indicator: 'rsi', threshold: 70 });

  const indicators = ['rsi', 'macd', 'moving_average', 'price_action'];
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  const handleUpdate = () => {
    onStrategyChange({
      buy_signal: buySignal,
      sell_signal: sellSignal,
      position_size: parseFloat(document.getElementById('positionSize')?.value || 10),
      stop_loss: parseFloat(document.getElementById('stopLoss')?.value || 5),
      take_profit: parseFloat(document.getElementById('takeProfit')?.value || 10),
      max_open_positions: parseInt(document.getElementById('maxPositions')?.value || 1),
      daily_loss_limit: parseFloat(document.getElementById('dailyLossLimit')?.value || 100)
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Buy Signal Configuration</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Indicator</Label>
            <Select value={buySignal.indicator} onValueChange={(val) => setBuySignal({...buySignal, indicator: val})}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {indicators.map(ind => (
                  <SelectItem key={ind} value={ind} className="text-white capitalize">{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white/70">Threshold ({buySignal.indicator === 'rsi' ? '0-100' : 'Custom'})</Label>
            <Input 
              type="number" 
              value={buySignal.threshold} 
              onChange={(e) => setBuySignal({...buySignal, threshold: parseFloat(e.target.value)})}
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="30"
            />
          </div>

          <div>
            <Label className="text-white/70">Timeframe</Label>
            <Select value={buySignal.timeframe || '1h'} onValueChange={(val) => setBuySignal({...buySignal, timeframe: val})}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {timeframes.map(tf => (
                  <SelectItem key={tf} value={tf} className="text-white">{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Sell Signal Configuration</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Indicator</Label>
            <Select value={sellSignal.indicator} onValueChange={(val) => setSellSignal({...sellSignal, indicator: val})}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {indicators.map(ind => (
                  <SelectItem key={ind} value={ind} className="text-white capitalize">{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white/70">Threshold</Label>
            <Input 
              type="number" 
              value={sellSignal.threshold} 
              onChange={(e) => setSellSignal({...sellSignal, threshold: parseFloat(e.target.value)})}
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="70"
            />
          </div>

          <div>
            <Label className="text-white/70">Timeframe</Label>
            <Select value={sellSignal.timeframe || '1h'} onValueChange={(val) => setSellSignal({...sellSignal, timeframe: val})}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-white/10">
                {timeframes.map(tf => (
                  <SelectItem key={tf} value={tf} className="text-white">{tf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="bg-gray-900 border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Risk Management</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white/70">Position Size (%)</Label>
            <Input 
              id="positionSize"
              type="number" 
              defaultValue="10" 
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="10"
            />
          </div>
          <div>
            <Label className="text-white/70">Stop Loss (%)</Label>
            <Input 
              id="stopLoss"
              type="number" 
              defaultValue="5" 
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="5"
            />
          </div>
          <div>
            <Label className="text-white/70">Take Profit (%)</Label>
            <Input 
              id="takeProfit"
              type="number" 
              defaultValue="10" 
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="10"
            />
          </div>
          <div>
            <Label className="text-white/70">Max Open Positions</Label>
            <Input 
              id="maxPositions"
              type="number" 
              defaultValue="1" 
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-white/70">Daily Loss Limit ($)</Label>
            <Input 
              id="dailyLossLimit"
              type="number" 
              defaultValue="100" 
              className="bg-white/5 border-white/10 text-white mt-2"
              placeholder="100"
            />
          </div>
        </div>
      </Card>

      <Button 
        onClick={handleUpdate}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
        style={{ minHeight: '44px' }}
      >
        <ChevronRight className="w-4 h-4 mr-2" />
        Update Strategy
      </Button>
    </div>
  );
}