import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, ArrowUpRight, ArrowDownLeft, Building2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/ui/mobile-select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BankCard from '@/components/banking/BankCard';
import AIChatbot from '@/components/chat/AIChatbot';

const banks = ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One', 'US Bank', 'PNC Bank'];

export default function Banking() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferType, setTransferType] = useState('deposit');
  const [bankForm, setBankForm] = useState({ bank_name: '', account_type: 'checking', account_last_four: '', routing_number_last_four: '' });
  const [transferAmount, setTransferAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ['bankAccounts'],
    queryFn: () => base44.entities.BankAccount.list(),
  });

  const addAccountMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create(data),
    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: ['bankAccounts'] });
      const previousAccounts = queryClient.getQueryData(['bankAccounts']);
      queryClient.setQueryData(['bankAccounts'], (old = []) => [...old, { ...newAccount, id: 'temp-' + Date.now(), status: 'pending' }]);
      return { previousAccounts };
    },
    onError: (err, newAccount, context) => {
      queryClient.setQueryData(['bankAccounts'], context.previousAccounts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setShowAddDialog(false);
      setBankForm({ bank_name: '', account_type: 'checking', account_last_four: '', routing_number_last_four: '' });
    },
  });

  const removeAccountMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['bankAccounts'] });
      const previousAccounts = queryClient.getQueryData(['bankAccounts']);
      queryClient.setQueryData(['bankAccounts'], (old = []) => old.filter(acc => acc.id !== deletedId));
      return { previousAccounts };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['bankAccounts'], context.previousAccounts);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }),
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['bankAccounts'] });
      const previousAccounts = queryClient.getQueryData(['bankAccounts']);
      queryClient.setQueryData(['bankAccounts'], (old = []) => old.map(acc => acc.id === id ? { ...acc, ...data } : acc));
      return { previousAccounts };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['bankAccounts'], context.previousAccounts);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bankAccounts'] }),
  });

  const handleAddAccount = () => {
    addAccountMutation.mutate({
      ...bankForm,
      status: 'pending',
      is_primary: accounts.length === 0,
    });
  };

  const handleSetPrimary = (account) => {
    accounts.forEach(acc => {
      if (acc.id === account.id) {
        updateAccountMutation.mutate({ id: acc.id, data: { is_primary: true } });
      } else if (acc.is_primary) {
        updateAccountMutation.mutate({ id: acc.id, data: { is_primary: false } });
      }
    });
  };

  const primaryAccount = accounts.find(a => a.is_primary);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Portfolio')}>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Banking</h1>
              <p className="text-white/50 text-sm">Deposit & withdraw to your bank</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Link Bank
          </Button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <button
            onClick={() => { setTransferType('deposit'); setShowTransferDialog(true); }}
            disabled={!primaryAccount || primaryAccount.status !== 'verified'}
            className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4 hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center">
              <ArrowDownLeft className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">Deposit</h3>
              <p className="text-white/50 text-sm">From your bank account</p>
            </div>
          </button>

          <button
            onClick={() => { setTransferType('withdraw'); setShowTransferDialog(true); }}
            disabled={!primaryAccount || primaryAccount.status !== 'verified'}
            className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-6 flex items-center gap-4 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center">
              <ArrowUpRight className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-lg">Withdraw</h3>
              <p className="text-white/50 text-sm">To your bank account</p>
            </div>
          </button>
        </motion.div>

        {/* Linked Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Linked Accounts</h2>
          {accounts.length > 0 ? (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <BankCard
                  key={account.id}
                  account={account}
                  onRemove={(acc) => removeAccountMutation.mutate(acc.id)}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No linked accounts</h3>
              <p className="text-white/50 mb-4">Connect your bank to deposit and withdraw funds</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500"
              >
                Link Bank Account
              </Button>
            </div>
          )}
        </motion.div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-medium">Bank-Level Security</p>
            <p className="text-white/50 text-sm">Your bank credentials are encrypted and never stored. We use secure tokenization for all transactions.</p>
          </div>
        </motion.div>
      </div>

      {/* Add Bank Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Link Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white/70">Select Bank</Label>
              <Select value={bankForm.bank_name} onValueChange={(v) => setBankForm({ ...bankForm, bank_name: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank} className="text-white hover:bg-white/10">
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Account Type</Label>
              <Select value={bankForm.account_type} onValueChange={(v) => setBankForm({ ...bankForm, account_type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="checking" className="text-white hover:bg-white/10">Checking</SelectItem>
                  <SelectItem value="savings" className="text-white hover:bg-white/10">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white/70">Account Number (last 4 digits)</Label>
              <Input
                value={bankForm.account_last_four}
                onChange={(e) => setBankForm({ ...bankForm, account_last_four: e.target.value.slice(0, 4) })}
                placeholder="1234"
                maxLength={4}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white/70">Routing Number (last 4 digits)</Label>
              <Input
                value={bankForm.routing_number_last_four}
                onChange={(e) => setBankForm({ ...bankForm, routing_number_last_four: e.target.value.slice(0, 4) })}
                placeholder="5678"
                maxLength={4}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <Button
              onClick={handleAddAccount}
              disabled={!bankForm.bank_name || bankForm.account_last_four.length !== 4}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Link Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{transferType === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {primaryAccount && (
              <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                <Building2 className="w-8 h-8 text-white/50" />
                <div>
                  <p className="text-white font-medium">{primaryAccount.bank_name}</p>
                  <p className="text-white/50 text-sm">•••• {primaryAccount.account_last_four}</p>
                </div>
              </div>
            )}

            <div>
              <Label className="text-white/70">Amount (USD)</Label>
              <Input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white text-2xl font-bold mt-2 h-14"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[100, 250, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTransferAmount(amount.toString())}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-all"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <Button
              disabled={!transferAmount || parseFloat(transferAmount) <= 0}
              className={`w-full ${
                transferType === 'deposit'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}
            >
              {transferType === 'deposit' ? 'Deposit' : 'Withdraw'} ${transferAmount || '0.00'}
            </Button>

            <p className="text-center text-white/40 text-xs">
              Transfers typically complete within 1-3 business days
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <AIChatbot />
    </div>
  );
}