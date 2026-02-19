import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import TransactionBuilder from './TransactionBuilder';

export default function SmartSendDialog({ isOpen, onClose, availableBalances }) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [showTxBuilder, setShowTxBuilder] = useState(false);
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen]);

  const loadWallets = async () => {
    try {
      const user = await base44.auth.me();
      const userWallets = await base44.entities.ImportedWallet.filter({ user_id: user.id, is_active: true });
      setWallets(userWallets);
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!amount || !recipientAddress) {
      toast.error('Please enter amount and recipient address');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Create conversation with wallet optimizer agent
      const conversation = await base44.agents.createConversation({
        agent_name: 'wallet_optimizer',
        metadata: {
          name: 'Smart Transaction Planning',
          description: 'Optimizing wallet selection for transaction'
        }
      });

      setConversationId(conversation.id);

      // Ask the agent to optimize with enhanced context
      const userMessage = `I want to send ${amount} ${selectedToken} to ${recipientAddress}. 

Analyze:
1. Which wallet(s) should I use?
2. Optimal gas settings (slow/standard/fast) with estimated costs
3. Estimated transaction time
4. If Bitcoin, analyze UTXO consolidation opportunities
5. Total cost breakdown including fees
6. Alternative strategies if applicable

Provide detailed gas optimization recommendations and timing estimates.`;
      
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });

      // Wait for agent response
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get the conversation with agent's response
      const updatedConversation = await base44.agents.getConversation(conversation.id);
      const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];

      setRecommendation(lastMessage.content);
    } catch (error) {
      toast.error('Failed to analyze transaction: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    // Find the wallet that matches the selected token
    const wallet = wallets.find(w => {
      const symbol = w.blockchain === 'ethereum' ? 'ETH' : 
                     w.blockchain === 'bitcoin' ? 'BTC' :
                     w.blockchain === 'solana' ? 'SOL' :
                     w.blockchain === 'polygon' ? 'MATIC' :
                     w.blockchain === 'bsc' ? 'BNB' : '';
      return symbol === selectedToken && w.cached_balance >= parseFloat(amount);
    });

    if (!wallet) {
      toast.error('No suitable wallet found with sufficient balance');
      return;
    }

    setSelectedWallet(wallet);
    setShowTxBuilder(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Smart Send with AI Optimization</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-white/70">Token</Label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-2"
            >
              <option value="ETH">ETH - Ethereum</option>
              <option value="BTC">BTC - Bitcoin</option>
            </select>
          </div>

          <div>
            <Label className="text-white/70">Amount</Label>
            <Input
              type="number"
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          <div>
            <Label className="text-white/70">Recipient Address</Label>
            <Input
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          {!recommendation && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI Analyzing Optimal Strategy...
                </>
              ) : (
                'Analyze Best Wallet Selection'
              )}
            </Button>
          )}

          {recommendation && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-2">AI Recommendation</h3>
                  <p className="text-white/70 text-sm whitespace-pre-wrap">{recommendation}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setRecommendation(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Analyze Again
                </Button>
                <Button
                  onClick={handleExecute}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Proceed with Transaction
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <p className="text-blue-400 text-sm font-medium">AI-Powered Optimization</p>
            </div>
            <p className="text-blue-300 text-xs">
              Analyzes gas fees, network conditions, UTXO consolidation opportunities, and provides optimal timing recommendations.
            </p>
          </div>
        </div>

        {showTxBuilder && selectedWallet && (
          <TransactionBuilder
            isOpen={showTxBuilder}
            onClose={() => {
              setShowTxBuilder(false);
              onClose();
            }}
            wallet={selectedWallet}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}