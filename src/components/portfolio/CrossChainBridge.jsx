import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const bridgeProviders = [
  { name: 'Stargate', fee: 0.1, speed: 'Fast', chains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'] },
  { name: 'Synapse', fee: 0.2, speed: 'Medium', chains: ['ethereum', 'bsc', 'avalanche', 'arbitrum'] },
  { name: 'Hop Protocol', fee: 0.15, speed: 'Fast', chains: ['ethereum', 'polygon', 'optimism', 'arbitrum'] },
  { name: 'Across', fee: 0.08, speed: 'Very Fast', chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'] }
];

export default function CrossChainBridge({ tokens = [] }) {
  const [showDetails, setShowDetails] = useState(false);

  // Find bridgeable opportunities
  const bridgeOpportunities = tokens
    .filter(t => t.balance > 0 && t.source === 'real')
    .slice(0, 3);

  if (bridgeOpportunities.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-950/30 to-purple-950/30 border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            Cross-Chain Bridge
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              New
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-white/70 hover:text-white"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/60 text-sm">
          Transfer assets across blockchains with optimal routing and fees
        </p>

        {bridgeOpportunities.map((token, idx) => (
          <div key={idx} className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold">{token.symbol[0]}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{token.symbol}</p>
                  <p className="text-white/50 text-sm">{token.balance.toFixed(4)}</p>
                </div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-300">
                {token.blockchain}
              </Badge>
            </div>

            {showDetails && (
              <div className="space-y-2 pt-3 border-t border-white/10">
                <p className="text-white/70 text-xs font-medium">Available Bridges:</p>
                {bridgeProviders
                  .filter(b => b.chains.includes(token.blockchain))
                  .map((bridge, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">{bridge.name}</span>
                        <Badge variant="outline" className="text-xs">{bridge.speed}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-xs">{bridge.fee}% fee</span>
                        <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                          Bridge
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}

        <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <ArrowRight className="w-4 h-4 mr-2" />
          View All Bridge Options
        </Button>
      </CardContent>
    </Card>
  );
}