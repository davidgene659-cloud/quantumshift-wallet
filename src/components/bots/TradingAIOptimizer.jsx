import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, Settings, X, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function TradingAIOptimizer({ bots, onOptimize }) {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeStrategy = async () => {
    setIsAnalyzing(true);
    try {
      const botData = bots.map(b => `${b.bot_type}: ${b.status}, Profit: $${b.total_profit}, Trades: ${b.total_trades}, Win rate: ${b.total_trades > 0 ? ((b.total_profit / b.total_trades) * 100).toFixed(1) : 0}%`).join('; ');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI trading strategy optimizer. Analyze these bots: ${botData}

Market conditions (Feb 2026):
- Trend: Bull market, high volatility
- BTC/USDT: Strong uptrend, good for grid/arbitrage
- ETH/USDT: Consolidating, good for DCA
- Top pairs: BTC/USDT, ETH/USDT, SOL/USDT, BNB/USDT

Provide optimization in JSON:
{
  "strategy_recommendations": [
    {"bot_type": "arbitrage", "action": "increase|decrease|maintain", "reason": "brief reason", "new_pairs": ["BTC/USDT"]}
  ],
  "parameter_adjustments": [
    {"bot_type": "grid", "parameter": "min_profit_percent", "current": 0.5, "recommended": 0.8, "reason": "brief"}
  ],
  "market_insights": "brief market analysis",
  "expected_improvement": "+X% profit potential"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            strategy_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  bot_type: { type: "string" },
                  action: { type: "string" },
                  reason: { type: "string" },
                  new_pairs: { type: "array", items: { type: "string" } }
                }
              }
            },
            parameter_adjustments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  bot_type: { type: "string" },
                  parameter: { type: "string" },
                  current: { type: "number" },
                  recommended: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            market_insights: { type: "string" },
            expected_improvement: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error('AI optimization failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis && bots.length > 0) {
      analyzeStrategy();
    }
  }, [isOpen]);

  return (
    <>
      {/* Optimizer Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
      >
        <Brain className="w-4 h-4 mr-2" />
        AI Optimizer
      </Button>

      {/* Optimizer Panel */}
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
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">AI Strategy Optimizer</h3>
                    <p className="text-white/50 text-xs">Real-time market analysis</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                  <p className="text-white/70 text-sm">Analyzing strategies...</p>
                </div>
              ) : analysis ? (
                <>
                  {/* Expected Improvement */}
                  <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <Sparkles className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-bold text-lg">{analysis.expected_improvement}</p>
                    <p className="text-white/70 text-sm">With AI optimization</p>
                  </div>

                  {/* Market Insights */}
                  <div className="bg-white/5 rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Market Insights</h4>
                    <p className="text-white/70 text-sm">{analysis.market_insights}</p>
                  </div>

                  {/* Strategy Recommendations */}
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-3">Strategy Recommendations</h4>
                    <div className="space-y-3">
                      {analysis.strategy_recommendations.map((rec, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium capitalize">{rec.bot_type} Bot</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              rec.action === 'increase' ? 'bg-emerald-500/20 text-emerald-400' :
                              rec.action === 'decrease' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {rec.action}
                            </span>
                          </div>
                          <p className="text-white/70 text-xs mb-2">{rec.reason}</p>
                          {rec.new_pairs && rec.new_pairs.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {rec.new_pairs.map((pair, j) => (
                                <span key={j} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                  {pair}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parameter Adjustments */}
                  {analysis.parameter_adjustments && analysis.parameter_adjustments.length > 0 && (
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-3">Parameter Tuning</h4>
                      <div className="space-y-3">
                        {analysis.parameter_adjustments.map((adj, i) => (
                          <div key={i} className="bg-white/5 rounded-xl p-3">
                            <p className="text-white text-sm font-medium capitalize mb-1">
                              {adj.bot_type} - {adj.parameter.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white/50 text-xs">{adj.current}</span>
                              <div className="flex-1 h-px bg-white/20" />
                              <span className="text-emerald-400 text-xs font-bold">{adj.recommended}</span>
                            </div>
                            <p className="text-white/70 text-xs">{adj.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Button */}
                  <button
                    onClick={() => {
                      onOptimize(analysis);
                      setIsOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Apply Optimizations
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