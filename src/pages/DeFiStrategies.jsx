import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Sparkles, Zap, Shield, Play, Pause } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AIChatbot from '@/components/chat/AIChatbot';

export default function DeFiStrategies() {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ['defiStrategies'],
    queryFn: () => base44.entities.DeFiStrategy.list('-created_date'),
    initialData: [],
  });

  const activateStrategyMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.DeFiStrategy.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defiStrategies'] }),
  });

  const generateStrategy = async () => {
    setGenerating(true);
    
    // In production, would call AI service
    setTimeout(async () => {
      await base44.entities.DeFiStrategy.create({
        strategy_name: 'Balanced Yield Optimizer',
        description: 'Automatically rotates between Aave, Compound, and Yearn to maximize stable yields',
        risk_level: 'medium',
        expected_apy: 12.5,
        required_tokens: ['USDC', 'DAI', 'USDT'],
        protocols: ['Aave', 'Compound', 'Yearn'],
        ai_confidence_score: 87
      });
      
      queryClient.invalidateQueries({ queryKey: ['defiStrategies'] });
      setGenerating(false);
    }, 2000);
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
                Generate New Strategy
              </>
            )}
          </Button>
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
                      onClick={() => activateStrategyMutation.mutate({
                        id: strategy.id,
                        status: strategy.status === 'active' ? 'paused' : 'active'
                      })}
                      className={strategy.status === 'active' 
                        ? 'bg-yellow-500 hover:bg-yellow-600' 
                        : 'bg-green-500 hover:bg-green-600'
                      }
                    >
                      {strategy.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
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

      <AIChatbot />
    </div>
  );
}