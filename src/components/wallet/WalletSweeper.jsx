import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Clock, TrendingDown, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function WalletSweeper() {
  const [targetWallet, setTargetWallet] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sweepPlan, setSweepPlan] = useState(null);

  const { data: wallets } = useQuery({
    queryKey: ['importedWallets'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return await base44.entities.ImportedWallet.filter({
        user_id: user.id,
        is_active: true
      });
    }
  });

  const handlePlanSweep = async () => {
    if (!targetWallet) return;

    try {
      const response = await base44.functions.invoke('planWalletSweep', {
        target_wallet_id: targetWallet,
        min_balance_threshold: 0.01
      });
      
      setSweepPlan(response.data);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Failed to plan sweep:', error);
    }
  };

  const handleExecuteSweep = async () => {
    // This would call the actual sweep execution function
    alert('Sweep execution will be implemented with transaction signing');
    setShowConfirmation(false);
  };

  return (
    <>
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-purple-400" />
            Wallet Consolidation
          </CardTitle>
          <p className="text-white/50 text-sm">Sweep funds from multiple wallets into one</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white/70 text-sm mb-2 block">Target Wallet (Destination)</label>
            <Select value={targetWallet} onValueChange={setTargetWallet}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select destination wallet" />
              </SelectTrigger>
              <SelectContent>
                {wallets?.map(wallet => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.label || wallet.address.slice(0, 12)}... ({wallet.blockchain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handlePlanSweep}
            disabled={!targetWallet}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Plan Consolidation
          </Button>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
            <p className="text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              This will analyze all your wallets and suggest optimal consolidation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-gray-900 border-white/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Wallet Consolidation</DialogTitle>
          </DialogHeader>

          {sweepPlan && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/50">Wallets to Sweep</p>
                    <p className="text-white font-semibold">{sweepPlan.summary.total_wallets_to_sweep}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Total Value</p>
                    <p className="text-white font-semibold">${sweepPlan.summary.total_value_to_sweep_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Estimated Fees</p>
                    <p className="text-red-400 font-semibold">-${sweepPlan.summary.total_estimated_fees_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Net Received</p>
                    <p className="text-green-400 font-semibold">${sweepPlan.summary.net_value_received_usd.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Efficiency</span>
                    <Badge className={sweepPlan.summary.efficiency_percent > 95 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                      {sweepPlan.summary.efficiency_percent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Timing Recommendation */}
              {sweepPlan.timing_recommendation && (
                <div className={`rounded-lg p-4 ${sweepPlan.timing_recommendation.execute_now ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-white" />
                    <h4 className="text-white font-semibold">Timing Recommendation</h4>
                  </div>
                  {sweepPlan.timing_recommendation.execute_now ? (
                    <p className="text-green-300 text-sm">✓ Current time is optimal for execution</p>
                  ) : (
                    <p className="text-yellow-300 text-sm">
                      ⏰ Consider waiting {sweepPlan.timing_recommendation.wait_hours}h to save ~{sweepPlan.timing_recommendation.potential_savings_percent.toFixed(0)}%
                    </p>
                  )}
                </div>
              )}

              {/* Cross-Chain Opportunities */}
              {sweepPlan.cross_chain_opportunities?.length > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Cross-Chain Savings Available</h4>
                  {sweepPlan.cross_chain_opportunities.map((opp, i) => (
                    <p key={i} className="text-purple-300 text-sm">
                      • Bridge from {opp.from_chain} → {opp.to_chain}: Save {opp.savings_percent.toFixed(0)}% via {opp.recommended_bridge}
                    </p>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {sweepPlan.warnings?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <h4 className="text-red-400 font-semibold">Warnings</h4>
                  </div>
                  {sweepPlan.warnings.map((warning, i) => (
                    <p key={i} className="text-red-300 text-sm">• {warning}</p>
                  ))}
                </div>
              )}

              {/* Transaction List */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Transactions ({sweepPlan.sweep_plan.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sweepPlan.sweep_plan.map((tx, i) => (
                    <div key={i} className="bg-white/5 rounded p-3 text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{tx.blockchain}</Badge>
                        <span className="text-white/50">{tx.address.slice(0, 12)}...</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">
                          {tx.amount_to_sweep.toFixed(tx.symbol === 'BTC' ? 8 : 4)} {tx.symbol}
                        </span>
                        <ArrowRight className="w-4 h-4 text-white/30" />
                        <span className="text-green-400 font-semibold">
                          ${tx.value_to_sweep_usd.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-white/40 text-xs mt-1">
                        Fee: ${tx.fee_usd.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="bg-white/5 border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExecuteSweep}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={sweepPlan?.warnings?.length > 0}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Execute Consolidation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}