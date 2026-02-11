import React, { useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSelect } from '@/components/ui/mobile-select';

export default function PerformanceAlerts({ timeRange }) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'portfolio', condition: 'drops_below', value: '10000', active: true },
    { id: 2, type: 'bot_profit', condition: 'exceeds', value: '1000', active: true },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-yellow-400" />
          Performance Alerts
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-white/10 hover:bg-white/20"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-white/5 rounded-xl space-y-3">
          <MobileSelect
            options={[
              { value: 'portfolio', label: 'Portfolio Value' },
              { value: 'bot_profit', label: 'Bot Profit' },
              { value: 'mining_hashrate', label: 'Mining Hashrate' }
            ]}
            placeholder="Select metric"
          />

          <div className="flex gap-2">
            <MobileSelect
              options={[
                { value: 'exceeds', label: 'Exceeds' },
                { value: 'drops_below', label: 'Drops Below' }
              ]}
              placeholder="Condition"
            />
            <Input
              placeholder="Value"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
            Create Alert
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex-1">
              <p className="text-white text-sm">
                {alert.type.replace('_', ' ')} {alert.condition.replace('_', ' ')} ${alert.value}
              </p>
            </div>
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}