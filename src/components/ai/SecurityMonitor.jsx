import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SecurityMonitor() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['securityAlerts'],
    queryFn: () => base44.entities.SecurityAlert.list('-created_date'),
    initialData: [],
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (id) => base44.entities.SecurityAlert.update(id, { status: 'dismissed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['securityAlerts'] }),
  });

  const runSecurityScan = async () => {
    setIsScanning(true);
    
    // Simulate AI scanning
    setTimeout(async () => {
      const mockAlerts = [
        {
          alert_type: 'suspicious_dapp',
          severity: 'medium',
          title: 'Unusual DApp Connection Detected',
          description: 'A newly connected DApp is requesting excessive permissions',
          recommended_action: 'Review and revoke permissions if not needed'
        }
      ];

      // In production, this would call an AI service
      // const result = await base44.integrations.Core.InvokeLLM({
      //   prompt: "Analyze wallet security posture and identify potential vulnerabilities",
      //   response_json_schema: { type: "object", properties: { alerts: { type: "array" } } }
      // });

      setIsScanning(false);
    }, 2000);
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const severityColors = {
    low: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    high: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    critical: 'bg-red-500/20 border-red-500/50 text-red-400'
  };

  return (
    <Card className="bg-gradient-to-br from-gray-900/50 to-purple-900/30 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">AI Security Monitor</CardTitle>
              <p className="text-white/60 text-sm">Real-time threat detection</p>
            </div>
          </div>
          <Button
            onClick={runSecurityScan}
            disabled={isScanning}
            className="bg-purple-500 hover:bg-purple-600"
            size="sm"
          >
            {isScanning ? (
              <>
                <Activity className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Scan Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">All Clear!</p>
            <p className="text-white/60 text-sm">No security threats detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${severityColors[alert.severity]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-bold">{alert.title}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlertMutation.mutate(alert.id)}
                    className="text-white/60 hover:text-white"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm mb-2 opacity-90">{alert.description}</p>
                <p className="text-xs opacity-75">
                  <strong>Action:</strong> {alert.recommended_action}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}