import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Repeat, Filter, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

const getTransactionIcon = (type) => {
  switch (type) {
    case 'deposit': return ArrowDownLeft;
    case 'withdraw': return ArrowUpRight;
    case 'swap': return Repeat;
    default: return Repeat;
  }
};

const getTransactionColor = (type) => {
  switch (type) {
    case 'deposit': return 'text-emerald-400';
    case 'withdraw': return 'text-red-400';
    default: return 'text-blue-400';
  }
};

export default function TransactionHistory({ user, wallets = [], selectedWalletId }) {
  const [filterType, setFilterType] = useState('all');
  const [showAll, setShowAll] = useState(false);

  // Fetch all transactions for user
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const result = await base44.entities.Transaction.filter(
        { user_id: user.id },
        '-created_date',
        100
      );
      return result;
    },
    enabled: !!user,
  });

  // Filter transactions
  let filteredTransactions = transactions;
  
  if (filterType !== 'all') {
    filteredTransactions = transactions.filter(t => t.type === filterType);
  }

  // If wallet selected, show only that wallet's transactions (match by checking wallet address/id in future)
  // For now, showing all user transactions across wallets

  const displayedTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 5);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Transaction History</h3>
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdraw">Withdrawals</option>
            <option value="swap">Swaps</option>
            <option value="trade">Trades</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-white/50 py-8">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center text-white/50 py-8">
          No transactions yet. Your activity will appear here.
        </div>
      ) : displayedTransactions.length === 0 ? (
        <div className="text-center text-white/50 py-8">
          No {filterType} transactions found.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {displayedTransactions.map((tx, index) => {
              const Icon = getTransactionIcon(tx.type);
              const color = getTransactionColor(tx.type);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <h4 className="text-white font-medium capitalize">{tx.type}</h4>
                        <p className="text-white/50 text-xs">
                          {tx.created_date ? format(new Date(tx.created_date), 'MMM dd, yyyy HH:mm') : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${color}`}>
                        {tx.type === 'withdraw' ? '-' : '+'}{tx.from_amount} {tx.from_token}
                      </p>
                      <p className="text-white/50 text-xs">
                        ${tx.usd_value?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  {tx.type === 'swap' && tx.to_token && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-white/50 text-xs">
                        Swapped for {tx.to_amount} {tx.to_token}
                      </p>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      tx.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                    {tx.fee && (
                      <span className="text-white/40">Fee: {tx.fee} {tx.from_token}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredTransactions.length > 5 && (
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="w-full mt-4 border-white/20 text-white"
              style={{ minHeight: '44px' }}
            >
              {showAll ? 'Show Less' : `Show All (${filteredTransactions.length})`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}