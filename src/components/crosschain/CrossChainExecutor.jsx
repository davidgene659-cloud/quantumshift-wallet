import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Zap, Clock, Shield, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';

const chains = [
  { id: 'ethereum', name: 'Ethereum', icon: 'ETH' },
  { id: 'polygon', name: 'Polygon', icon: 'MATIC' },
  { id: 'bsc', name: 'BNB Chain', icon: 'BNB' },
  { id: 'solana', name: 'Solana', icon: 'SOL' }
];

export default function CrossChainExecutor() {
  const [fromChain, setFromChain] = useState('ethereum');
  const [toChain, setToChain] = useState('polygon');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('optimizeCrossChainRoute', {
        from_chain: fromChain,
        to_chain: toChain,
        token,
        amount: parseFloat(amount)
      });
      setRouteData(response.data);
      setShowConfirm(true);
    } catch (error) {
      console.error('Failed to optimize route:', error);
    }
    setLoading(false);
  };

  const handleExecute = async () => {
    alert('Cross-chain transaction execution will be implemented with wallet signing');
    setShowConfirm(false);
  };

  return (
    <>
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Cross-Chain Transaction Optimizer
          </CardTitle>
          <p className="text-white/50 text-sm">Find the cheapest and fastest bridge route</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">From Chain</label>
              <Select value={fromChain} onValueChange={setFromChain}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chains.map(chain => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">To Chain</label>
              <Select value={toChain} onValueChange={setToChain}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chains.map(chain => (
                    <SelectItem key={chain.id} value={chain.id}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Token</label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="USDC"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">Amount</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <Button
            onClick={handleOptimize}
            disabled={loading || !amount}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {loading ? 'Optimizing...' : 'Find Best Route'}
          </Button>
        </CardContent>
      </Card>

      {/* Route Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="bg-gray-900 border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Optimized Cross-Chain Route</DialogTitle>
          </DialogHeader>

          {routeData && (
            <div className="space-y-4">
              {/* Recommended Bridge */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    Recommended: {routeData.recommended_bridge.bridge_name}
                  </h4>
                  <Badge className="bg-green-500/20 text-green-400">
                    {routeData.recommended_bridge.efficiency_score.toFixed(1)}% Efficiency
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-white/50 text-xs">Total Cost</p>
                    <p className="text-white font-semibold">${routeData.recommended_bridge.total_cost_usd.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-white/50 text-xs">Estimated Time</p>
                    <p className="text-white font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{routeData.recommended_bridge.estimated_time_minutes}min
                    </p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-white/50 text-xs">You'll Receive</p>
                    <p className="text-green-400 font-semibold">{routeData.recommended_bridge.amount_received.toFixed(2)} {token}</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-white/50 text-xs">Bridge Fee</p>
                    <p className="text-white font-semibold">{routeData.recommended_bridge.bridge_fee_percent}%</p>
                  </div>
                </div>
              </div>

              {/* Savings Comparison */}
              {routeData.savings.amount_usd > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Save ${routeData.savings.amount_usd.toFixed(2)} ({routeData.savings.percent.toFixed(1)}%) vs next best option
                  </p>
                </div>
              )}

              {/* Alternative Options */}
              {routeData.alternative_options.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Alternative Bridges</h4>
                  <div className="space-y-2">
                    {routeData.alternative_options.map((bridge, i) => (
                      <div key={i} className="bg-white/5 rounded p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white">{bridge.bridge_name}</span>
                          <span className="text-white/70">${bridge.total_cost_usd.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>{bridge.estimated_time_minutes}min</span>
                          <span>{bridge.bridge_fee_percent}% fee</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Hop Route */}
              {routeData.multi_hop_route && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <h4 className="text-blue-400 font-semibold mb-2">Multi-Hop Alternative</h4>
                  <p className="text-white/70 text-sm">{routeData.multi_hop_route.route}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                    <span>Cost: ${routeData.multi_hop_route.total_cost_usd.toFixed(2)}</span>
                    <span>Time: ~{routeData.multi_hop_route.total_time_minutes}min</span>
                  </div>
                </div>
              )}

              {/* Execution Steps */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Execution Steps
                </h4>
                <div className="space-y-2">
                  {routeData.execution_steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="text-purple-400 font-semibold">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!routeData.should_use_bridge && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Direct on-chain transfer may be cheaper for this amount
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="bg-white/5 border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecute}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Execute Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}