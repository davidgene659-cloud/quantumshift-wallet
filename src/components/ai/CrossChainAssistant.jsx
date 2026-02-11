import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';

export default function CrossChainAssistant() {
  const [intent, setIntent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleProcess = async () => {
    setProcessing(true);
    
    // In production, this would call AI to parse intent and find best route
    setTimeout(() => {
      setResult({
        from: 'Polygon',
        to: 'Arbitrum',
        token: 'USDC',
        amount: '100',
        estimatedTime: '2-5 minutes',
        estimatedFees: '$1.20',
        route: ['Polygon USDC', 'Bridge to Ethereum', 'Bridge to Arbitrum', 'Arbitrum USDC']
      });
      setProcessing(false);
    }, 1500);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-cyan-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <CardTitle className="text-white">Cross-Chain Assistant</CardTitle>
            <p className="text-white/60 text-sm">Tell me what you want, I'll handle the rest</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Swap USDC on Polygon for ETH on Arbitrum"
              className="bg-gray-800/50 border-white/10 text-white pr-12"
            />
            <Button
              size="icon"
              onClick={handleProcess}
              disabled={!intent || processing}
              className="absolute right-1 top-1 bg-cyan-500 hover:bg-cyan-600"
            >
              {processing ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </div>

          {result && (
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
              <p className="text-white/80 text-sm mb-3">I'll execute this for you:</p>
              
              <div className="flex items-center gap-2 text-white/90">
                {result.route.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <span className="text-sm">{step}</span>
                    {idx < result.route.length - 1 && <ArrowRight className="w-4 h-4 text-cyan-400" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                <div>
                  <p className="text-white/60">Estimated Time</p>
                  <p className="text-white font-medium">{result.estimatedTime}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60">Total Fees</p>
                  <p className="text-white font-medium">{result.estimatedFees}</p>
                </div>
              </div>

              <Button className="w-full bg-cyan-500 hover:bg-cyan-600">
                Execute Transaction
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}