import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Shield, AlertCircle, CheckCircle2, Activity, MessageSquare } from 'lucide-react';

export default function BalanceGuardianWidget({ totalValue, tokens, allWalletBalances, allTokenBalances }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      // Create or get conversation
      let convId = conversationId;
      if (!convId) {
        const conv = await base44.agents.createConversation({
          agent_name: 'balance_guardian',
          metadata: {
            name: 'Balance Analysis',
            description: 'Real-time balance verification'
          }
        });
        convId = conv.id;
        setConversationId(convId);
      }

      // Prepare diagnostic data
      const diagnosticData = {
        total_value: totalValue,
        native_wallets: allWalletBalances?.wallets?.length || 0,
        token_balances: allTokenBalances?.tokens?.length || 0,
        aggregated_tokens: tokens.length,
        zero_price_tokens: tokens.filter(t => !t.price || t.price === 0).map(t => t.symbol),
        wallets_with_errors: allWalletBalances?.wallets?.filter(w => w.error).length || 0
      };

      // Send to agent
      const conv = await base44.agents.getConversation(convId);
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Analyze my current balance state:\n\nTotal displayed: $${totalValue.toFixed(2)}\nNative wallets fetched: ${diagnosticData.native_wallets}\nToken balances fetched: ${diagnosticData.token_balances}\nAggregated tokens shown: ${diagnosticData.aggregated_tokens}\n\nTokens with zero/missing prices: ${diagnosticData.zero_price_tokens.join(', ') || 'none'}\n\nPlease verify:\n1. Are all balances loading correctly?\n2. Are prices being fetched properly?\n3. Is the total USD value calculation accurate?\n4. Any discrepancies or issues?\n5. Recommendations to fix?`
      });

      // Get response
      const updatedConv = await base44.agents.getConversation(convId);
      const lastMessage = updatedConv.messages[updatedConv.messages.length - 1];
      
      setAnalysis(lastMessage.content);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis('Failed to analyze balances. Please try again.');
    }
    setLoading(false);
  };

  const openChat = () => {
    const whatsappUrl = base44.agents.getWhatsAppConnectURL('balance_guardian');
    window.open(whatsappUrl, '_blank');
  };

  // Quick health check
  const zeroTokens = tokens.filter(t => !t.price || t.price === 0).length;
  const healthStatus = zeroTokens === 0 ? 'healthy' : zeroTokens < 3 ? 'warning' : 'critical';

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Balance Guardian
          </CardTitle>
          <Badge className={
            healthStatus === 'healthy' ? 'bg-green-500/20 text-green-400' :
            healthStatus === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }>
            {healthStatus === 'healthy' && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {healthStatus === 'warning' && <AlertCircle className="w-3 h-3 mr-1" />}
            {healthStatus === 'critical' && <AlertCircle className="w-3 h-3 mr-1" />}
            {healthStatus === 'healthy' ? 'All Clear' : healthStatus === 'warning' ? 'Check Needed' : 'Issues Detected'}
          </Badge>
        </div>
        <p className="text-white/50 text-sm">AI-powered balance verification & diagnostics</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white/5 rounded p-2 text-center">
            <p className="text-white/50">Total Value</p>
            <p className="text-white font-semibold">${totalValue.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 rounded p-2 text-center">
            <p className="text-white/50">Assets</p>
            <p className="text-white font-semibold">{tokens.length}</p>
          </div>
          <div className="bg-white/5 rounded p-2 text-center">
            <p className="text-white/50">Issues</p>
            <p className={`font-semibold ${zeroTokens > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {zeroTokens}
            </p>
          </div>
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="bg-white/5 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h4 className="text-white font-semibold">Analysis</h4>
            </div>
            <p className="text-white/70 whitespace-pre-wrap">{analysis}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          >
            {loading ? 'Analyzing...' : 'Run Diagnostic'}
          </Button>
          <Button
            onClick={openChat}
            variant="outline"
            className="bg-white/5 border-white/10"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-white/40 text-center">
          Powered by Balance Guardian AI • Monitors 24/7
        </div>
      </CardContent>
    </Card>
  );
}