import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const getExplorerUrl = (token, txHash) => {
  const explorers = {
    BTC: `https://blockchair.com/bitcoin/transaction/${txHash}`,
    ETH: `https://etherscan.io/tx/${txHash}`,
    USDT: `https://etherscan.io/tx/${txHash}`,
    BNB: `https://bscscan.com/tx/${txHash}`,
    SOL: `https://solscan.io/tx/${txHash}`,
    MATIC: `https://polygonscan.com/tx/${txHash}`,
  };
  return explorers[token] || `https://blockchair.com/search?q=${txHash}`;
};

export default function LastTransactionDetails({ user }) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['last-transaction', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const result = await base44.entities.Transaction.filter(
        { user_id: user.id },
        '-created_date',
        1
      );
      return result;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const lastTx = transactions[0];

  // Poll for transaction status updates
  const { data: txStatus } = useQuery({
    queryKey: ['tx-status', lastTx?.tx_hash],
    queryFn: async () => {
      if (!lastTx?.tx_hash) return null;
      // In production, fetch real tx status from blockchain
      return { confirmations: lastTx.confirmations || 0 };
    },
    enabled: !!lastTx?.tx_hash && lastTx?.status === 'pending',
    refetchInterval: 10000, // Check every 10 seconds
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!lastTx) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Last Transaction</h3>
        <p className="text-white/50 text-sm text-center py-8">No transactions yet</p>
      </div>
    );
  }

  const displayTxHash = lastTx.tx_hash || lastTx.id;
  const shortTxHash = `${displayTxHash.substring(0, 8)}...${displayTxHash.substring(displayTxHash.length - 8)}`;
  const explorerUrl = getExplorerUrl(lastTx.network || lastTx.from_token, displayTxHash);
  const isRealTx = !!lastTx.tx_hash;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">Last Transaction</h3>
        <div className="flex items-center gap-2">
          {lastTx.status === 'completed' && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Confirmed
            </span>
          )}
          {lastTx.status === 'pending' && (
            <span className="flex items-center gap-1 text-amber-400 text-sm">
              <Clock className="w-4 h-4 animate-pulse" />
              Pending
            </span>
          )}
          {lastTx.status === 'failed' && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              Failed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Transaction Type */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Type</span>
          <span className="text-white font-medium capitalize">{lastTx.type.replace('_', ' ')}</span>
        </div>

        {/* Amount */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Amount</span>
          <span className="text-white font-bold">
            {lastTx.from_amount} {lastTx.from_token}
          </span>
        </div>

        {/* USD Value */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Value</span>
          <span className="text-emerald-400 font-medium">
            ${lastTx.usd_value?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Fee */}
        {lastTx.fee && (
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Network Fee</span>
            <span className="text-white/70 text-sm">
              {lastTx.fee} {lastTx.from_token}
            </span>
          </div>
        )}

        {/* Transaction Hash */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Transaction {isRealTx ? 'Hash' : 'ID'}</span>
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm font-mono">{shortTxHash}</span>
            <button
              onClick={() => copyToClipboard(displayTxHash)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Copy className="w-3 h-3 text-white/50" />
            </button>
          </div>
        </div>

        {/* Confirmations (if real tx) */}
        {isRealTx && (
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Confirmations</span>
            <span className="text-white font-medium">
              {txStatus?.confirmations || lastTx.confirmations || 0}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex justify-between items-center">
          <span className="text-white/50 text-sm">Time</span>
          <span className="text-white/70 text-sm">
            {lastTx.created_date ? format(new Date(lastTx.created_date), 'MMM dd, yyyy HH:mm:ss') : 'Recently'}
          </span>
        </div>

        {/* Blockchain Explorer Link */}
        {isRealTx && (
          <div className="pt-4 border-t border-white/10">
            <Button
              onClick={() => window.open(explorerUrl, '_blank')}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on {lastTx.network || lastTx.from_token} Explorer
            </Button>
          </div>
        )}

        {/* Real-time Status Badge */}
        {lastTx.status === 'completed' && isRealTx && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-emerald-400 text-sm font-medium">
              ✓ Transaction confirmed on {lastTx.network || lastTx.from_token} mainnet
            </p>
            <p className="text-emerald-400/70 text-xs mt-1">
              {txStatus?.confirmations || lastTx.confirmations || 0} confirmations
            </p>
          </div>
        )}

        {lastTx.status === 'pending' && isRealTx && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-amber-400 text-sm font-medium">
              ⏳ Waiting for confirmations on {lastTx.network || lastTx.from_token} mainnet...
            </p>
            <p className="text-amber-400/70 text-xs mt-1">
              {txStatus?.confirmations || lastTx.confirmations || 0} confirmations
            </p>
          </div>
        )}

        {!isRealTx && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm font-medium">
              ℹ️ Demo transaction - Not broadcast to blockchain
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}