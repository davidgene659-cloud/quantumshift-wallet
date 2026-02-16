import React, { useState } from 'react';
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const availableMetrics = [
  { id: 'total_value', label: 'Total Portfolio Value', icon: '💰' },
  { id: '24h_change', label: '24h Change', icon: '📈' },
  { id: 'top_performers', label: 'Top Performers', icon: '🏆' },
  { id: 'portfolio_chart', label: 'Portfolio Chart', icon: '📊' },
  { id: 'asset_allocation', label: 'Asset Allocation', icon: '🥧' },
  { id: 'recent_transactions', label: 'Recent Transactions', icon: '💸' },
];

export default function DashboardCustomizer({ isOpen, onClose, userId }) {
  const queryClient = useQueryClient();

  const { data: preferences } = useQuery({
    queryKey: ['dashboardPreferences', userId],
    queryFn: async () => {
      const prefs = await base44.entities.DashboardPreferences.filter({ user_id: userId });
      return prefs[0] || { 
        visible_metrics: ['total_value', '24h_change', 'top_performers', 'portfolio_chart'],
        chart_timeframe: '30d',
        sort_assets_by: 'value'
      };
    },
    enabled: !!userId,
  });

  const [localMetrics, setLocalMetrics] = useState(preferences?.visible_metrics || []);
  const [timeframe, setTimeframe] = useState(preferences?.chart_timeframe || '30d');
  const [sortBy, setSortBy] = useState(preferences?.sort_assets_by || 'value');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (preferences?.id) {
        return await base44.entities.DashboardPreferences.update(preferences.id, data);
      }
      return await base44.entities.DashboardPreferences.create({ ...data, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboardPreferences', userId]);
      onClose();
    },
  });

  const toggleMetric = (metricId) => {
    setLocalMetrics(prev => 
      prev.includes(metricId) ? prev.filter(m => m !== metricId) : [...prev, metricId]
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      visible_metrics: localMetrics,
      chart_timeframe: timeframe,
      sort_assets_by: sortBy,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Customize Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Visible Metrics */}
          <div>
            <h3 className="text-white font-semibold mb-3">Visible Metrics</h3>
            <div className="space-y-2">
              {availableMetrics.map(metric => (
                <div key={metric.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-white/30" />
                    <span className="text-2xl">{metric.icon}</span>
                    <span className="text-white">{metric.label}</span>
                  </div>
                  <Switch
                    checked={localMetrics.includes(metric.id)}
                    onCheckedChange={() => toggleMetric(metric.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Chart Timeframe */}
          <div>
            <Label className="text-white mb-2 block">Default Chart Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Assets */}
          <div>
            <Label className="text-white mb-2 block">Sort Assets By</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">USD Value</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="change">24h Change</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}