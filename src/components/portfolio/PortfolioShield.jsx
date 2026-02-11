import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Shield, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PortfolioShield() {
  const queryClient = useQueryClient();

  const { data: riskProfiles = [] } = useQuery({
    queryKey: ['riskProfiles'],
    queryFn: () => base44.entities.RiskProfile.list(),
    initialData: [],
  });

  const userProfile = riskProfiles[0] || {
    risk_tolerance: 'moderate',
    auto_rebalance: false,
    stablecoin_allocation_target: 20,
    volatility_alerts: true
  };

  const [localRiskLevel, setLocalRiskLevel] = useState(
    ['very_low', 'low', 'moderate', 'high', 'very_high'].indexOf(userProfile.risk_tolerance)
  );

  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => {
      if (riskProfiles.length > 0) {
        return base44.entities.RiskProfile.update(riskProfiles[0].id, profileData);
      } else {
        return base44.entities.RiskProfile.create(profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riskProfiles'] });
    },
  });

  const riskLevels = [
    { value: 0, label: 'Very Low', color: 'text-green-400', stablecoin: 60 },
    { value: 1, label: 'Low', color: 'text-blue-400', stablecoin: 40 },
    { value: 2, label: 'Moderate', color: 'text-yellow-400', stablecoin: 20 },
    { value: 3, label: 'High', color: 'text-orange-400', stablecoin: 10 },
    { value: 4, label: 'Very High', color: 'text-red-400', stablecoin: 5 },
  ];

  const currentRisk = riskLevels[localRiskLevel];

  const handleSave = () => {
    updateProfileMutation.mutate({
      risk_tolerance: ['very_low', 'low', 'moderate', 'high', 'very_high'][localRiskLevel],
      stablecoin_allocation_target: currentRisk.stablecoin,
      auto_rebalance: userProfile.auto_rebalance,
      volatility_alerts: userProfile.volatility_alerts
    });
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-white">Portfolio Shield</CardTitle>
            <CardDescription className="text-white/60">Protect against market volatility</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70">Risk Comfort Level</span>
            <span className={`font-bold ${currentRisk.color}`}>{currentRisk.label}</span>
          </div>
          
          <Slider
            value={[localRiskLevel]}
            onValueChange={(value) => setLocalRiskLevel(value[0])}
            max={4}
            step={1}
            className="mb-2"
          />
          
          <div className="flex justify-between text-xs text-white/50">
            <span>Safest</span>
            <span>Balanced</span>
            <span>Aggressive</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-blue-400" />
              <span className="text-white/70 text-sm">Stablecoins</span>
            </div>
            <p className="text-white text-2xl font-bold">{currentRisk.stablecoin}%</p>
            <p className="text-white/50 text-xs mt-1">Recommended allocation</p>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-white/70 text-sm">Growth Assets</span>
            </div>
            <p className="text-white text-2xl font-bold">{100 - currentRisk.stablecoin}%</p>
            <p className="text-white/50 text-xs mt-1">Higher risk/reward</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white/90 text-sm">
                Based on your <strong>{currentRisk.label}</strong> risk setting, we'll suggest moving {currentRisk.stablecoin}% 
                of your portfolio to stablecoins during high market volatility.
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          Save Risk Settings
        </Button>

      </CardContent>
    </Card>
  );
}