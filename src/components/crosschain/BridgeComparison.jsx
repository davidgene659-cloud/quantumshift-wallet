import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Zap, Clock, Shield, TrendingDown, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const chains = [
  { value: 'ethereum', label: 'Ethereum', color: 'from-indigo-500 to-purple-600' },
  { value: 'polygon', label: 'Polygon', color: 'from-violet-500 to-purple-600' },
  { value: 'bsc', label: 'BSC', color: 'from-yellow-500 to-orange-500' },
  { value: 'arbitrum', label: 'Arbitrum', color: 'from-blue-500 to-cyan-500' },
  { value: 'optimism', label: 'Optimism', color: 'from-red-500 to-pink-500' },
  { value: 'avalanche', label: 'Avalanche', color: 'from-red-600 to-rose-700' }
];

export default function BridgeComparison() {
  const [fromChain, setFromChain] = useState('ethereum');
  const [toChain, setToChain] = useState('polygon');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('1000');

  const { data: comparison, isLoading, refetch } = useQuery({
    queryKey: ['bridgeComparison', fromChain, toChain, token, amount],
    queryFn: async () => {
      const response = await base44.functions.invoke('compareBridgeCosts', {
        from_chain: fromChain,
        to_chain: toChain,
        token: token,
        amount: parseFloat(amount)
      });
      return response.data;
    },
    enabled: fromChain !== toChain && parseFloat(amount) > 0,
    staleTime: 60000
  });

  const handleCompare = () => {
    if (fromChain !== toChain && parseFloat(amount) > 0) {
      refetch();
    }
  };

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Cross-Chain Cost Analyzer
        </CardTitle>
        <p className="text-white/50 text-sm">Compare bridge providers and find the best route</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/70 text-sm mb-2 block">From Chain</label>
            <Select value={fromChain} onValueChange={setFromChain}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chains.map(chain => (
                  <SelectItem key={chain.value} value={chain.value}>
                    {chain.label}
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
                  <SelectItem key={chain.value} value={chain.value}>
                    {chain.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-white/70 text-sm mb-2 block">Token</label>
            <Input 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="USDC"
            />
          </div>
          <div>
            <label className="text-white/70 text-sm mb-2 block">Amount</label>
            <Input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="1000"
            />
          </div>
        </div>

        <Button 
          onClick={handleCompare}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          disabled={isLoading || fromChain === toChain}
        >
          {isLoading ? 'Analyzing...' : 'Compare Routes'}
        </Button>

        {/* Results Section */}
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-6"
          >
            {/* Native Option */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">Native Chain (Direct)</h3>
                <Badge className="bg-blue-500/20 text-blue-400">Current Chain</Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-white/50">Cost</p>
                  <p className="text-white font-semibold">${comparison.native_chain_option.total_cost_usd.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/50">Time</p>
                  <p className="text-white font-semibold">{comparison.native_chain_option.estimated_time_minutes} min</p>
                </div>
                <div>
                  <p className="text-white/50">Reliability</p>
                  <p className="text-white font-semibold">{comparison.native_chain_option.reliability_score}%</p>
                </div>
              </div>
            </div>

            {/* Bridge Options */}
            {comparison.bridge_options.map((bridge, index) => (
              <motion.div
                key={bridge.bridge_name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/5 rounded-xl p-4 border ${
                  index === 0 ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{bridge.bridge_name}</h3>
                    {index === 0 && (
                      <Badge className="bg-green-500/20 text-green-400">Recommended</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white/50" />
                    <span className="text-white/70 text-sm">{bridge.security_audits.length} audits</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-white/50 text-xs">Total Cost</p>
                    <p className="text-white font-semibold">${bridge.total_cost_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Time
                    </p>
                    <p className="text-white font-semibold">{bridge.estimated_time_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Reliability</p>
                    <p className="text-white font-semibold">{bridge.reliability_score}%</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Liquidity</p>
                    <Badge variant="outline" className="text-xs">
                      {bridge.liquidity_depth}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="text-white/50">
                    Bridge: ${bridge.breakdown.bridge_fee_usd.toFixed(2)} + 
                    Gas: ${(bridge.breakdown.source_gas_usd + bridge.breakdown.dest_gas_usd).toFixed(2)}
                  </div>
                  {comparison.native_chain_option.total_cost_usd > bridge.total_cost_usd && (
                    <div className="flex items-center gap-1 text-green-400">
                      <TrendingDown className="w-4 h-4" />
                      <span>Save {((comparison.native_chain_option.total_cost_usd - bridge.total_cost_usd) / comparison.native_chain_option.total_cost_usd * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Recommendation Banner */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Smart Recommendation</h4>
                  <p className="text-white/70 text-sm">{comparison.recommendation}</p>
                  {comparison.savings.amount_usd > 0 && (
                    <p className="text-green-400 text-sm mt-2 font-medium">
                      💰 Potential savings: ${comparison.savings.amount_usd.toFixed(2)} ({comparison.savings.percent.toFixed(0)}%)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {fromChain === toChain && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-white/70 text-sm">Please select different chains to compare bridge routes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}