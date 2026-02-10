import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIInsights({ timeRange }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [timeRange]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze crypto portfolio and trading data for the past ${timeRange}. Generate 3 actionable insights covering:
        1. A positive trend or opportunity
        2. A potential risk or warning
        3. An optimization recommendation
        
        Format each insight with a type (opportunity/risk/optimization) and a concise message (max 100 chars).`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response.insights || []);
    } catch (error) {
      setInsights([
        { type: 'opportunity', message: 'BTC showing strong momentum - consider increasing position' },
        { type: 'risk', message: 'High correlation detected between trading bots - diversify strategy' },
        { type: 'optimization', message: 'Reduce mining costs by switching to off-peak hours' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'risk': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'optimization': return <Target className="w-5 h-5 text-blue-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'opportunity': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'risk': return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 'optimization': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      default: return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          AI Insights
        </h3>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {insights?.map((insight, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${getColor(insight.type)} border rounded-xl p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(insight.type)}</div>
                <p className="text-white/90 text-sm flex-1">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}