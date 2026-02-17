import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingDown, Zap, Clock, RefreshCw } from 'lucide-react';

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20'
  },
  medium: {
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  low: {
    icon: TrendingDown,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  }
};

export default function MarketAlerts() {
  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['marketAlerts'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getMarketAlerts', {});
      return response.data;
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000
  });

  const alerts = alertsData?.alerts || [];
  const summary = alertsData?.recommendations_summary;

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Market Alerts
            </CardTitle>
            <p className="text-white/50 text-sm mt-1">
              Real-time opportunities and notifications
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-white/5 border-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Badges */}
        {summary && (
          <div className="flex flex-wrap gap-2 pb-3 border-b border-white/10">
            {summary.high_priority > 0 && (
              <Badge className="bg-red-500/20 text-red-400">
                {summary.high_priority} High Priority
              </Badge>
            )}
            {summary.savings_opportunities > 0 && (
              <Badge className="bg-green-500/20 text-green-400">
                {summary.savings_opportunities} Savings Available
              </Badge>
            )}
            {summary.optimization_available > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400">
                {summary.optimization_available} Optimizations
              </Badge>
            )}
          </div>
        )}

        {/* Alerts List */}
        {isLoading ? (
          <div className="text-center py-8 text-white/50">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Checking market conditions...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/50">No alerts at the moment</p>
            <p className="text-white/30 text-sm mt-1">Everything looks optimal!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-white font-semibold">{alert.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {alert.chain}
                        </Badge>
                      </div>
                      <p className="text-white/70 text-sm mb-2">{alert.message}</p>
                      <div className="bg-white/5 rounded-lg p-2 mb-2">
                        <p className="text-white/60 text-xs">
                          💡 <span className="text-white/90">{alert.recommendation}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {alert.urgency} urgency
                        </span>
                        <span>Impact: {alert.impact.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Last Updated */}
        {alertsData?.checked_at && (
          <p className="text-white/30 text-xs text-center pt-2">
            Last checked: {new Date(alertsData.checked_at).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}