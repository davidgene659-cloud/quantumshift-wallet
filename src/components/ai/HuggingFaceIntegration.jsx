import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, ExternalLink, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function HuggingFaceIntegration() {
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleConnect = async () => {
    setTesting(true);
    // Simulate connection test
    setTimeout(() => {
      setConnected(true);
      setTesting(false);
    }, 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Personal AI Model (Beta)
          </CardTitle>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
            BETA ONLY
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-400 text-sm font-medium mb-1">⚠️ Beta Feature</p>
          <p className="text-white/70 text-xs">
            This feature is available in beta wallet only and will not be included in production releases.
          </p>
        </div>

        {!connected ? (
          <div className="space-y-3">
            <div>
              <label className="text-white/70 text-sm mb-2 block">Hugging Face Model ID</label>
              <Input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g., meta-llama/Llama-2-7b-chat"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm mb-2 block">API Token</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="hf_..."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={!modelId || !apiKey || testing}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            >
              {testing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Model
                </>
              )}
            </Button>

            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 text-sm hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              Get API Token from Hugging Face
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-400 font-medium">Model Connected</p>
              </div>
              <p className="text-white/70 text-sm mb-1">Model: {modelId}</p>
              <p className="text-white/50 text-xs">Your personal AI is now integrated into the wallet AI system</p>
            </div>

            <div className="space-y-2 text-white/70 text-sm">
              <p className="font-medium text-white">Your model can:</p>
              <ul className="space-y-1 ml-4">
                <li>• Provide personalized DeFi strategy recommendations</li>
                <li>• Answer questions based on your trading history</li>
                <li>• Analyze your portfolio with custom insights</li>
                <li>• Generate custom trading alerts</li>
              </ul>
            </div>

            <Button
              onClick={() => setConnected(false)}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Disconnect Model
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}