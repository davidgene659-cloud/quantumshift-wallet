import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { notificationManager } from './NotificationManager';

export default function NotificationSettings({ user }) {
  const queryClient = useQueryClient();
  const [newAsset, setNewAsset] = useState('BTC');
  const [newChangePercent, setNewChangePercent] = useState('5');
  const [newDirection, setNewDirection] = useState('both');
  const [newType, setNewType] = useState('both');

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.NotificationPreference.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const permitted = await notificationManager.requestPermission();
      return base44.entities.NotificationPreference.create({
        user_id: user.id,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Notification preference added');
      setNewAsset('BTC');
      setNewChangePercent('5');
      setNewDirection('both');
      setNewType('both');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationPreference.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preference updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationPreference.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preference removed');
    }
  });

  const handleAddPreference = () => {
    if (!newAsset) {
      toast.error('Please select an asset');
      return;
    }
    createMutation.mutate({
      asset_symbol: newAsset,
      price_change_percent: parseFloat(newChangePercent),
      direction: newDirection,
      notification_type: newType,
      push_enabled: true,
      in_app_enabled: true
    });
  };

  const assets = ['BTC', 'ETH', 'SOL', 'ADA', 'USDT', 'USDC', 'BNB', 'DOGE', 'MATIC', 'LINK', 'AVAX', 'DOT'];

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">Notification Preferences</h3>
        </div>

        {/* Add New Preference */}
        <div className="space-y-4 mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-semibold">Add New Alert</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/70">Asset</Label>
              <Select value={newAsset} onValueChange={setNewAsset}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  {assets.map(asset => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Price Change %</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={newChangePercent}
                onChange={(e) => setNewChangePercent(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-2"
                placeholder="5"
              />
            </div>

            <div>
              <Label className="text-white/70">Direction</Label>
              <Select value={newDirection} onValueChange={setNewDirection}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="up">Price Up ↑</SelectItem>
                  <SelectItem value="down">Price Down ↓</SelectItem>
                  <SelectItem value="both">Both Directions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Alert Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="price_movement">Price Movement</SelectItem>
                  <SelectItem value="transaction_status">Transaction Status</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAddPreference}
            disabled={createMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            {createMutation.isPending ? 'Adding...' : 'Add Alert'}
          </Button>
        </div>

        {/* Active Preferences */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold">Active Alerts</h4>
          {preferences.length === 0 ? (
            <p className="text-white/50 text-sm">No alerts configured yet</p>
          ) : (
            preferences.map(pref => (
              <div key={pref.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white">{pref.asset_symbol}</span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                      {pref.price_change_percent}% {pref.direction === 'both' ? '↕️' : pref.direction === 'up' ? '↑' : '↓'}
                    </span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {pref.notification_type === 'both' ? 'All' : pref.notification_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-white/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.push_enabled}
                        onChange={(e) => updateMutation.mutate({ id: pref.id, push_enabled: e.target.checked })}
                        className="w-3 h-3 rounded"
                      />
                      Push
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.in_app_enabled}
                        onChange={(e) => updateMutation.mutate({ id: pref.id, in_app_enabled: e.target.checked })}
                        className="w-3 h-3 rounded"
                      />
                      In-App
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.enabled}
                        onChange={(e) => updateMutation.mutate({ id: pref.id, enabled: e.target.checked })}
                        className="w-3 h-3 rounded"
                      />
                      Enabled
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(pref.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}