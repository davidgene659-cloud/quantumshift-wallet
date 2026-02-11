import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, ExternalLink, Sparkles, CheckCircle2, AlertCircle, Settings, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSelect } from '@/components/ui/mobile-select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function HuggingFaceIntegration() {
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [showFineTuning, setShowFineTuning] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch AI Profile
  const { data: profiles = [] } = useQuery({
    queryKey: ['aiProfiles'],
    queryFn: () => base44.entities.AIProfile.list(),
  });

  const activeProfile = profiles[0];
  const connected = !!activeProfile;

  // Fine-tuning state
  const [activeTasks, setActiveTasks] = useState(activeProfile?.active_tasks || []);
  const [tradingStyle, setTradingStyle] = useState(activeProfile?.fine_tuning_config?.trading_style || 'balanced');
  const [artStyles, setArtStyles] = useState(activeProfile?.fine_tuning_config?.art_style_preferences || []);
  const [riskTolerance, setRiskTolerance] = useState(activeProfile?.fine_tuning_config?.risk_tolerance || 5);
  const [customInstructions, setCustomInstructions] = useState(activeProfile?.fine_tuning_config?.custom_instructions || '');

  useEffect(() => {
    if (activeProfile) {
      setActiveTasks(activeProfile.active_tasks || []);
      setTradingStyle(activeProfile.fine_tuning_config?.trading_style || 'balanced');
      setArtStyles(activeProfile.fine_tuning_config?.art_style_preferences || []);
      setRiskTolerance(activeProfile.fine_tuning_config?.risk_tolerance || 5);
      setCustomInstructions(activeProfile.fine_tuning_config?.custom_instructions || '');
      setModelId(activeProfile.model_id);
    }
  }, [activeProfile]);

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.AIProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProfiles'] });
      setShowFineTuning(true);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AIProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProfiles'] });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.AIProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProfiles'] });
      setShowFineTuning(false);
    },
  });

  const handleConnect = async () => {
    setTesting(true);
    // Simulate connection test
    setTimeout(async () => {
      await createProfileMutation.mutateAsync({
        model_id: modelId,
        api_token_encrypted: apiKey,
        active_tasks: [],
        fine_tuning_config: {
          trading_style: 'balanced',
          art_style_preferences: [],
          risk_tolerance: 5,
          preferred_chains: [],
          custom_instructions: ''
        },
        performance_metrics: {
          total_requests: 0,
          successful_trades: 0,
          art_pieces_generated: 0,
          average_response_time: 0
        },
        is_active: true,
        last_synced: new Date().toISOString()
      });
      setTesting(false);
    }, 2000);
  };

  const handleDisconnect = async () => {
    if (activeProfile) {
      await deleteProfileMutation.mutateAsync(activeProfile.id);
    }
  };

  const handleSaveConfig = async () => {
    if (!activeProfile) return;
    
    await updateProfileMutation.mutateAsync({
      id: activeProfile.id,
      data: {
        active_tasks: activeTasks,
        fine_tuning_config: {
          trading_style: tradingStyle,
          art_style_preferences: artStyles,
          risk_tolerance: riskTolerance,
          preferred_chains: activeProfile.fine_tuning_config?.preferred_chains || [],
          custom_instructions: customInstructions
        },
        last_synced: new Date().toISOString()
      }
    });
  };

  const toggleTask = (task) => {
    setActiveTasks(prev => 
      prev.includes(task) 
        ? prev.filter(t => t !== task)
        : [...prev, task]
    );
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
        ) : !showFineTuning ? (
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-400 font-medium">Model Connected</p>
              </div>
              <p className="text-white/70 text-sm mb-1">Model: {modelId}</p>
              <p className="text-white/50 text-xs">Your personal AI is now integrated into the wallet AI system</p>
            </div>

            {activeProfile?.performance_metrics && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/50 text-xs mb-1">Total Requests</p>
                  <p className="text-white font-bold text-lg">{activeProfile.performance_metrics.total_requests}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/50 text-xs mb-1">Art Generated</p>
                  <p className="text-white font-bold text-lg">{activeProfile.performance_metrics.art_pieces_generated}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={() => setShowFineTuning(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Settings className="w-4 h-4 mr-2" />
                Fine-Tune Model
              </Button>
              
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
              >
                Disconnect Model
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="art">NFT Art</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4 mt-4">
              <div>
                <label className="text-white text-sm font-medium mb-3 block">Active AI Tasks</label>
                <div className="space-y-2">
                  {[
                    { id: 'trading_strategies', label: 'Trading Strategy Generation', icon: TrendingUp },
                    { id: 'nft_art_generation', label: 'NFT Art Style Emulation', icon: ImageIcon },
                    { id: 'portfolio_analysis', label: 'Portfolio Analysis', icon: Bot },
                    { id: 'risk_assessment', label: 'Risk Assessment', icon: CheckCircle2 }
                  ].map(task => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 ${
                        activeTasks.includes(task.id)
                          ? 'bg-purple-500/20 border-purple-500/50 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <task.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{task.label}</span>
                      {activeTasks.includes(task.id) && (
                        <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trading" className="space-y-4 mt-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Trading Style</label>
                <MobileSelect
                  value={tradingStyle}
                  onValueChange={setTradingStyle}
                  options={[
                    { value: 'conservative', label: 'Conservative' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'aggressive', label: 'Aggressive' },
                    { value: 'custom', label: 'Custom' }
                  ]}
                  placeholder="Select trading style"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-3 block">
                  Risk Tolerance: {riskTolerance}/10
                </label>
                <Slider
                  value={[riskTolerance]}
                  onValueChange={(val) => setRiskTolerance(val[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/50 mt-2">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Custom Instructions</label>
                <Textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Focus on DeFi protocols with proven track records, avoid high-risk leveraged positions..."
                  className="bg-white/5 border-white/10 text-white h-24"
                />
              </div>
            </TabsContent>

            <TabsContent value="art" className="space-y-4 mt-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Preferred Art Styles</label>
                <Input
                  placeholder="e.g., cyberpunk, abstract, minimalist"
                  className="bg-white/5 border-white/10 text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      setArtStyles([...artStyles, e.target.value.trim()]);
                      e.target.value = '';
                    }
                  }}
                />
                <p className="text-white/50 text-xs mt-1">Press Enter to add</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {artStyles.map((style, idx) => (
                  <Badge
                    key={idx}
                    className="bg-purple-500/20 text-purple-300 border-purple-500/50 cursor-pointer hover:bg-red-500/20"
                    onClick={() => setArtStyles(artStyles.filter((_, i) => i !== idx))}
                  >
                    {style} ×
                  </Badge>
                ))}
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-400 text-sm font-medium mb-1">🎨 Art Generation</p>
                <p className="text-white/70 text-xs">
                  Your model will learn from these styles to generate unique NFT artwork that matches your aesthetic preferences.
                </p>
              </div>
            </TabsContent>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setShowFineTuning(false)}
                variant="outline"
                className="flex-1 border-white/10 text-white/70"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                disabled={updateProfileMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}