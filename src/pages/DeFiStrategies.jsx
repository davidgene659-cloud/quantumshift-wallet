import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, Sparkles, Zap, Shield, Play, Pause, Settings, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AIChatbot from '@/components/chat/AIChatbot';
import RiskProfileSetup from '@/components/defi/RiskProfileSetup';

export default function DeFiStrategies() {
  const [generating, setGenerating] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [confirmingStrategy, setConfirmingStrategy] = useState(null);
  const queryClient = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ['defiStrategies'],
    queryFn: () => base44.entities.DeFiStrategy.list('-created_date'),
    initialData: [],
  });

  const { data: riskProfile } = useQuery({
    queryKey: ['riskProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.RiskProfile.list();
      return profiles[0];
    }
  });

  const activateStrategyMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DeFiStrategy.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defiStrategies'] });
      setConfirmingStrategy(null);
    }
  });

  const handleActivateStrategy = (strategy) => {
    if (strategy.status === 'suggested') {
      setConfirmingStrategy(strategy);
    } else if (strategy.status === 'active') {
      activateStrategyMutation.mutate({ id: strategy.id, status: 'paused' });
    } else {
      activateStrategyMutation.mutate({ id: strategy.id, status: 'active' });
    }
  };

  const generateStrategy = async () => {
    if (!riskProfile) {
      setShowProfileSetup(true);
      return;
    }

    setGenerating(true);
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a personalized DeFi strategy based on:
- Risk Tolerance: ${riskProfile.risk_tolerance}
- Target APY: ${riskProfile.stablecoin_allocation_target || 15}%

Create a JSON strategy with:
- strategy_name (creative, specific name)
- description (how it works, 1-2 sentences)
- risk_level (low/medium/high based on risk tolerance)
- expected_apy (realistic number)
- required_tokens (array of 2-4 tokens)
- protocols (array of 2-4 DeFi protocols)
- ai_confidence_score (70-95)

Make it unique and relevant to current DeFi trends.`,
        response_json_schema: {
          type: "object",
          properties: {
            strategy_name: { type: "string" },
            description: { type: "string" },
            risk_level: { type: "string", enum: ["low", "medium", "high"] },
            expected_apy: { type: "number" },
            required_tokens: { type: "array", items: { type: "string" } },
            protocols: { type: "array", items: { type: "string" } },
            ai_confidence_score: { type: "number" }
          }
        }
      });

      await base44.entities.DeFiStrategy.create({
        ...response,
        status: 'suggested'
      });
      
      queryClient.invalidateQueries({ queryKey: ['defiStrategies'] });
    } catch (error) {
      console.error('Failed to generate strategy:', error);
    } finally {
      setGenerating(false);
    }
  };

  const riskColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950/20 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI DeFi Strategies</h1>
            <p className="text-white/60">Personalized yield optimization powered by AI</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowProfileSetup(true)}
              variant="outline"
              className="border-white/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              {riskProfile ? 'Edit Profile' : 'Setup Profile'}
            </Button>
            <Button
              onClick={generateStrategy}
              disabled={generating}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {generating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Strategy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 text-green-400 mb-3" />
              <p className="text-white/60 text-sm mb-1">Active Strategies</p>
              <p className="text-white text-2xl font-bold">
                {strategies.filter(s => s.status === 'active').length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <p className="text-white/60 text-sm mb-1">Avg. Expected APY</p>
              <p className="text-white text-2xl font-bold">
                {strategies.length > 0 
                  ? (strategies.reduce((sum, s) => sum + (s.expected_apy || 0), 0) / strategies.length).toFixed(1)
                  : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <Shield className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-white/60 text-sm mb-1">Total Profit</p>
              <p className="text-white text-2xl font-bold">
                ${strategies.reduce((sum, s) => sum + (s.total_profit || 0), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Strategies List */}
        {strategies.length === 0 ? (
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-bold mb-2">No strategies yet</h3>
              <p className="text-white/60 mb-4">Let AI generate personalized DeFi strategies for you</p>
              <Button onClick={generateStrategy} className="bg-green-500 hover:bg-green-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate First Strategy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className="bg-gray-900/50 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-bold text-xl">{strategy.strategy_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs border ${riskColors[strategy.risk_level]}`}>
                          {strategy.risk_level.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-white/70 mb-4">{strategy.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-white/50 text-xs mb-1">Expected APY</p>
                          <p className="text-green-400 font-bold text-lg">{strategy.expected_apy}%</p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs mb-1">AI Confidence</p>
                          <p className="text-purple-400 font-bold text-lg">{strategy.ai_confidence_score}%</p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs mb-1">Required Tokens</p>
                          <p className="text-white font-medium">{strategy.required_tokens?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs mb-1">Protocols</p>
                          <p className="text-white font-medium">{strategy.protocols?.length || 0}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {strategy.protocols?.map((protocol, idx) => (
                          <span key={idx} className="px-3 py-1 bg-white/10 rounded-full text-white/80 text-xs">
                            {protocol}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleActivateStrategy(strategy)}
                      className={
                        strategy.status === 'active' 
                          ? 'bg-yellow-500 hover:bg-yellow-600'
                          : strategy.status === 'suggested'
                          ? 'bg-purple-500 hover:bg-purple-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }
                    >
                      {strategy.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </>
                      ) : strategy.status === 'suggested' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* How It Works */}
        <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white">🤖 How AI Strategy Generation Works</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-3">
            <p>✓ <strong>Learns Your Profile:</strong> Analyzes your portfolio, risk tolerance, and goals</p>
            <p>✓ <strong>Market Analysis:</strong> Monitors APYs, risks, and trends across 100+ DeFi protocols</p>
            <p>✓ <strong>Smart Allocation:</strong> Automatically rebalances between protocols for optimal returns</p>
            <p>✓ <strong>Risk Management:</strong> Diversifies across multiple protocols to minimize risk</p>
            <p>✓ <strong>Your Approval:</strong> Every transaction requires your explicit confirmation</p>
          </CardContent>
        </Card>

      </div>

      {/* Profile Setup Dialog */}
      <Dialog open={showProfileSetup} onOpenChange={setShowProfileSetup}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup Your Risk Profile</DialogTitle>
          </DialogHeader>
          <RiskProfileSetup onComplete={() => setShowProfileSetup(false)} />
        </DialogContent>
      </Dialog>

      {/* Strategy Confirmation Dialog */}
      <Dialog open={!!confirmingStrategy} onOpenChange={() => setConfirmingStrategy(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Strategy Execution</DialogTitle>
          </DialogHeader>
          {confirmingStrategy && (
            <div className="space-y-4 mt-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <h3 className="text-white font-bold mb-2">{confirmingStrategy.strategy_name}</h3>
                  <p className="text-white/70 text-sm mb-3">{confirmingStrategy.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-white/50 text-xs">Expected APY</p>
                      <p className="text-green-400 font-bold">{confirmingStrategy.expected_apy}%</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs">Risk Level</p>
                      <p className="text-yellow-400 font-bold">{confirmingStrategy.risk_level.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-white/50 text-xs mb-1">Required Tokens:</p>
                      <div className="flex gap-2">
                        {confirmingStrategy.required_tokens?.map((token, i) => (
                          <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-white/50 text-xs mb-1">Protocols:</p>
                      <div className="flex gap-2">
                        {confirmingStrategy.protocols?.map((protocol, i) => (
                          <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                            {protocol}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <p className="text-yellow-400 text-sm font-medium mb-2">⚠️ Important</p>
                  <ul className="text-white/70 text-xs space-y-1">
                    <li>• This will deploy capital from your wallet</li>
                    <li>• Smart contracts will be executed automatically</li>
                    <li>• You can pause the strategy at any time</li>
                    <li>• DeFi carries risks - only invest what you can afford to lose</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={() => setConfirmingStrategy(null)}
                  variant="outline"
                  className="flex-1 border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => activateStrategyMutation.mutate({
                    id: confirmingStrategy.id,
                    status: 'active'
                  })}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve & Activate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AIChatbot />
    </div>
  );
}