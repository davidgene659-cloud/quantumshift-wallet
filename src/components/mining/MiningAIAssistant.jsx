import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Zap, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MiningAIAssistant({ miners, onApplyRecommendation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (miners.length > 0) {
      analyzeMiners();
    }
  }, [miners]);

  const analyzeMiners = async () => {
    setIsAnalyzing(true);
    try {
      const minerData = miners.map(m => `${m.coin}: ${m.hashrate} TH/s, ${m.status}, Total: ${m.total_mined}`).join(', ');
      
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a crypto mining AI analyst. Analyze these miners: ${minerData}

Current market conditions (Feb 2026):
- BTC price: $58,000, network difficulty: rising 3%/week, most profitable
- ETH price: $3,200, network difficulty: stable, good profitability
- LTC price: $95, network difficulty: low, moderate profitability
- DOGE price: $0.15, network difficulty: very low, decent for fun

Provide analysis in this JSON format:
{
  "top_recommendation": {"coin": "BTC", "reason": "brief reason", "expected_profit": "$X/day"},
  "hashpower_allocation": [{"coin": "BTC", "percentage": 60}, {"coin": "ETH", "percentage": 40}],
  "alerts": [{"type": "difficulty_change", "coin": "BTC", "message": "brief alert"}],
  "profitability_forecast": "brief 1-week forecast"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            top_recommendation: {
              type: "object",
              properties: {
                coin: { type: "string" },
                reason: { type: "string" },
                expected_profit: { type: "string" }
              }
            },
            hashpower_allocation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  coin: { type: "string" },
                  percentage: { type: "number" }
                }
              }
            },
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  coin: { type: "string" },
                  message: { type: "string" }
                }
              }
            },
            profitability_forecast: { type: "string" }
          }
        }
      });

      setRecommendations(analysis);
      setAlerts(analysis.alerts || []);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!miners.length) return null;

  return (
    <>
      {/* AI Assistant Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 flex items-center gap-3 hover:shadow-lg transition-all"
      >
        <Sparkles className="w-6 h-6 text-white" />
        <div className="text-left">
          <p className="text-white font-semibold">AI Mining Assistant</p>
          <p className="text-white/70 text-sm">Get optimization tips</p>
        </div>
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </motion.button>

      {/* AI Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">AI Mining Assistant</h3>
                    <p className="text-white/50 text-xs">Live market analysis</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                  <p className="text-white/70 text-sm">Analyzing market conditions...</p>
                </div>
              ) : recommendations ? (
                <>
                  {/* Alerts */}
                  {alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Alerts
                      </h4>
                      {alerts.map((alert, i) => (
                        <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                          <p className="text-amber-400 text-sm font-medium">{alert.coin}</p>
                          <p className="text-white/70 text-xs">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top Recommendation */}
                  <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-emerald-400 font-semibold">Top Pick</h4>
                    </div>
                    <p className="text-white font-bold text-lg mb-1">{recommendations.top_recommendation.coin}</p>
                    <p className="text-white/70 text-sm mb-2">{recommendations.top_recommendation.reason}</p>
                    <p className="text-emerald-400 text-sm">Expected: {recommendations.top_recommendation.expected_profit}</p>
                  </div>

                  {/* Hashpower Allocation */}
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-3">Optimal Allocation</h4>
                    <div className="space-y-2">
                      {recommendations.hashpower_allocation.map((alloc, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white">{alloc.coin}</span>
                            <span className="text-white/70">{alloc.percentage}%</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${alloc.percentage}%` }}
                              transition={{ delay: i * 0.1 }}
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forecast */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">7-Day Forecast</h4>
                    <p className="text-white/70 text-sm">{recommendations.profitability_forecast}</p>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={() => {
                      onApplyRecommendation(recommendations);
                      setIsOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Auto-Optimize Miners
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}