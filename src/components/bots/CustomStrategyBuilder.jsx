import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, X, Save, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function CustomStrategyBuilder({ isOpen, onClose, onSave }) {
  const [strategy, setStrategy] = useState({
    name: '',
    description: '',
    risk_tolerance: 'medium',
    trading_pairs: [],
    entry_conditions: '',
    exit_conditions: '',
    position_size: 10,
    stop_loss: 5,
    take_profit: 10,
    max_trades_per_day: 10,
  });
  const [newPair, setNewPair] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const riskProfiles = {
    conservative: { position: 5, stop_loss: 3, take_profit: 6, trades: 5 },
    medium: { position: 10, stop_loss: 5, take_profit: 10, trades: 10 },
    aggressive: { position: 20, stop_loss: 10, take_profit: 20, trades: 20 },
  };

  const handleRiskChange = (risk) => {
    const profile = riskProfiles[risk];
    setStrategy(prev => ({
      ...prev,
      risk_tolerance: risk,
      position_size: profile.position,
      stop_loss: profile.stop_loss,
      take_profit: profile.take_profit,
      max_trades_per_day: profile.trades,
    }));
  };

  const addPair = () => {
    if (newPair && !strategy.trading_pairs.includes(newPair)) {
      setStrategy(prev => ({
        ...prev,
        trading_pairs: [...prev.trading_pairs, newPair]
      }));
      setNewPair('');
    }
  };

  const removePair = (pair) => {
    setStrategy(prev => ({
      ...prev,
      trading_pairs: prev.trading_pairs.filter(p => p !== pair)
    }));
  };

  const refineWithAI = async () => {
    setIsRefining(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a trading strategy expert. Refine this custom trading strategy:

Name: ${strategy.name}
Description: ${strategy.description}
Risk: ${strategy.risk_tolerance}
Pairs: ${strategy.trading_pairs.join(', ')}
Entry: ${strategy.entry_conditions || 'Not specified'}
Exit: ${strategy.exit_conditions || 'Not specified'}

Provide refined strategy in JSON:
{
  "refined_entry": "clear entry conditions with technical indicators",
  "refined_exit": "clear exit conditions",
  "suggested_indicators": ["RSI", "MACD", "EMA"],
  "optimization_tips": "brief tips for this risk level",
  "expected_performance": "realistic expectation"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            refined_entry: { type: "string" },
            refined_exit: { type: "string" },
            suggested_indicators: { type: "array", items: { type: "string" } },
            optimization_tips: { type: "string" },
            expected_performance: { type: "string" }
          }
        }
      });

      setStrategy(prev => ({
        ...prev,
        entry_conditions: result.refined_entry,
        exit_conditions: result.refined_exit,
        description: prev.description + ` | AI Suggestions: ${result.optimization_tips}`
      }));

      alert(`AI Refined! Expected: ${result.expected_performance}\nIndicators: ${result.suggested_indicators.join(', ')}`);
    } catch (error) {
      console.error('AI refinement failed:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = () => {
    if (!strategy.name || strategy.trading_pairs.length === 0) {
      alert('Please provide a name and at least one trading pair');
      return;
    }
    onSave(strategy);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Strategy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Name & Description */}
          <div>
            <Label className="text-white/70">Strategy Name</Label>
            <Input
              value={strategy.name}
              onChange={(e) => setStrategy({ ...strategy, name: e.target.value })}
              placeholder="My Swing Trading Strategy"
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          <div>
            <Label className="text-white/70">Description</Label>
            <Textarea
              value={strategy.description}
              onChange={(e) => setStrategy({ ...strategy, description: e.target.value })}
              placeholder="Strategy focused on capturing medium-term trends..."
              className="bg-white/5 border-white/10 text-white mt-2 h-20"
            />
          </div>

          {/* Risk Tolerance */}
          <div>
            <Label className="text-white/70">Risk Tolerance</Label>
            <MobileSelect
              value={strategy.risk_tolerance}
              onValueChange={handleRiskChange}
              options={[
                { value: 'conservative', label: 'Conservative (Lower risk, stable returns)' },
                { value: 'medium', label: 'Medium (Balanced risk/reward)' },
                { value: 'aggressive', label: 'Aggressive (Higher risk, higher returns)' }
              ]}
              placeholder="Select risk tolerance"
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          {/* Trading Pairs */}
          <div>
            <Label className="text-white/70">Trading Pairs</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newPair}
                onChange={(e) => setNewPair(e.target.value.toUpperCase())}
                placeholder="BTC/USDT"
                className="bg-white/5 border-white/10 text-white"
              />
              <Button onClick={addPair} className="bg-purple-500 hover:bg-purple-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {strategy.trading_pairs.map(pair => (
                <div key={pair} className="flex items-center gap-1 px-3 py-1 bg-purple-500/20 rounded-full">
                  <span className="text-sm">{pair}</span>
                  <button onClick={() => removePair(pair)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Entry & Exit Conditions */}
          <div>
            <Label className="text-white/70">Entry Conditions</Label>
            <Textarea
              value={strategy.entry_conditions}
              onChange={(e) => setStrategy({ ...strategy, entry_conditions: e.target.value })}
              placeholder="e.g., RSI below 30 and price crosses above EMA 20"
              className="bg-white/5 border-white/10 text-white mt-2 h-20"
            />
          </div>

          <div>
            <Label className="text-white/70">Exit Conditions</Label>
            <Textarea
              value={strategy.exit_conditions}
              onChange={(e) => setStrategy({ ...strategy, exit_conditions: e.target.value })}
              placeholder="e.g., RSI above 70 or take profit at 10%"
              className="bg-white/5 border-white/10 text-white mt-2 h-20"
            />
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Position Size (%): {strategy.position_size}%</Label>
              <Slider
                value={[strategy.position_size]}
                onValueChange={([val]) => setStrategy({ ...strategy, position_size: val })}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Stop Loss (%): {strategy.stop_loss}%</Label>
              <Slider
                value={[strategy.stop_loss]}
                onValueChange={([val]) => setStrategy({ ...strategy, stop_loss: val })}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Take Profit (%): {strategy.take_profit}%</Label>
              <Slider
                value={[strategy.take_profit]}
                onValueChange={([val]) => setStrategy({ ...strategy, take_profit: val })}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-white/70">Max Trades/Day: {strategy.max_trades_per_day}</Label>
              <Slider
                value={[strategy.max_trades_per_day]}
                onValueChange={([val]) => setStrategy({ ...strategy, max_trades_per_day: val })}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>
          </div>

          {/* AI Refine Button */}
          <Button
            onClick={refineWithAI}
            disabled={isRefining || !strategy.name}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isRefining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refining with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Refine with AI
              </>
            )}
          </Button>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Strategy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}