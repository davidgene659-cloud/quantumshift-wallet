import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, AlertTriangle, Target, Zap, Settings, Download, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import MobileSelect from '@/components/ui/mobile-select';
import PortfolioPerformance from '@/components/analytics/PortfolioPerformance';
import TradingStats from '@/components/analytics/TradingStats';
import MiningMetrics from '@/components/analytics/MiningMetrics';
import DAppActivity from '@/components/analytics/DAppActivity';
import AIInsights from '@/components/analytics/AIInsights';
import PerformanceAlerts from '@/components/analytics/PerformanceAlerts';

const availableWidgets = [
  { id: 'portfolio', name: 'Portfolio Performance', component: PortfolioPerformance },
  { id: 'trading', name: 'Trading Statistics', component: TradingStats },
  { id: 'mining', name: 'Mining Metrics', component: MiningMetrics },
  { id: 'dapps', name: 'DApp Activity', component: DAppActivity },
  { id: 'insights', name: 'AI Insights', component: AIInsights },
  { id: 'alerts', name: 'Performance Alerts', component: PerformanceAlerts },
];

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState([
    'portfolio', 'trading', 'mining', 'insights'
  ]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    const saved = localStorage.getItem('analytics_widgets');
    if (saved) {
      setActiveWidgets(JSON.parse(saved));
    }
  }, []);

  const saveWidgetConfig = (widgets) => {
    setActiveWidgets(widgets);
    localStorage.setItem('analytics_widgets', JSON.stringify(widgets));
  };

  const toggleWidget = (widgetId) => {
    const newWidgets = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(id => id !== widgetId)
      : [...activeWidgets, widgetId];
    saveWidgetConfig(newWidgets);
  };

  const exportData = async () => {
    // Export analytics data as CSV
    const data = {
      exported_at: new Date().toISOString(),
      time_range: timeRange,
      user: user?.email,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${Date.now()}.json`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              Analytics Dashboard
            </h1>
            <p className="text-white/50 mt-1">Track performance and discover opportunities</p>
          </div>
          
          <div className="flex items-center gap-3">
            <MobileSelect
              value={timeRange}
              onValueChange={setTimeRange}
              options={[
                { value: '24h', label: '24 Hours' },
                { value: '7d', label: '7 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
                { value: '1y', label: '1 Year' }
              ]}
              placeholder="Time Range"
              className="w-32"
            />
            
            <Button
              onClick={exportData}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => setShowWidgetSelector(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Settings className="w-4 h-4 mr-2" />
              Customize
            </Button>
          </div>
        </motion.div>

        {/* Widgets Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {activeWidgets.map((widgetId, index) => {
            const widget = availableWidgets.find(w => w.id === widgetId);
            if (!widget) return null;
            
            const WidgetComponent = widget.component;
            
            return (
              <motion.div
                key={widgetId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <WidgetComponent timeRange={timeRange} />
              </motion.div>
            );
          })}
        </div>

        {activeWidgets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Sparkles className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/50 mb-4">No widgets selected</p>
            <Button
              onClick={() => setShowWidgetSelector(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Widgets
            </Button>
          </motion.div>
        )}

        {/* Widget Selector Dialog */}
        <Dialog open={showWidgetSelector} onOpenChange={setShowWidgetSelector}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Dashboard</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-2">
              {availableWidgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                    activeWidgets.includes(widget.id)
                      ? 'bg-purple-500/20 border-2 border-purple-500'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>{widget.name}</span>
                  {activeWidgets.includes(widget.id) && (
                    <Zap className="w-4 h-4 text-purple-400" />
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}