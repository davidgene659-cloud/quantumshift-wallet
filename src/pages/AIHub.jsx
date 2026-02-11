import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Shield, TrendingUp, Zap, Brain, Target } from 'lucide-react';
import SecurityMonitor from '@/components/ai/SecurityMonitor';
import CrossChainAssistant from '@/components/ai/CrossChainAssistant';
import HuggingFaceIntegration from '@/components/ai/HuggingFaceIntegration';
import AIChatbot from '@/components/chat/AIChatbot';

export default function AIHub() {
  const aiFeatures = [
    {
      icon: Shield,
      title: 'Security Monitor',
      description: 'Real-time threat detection and self-healing security',
      color: 'from-purple-500 to-pink-500',
      stats: 'Protected 24/7'
    },
    {
      icon: TrendingUp,
      title: 'DeFi Strategies',
      description: 'AI-generated personalized yield strategies',
      color: 'from-green-500 to-emerald-500',
      stats: '8-15% APY',
      link: 'DeFiStrategies'
    },
    {
      icon: Zap,
      title: 'Cross-Chain Agent',
      description: 'Seamless multi-chain transactions',
      color: 'from-blue-500 to-cyan-500',
      stats: 'Any chain, one click'
    },
    {
      icon: Target,
      title: 'Trust Scoring',
      description: 'Real-time reputation analysis for DApps',
      color: 'from-orange-500 to-red-500',
      stats: 'Scam protection',
      link: 'DApps'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">AI Command Center</h1>
          <p className="text-white/60 text-lg">Your intelligent crypto assistant, working 24/7</p>
        </div>

        {/* AI Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aiFeatures.map((feature, idx) => (
            <Card key={idx} className="bg-gray-900/50 border-white/10 hover:border-purple-500/30 transition-all">
              <CardContent className="p-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm mb-3">{feature.description}</p>
                <p className="text-purple-400 text-xs font-semibold">{feature.stats}</p>
                {feature.link && (
                  <Link to={createPageUrl(feature.link)}>
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-purple-400 hover:text-purple-300">
                      Open →
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Security Monitor */}
        <SecurityMonitor />

        {/* Cross-Chain Assistant */}
        <CrossChainAssistant />

        {/* Hugging Face Integration */}
        <HuggingFaceIntegration />

        {/* AI Insights */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <CardTitle className="text-white">How AI Powers Your Wallet</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-white/80 space-y-3">
            <p>✓ <strong>Predictive Security:</strong> ML models learn your patterns and flag anomalies before they become threats</p>
            <p>✓ <strong>Trust Scores:</strong> Analyzes on-chain data, audits, and community sentiment to rate DApps and contracts</p>
            <p>✓ <strong>Smart Routing:</strong> Finds the cheapest, fastest path for cross-chain transactions automatically</p>
            <p>✓ <strong>Strategy Generator:</strong> Creates custom DeFi strategies based on your risk profile and goals</p>
            <p>✓ <strong>Self-Healing:</strong> Automatically applies security patches and configuration fixes with your approval</p>
          </CardContent>
        </Card>

      </div>

      <AIChatbot />
    </div>
  );
}