import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Target, TrendingUp, Shield, Zap, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function RiskProfileSetup({ onComplete }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    risk_tolerance: 'moderate',
    financial_goal: 'growth',
    investment_horizon: '1-3 years',
    target_apy: 15,
    max_loss_tolerance: 20,
    preferred_strategies: []
  });

  const { data: existingProfile } = useQuery({
    queryKey: ['riskProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.RiskProfile.list();
      return profiles[0];
    }
  });

  React.useEffect(() => {
    if (existingProfile) {
      setProfile(prev => ({
        ...prev,
        risk_tolerance: existingProfile.risk_tolerance,
        auto_rebalance: existingProfile.auto_rebalance,
        stablecoin_allocation_target: existingProfile.stablecoin_allocation_target
      }));
    }
  }, [existingProfile]);

  const saveProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (existingProfile) {
        return base44.entities.RiskProfile.update(existingProfile.id, data);
      }
      return base44.entities.RiskProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskProfile'] });
      onComplete?.();
    }
  });

  const riskLevels = [
    { value: 'very_low', label: 'Very Conservative', color: 'text-blue-400', apy: '5-8%', icon: Shield },
    { value: 'low', label: 'Conservative', color: 'text-green-400', apy: '8-12%', icon: Shield },
    { value: 'moderate', label: 'Balanced', color: 'text-yellow-400', apy: '12-18%', icon: Target },
    { value: 'high', label: 'Aggressive', color: 'text-orange-400', apy: '18-30%', icon: TrendingUp },
    { value: 'very_high', label: 'Very Aggressive', color: 'text-red-400', apy: '30%+', icon: Zap }
  ];

  const financialGoals = [
    { value: 'preservation', label: 'Capital Preservation', description: 'Protect your wealth' },
    { value: 'income', label: 'Stable Income', description: 'Generate steady returns' },
    { value: 'growth', label: 'Portfolio Growth', description: 'Maximize long-term gains' },
    { value: 'aggressive_growth', label: 'Aggressive Growth', description: 'High-risk, high-reward' }
  ];

  const strategies = [
    { id: 'yield_farming', label: 'Yield Farming', icon: '🌾' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'liquidity_provision', label: 'Liquidity Pools', icon: '💧' },
    { id: 'leveraged_trading', label: 'Leveraged Trading', icon: '⚡' },
    { id: 'arbitrage', label: 'Arbitrage', icon: '🔄' },
    { id: 'structured_products', label: 'Structured Products', icon: '🏗️' }
  ];

  const toggleStrategy = (strategyId) => {
    setProfile(prev => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(strategyId)
        ? prev.preferred_strategies.filter(s => s !== strategyId)
        : [...prev.preferred_strategies, strategyId]
    }));
  };

  const handleSave = () => {
    saveProfileMutation.mutate(profile);
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= s ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/50'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-purple-500' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-white text-xl font-bold mb-2">What's your risk tolerance?</h3>
            <p className="text-white/60 text-sm mb-6">This helps us recommend strategies that match your comfort level</p>
          </div>

          <div className="grid gap-3">
            {riskLevels.map((risk) => {
              const Icon = risk.icon;
              return (
                <button
                  key={risk.value}
                  onClick={() => setProfile({ ...profile, risk_tolerance: risk.value })}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    profile.risk_tolerance === risk.value
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${risk.color}`} />
                      <div>
                        <p className="text-white font-semibold">{risk.label}</p>
                        <p className="text-white/60 text-sm">Expected APY: {risk.apy}</p>
                      </div>
                    </div>
                    {profile.risk_tolerance === risk.value && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Button onClick={() => setStep(2)} className="w-full bg-purple-500 hover:bg-purple-600">
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-white text-xl font-bold mb-2">What's your financial goal?</h3>
            <p className="text-white/60 text-sm mb-6">Tell us what you're trying to achieve</p>
          </div>

          <div className="grid gap-3">
            {financialGoals.map((goal) => (
              <button
                key={goal.value}
                onClick={() => setProfile({ ...profile, financial_goal: goal.value })}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  profile.financial_goal === goal.value
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold mb-1">{goal.label}</p>
                    <p className="text-white/60 text-sm">{goal.description}</p>
                  </div>
                  {profile.financial_goal === goal.value && (
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-white font-medium mb-3 block">Target Annual APY: {profile.target_apy}%</label>
              <Slider
                value={[profile.target_apy]}
                onValueChange={([value]) => setProfile({ ...profile, target_apy: value })}
                min={5}
                max={50}
                step={1}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-white/50">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>

            <div>
              <label className="text-white font-medium mb-3 block">Max Loss Tolerance: {profile.max_loss_tolerance}%</label>
              <Slider
                value={[profile.max_loss_tolerance]}
                onValueChange={([value]) => setProfile({ ...profile, max_loss_tolerance: value })}
                min={5}
                max={50}
                step={5}
                className="mb-2"
              />
              <div className="flex justify-between text-xs text-white/50">
                <span>5%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-white/10">
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1 bg-purple-500 hover:bg-purple-600">
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-white text-xl font-bold mb-2">Preferred Strategies</h3>
            <p className="text-white/60 text-sm mb-6">Select strategies you're interested in (optional)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => toggleStrategy(strategy.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  profile.preferred_strategies.includes(strategy.id)
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-3xl mb-2">{strategy.icon}</div>
                <p className="text-white text-sm font-medium">{strategy.label}</p>
              </button>
            ))}
          </div>

          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-2">🤖 AI Will Optimize</h4>
              <p className="text-white/70 text-sm">
                Based on your profile, our AI will generate and propose personalized strategies. 
                Every strategy requires your approval before execution.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-white/10">
              Back
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveProfileMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {saveProfileMutation.isPending ? 'Saving...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}