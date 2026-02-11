import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const categories = [
  { value: 'trading', label: 'Trading', icon: '📈' },
  { value: 'fees', label: 'Fees', icon: '💸' },
  { value: 'staking', label: 'Staking', icon: '🔒' },
  { value: 'rewards', label: 'Rewards', icon: '🎁' },
  { value: 'transfer', label: 'Transfer', icon: '↔️' },
  { value: 'other', label: 'Other', icon: '📦' }
];

const transactionTypes = [
  { value: 'swap', label: 'Swap' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
  { value: 'trade', label: 'Trade' },
  { value: 'mining_reward', label: 'Mining Reward' },
  { value: 'poker_win', label: 'Poker Win' },
  { value: 'poker_loss', label: 'Poker Loss' },
  { value: 'bot_trade', label: 'Bot Trade' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' }
];

export default function TransactionEditDialog({ transaction, open, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    type: transaction?.type || '',
    category: transaction?.category || 'other',
    from_token: transaction?.from_token || '',
    to_token: transaction?.to_token || '',
    from_amount: transaction?.from_amount || '',
    to_amount: transaction?.to_amount || '',
    notes: transaction?.notes || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!transaction) return;

    setIsLoading(true);
    try {
      const updateData = {
        type: formData.type,
        category: formData.category,
        from_token: formData.from_token,
        to_token: formData.to_token,
        from_amount: parseFloat(formData.from_amount) || 0,
        to_amount: parseFloat(formData.to_amount) || 0,
        notes: formData.notes
      };

      await base44.entities.Transaction.update(transaction.id, updateData);
      toast.success('Transaction updated successfully');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="type" className="text-white/70">Transaction Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {transactionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category" className="text-white/70">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span>{cat.icon} {cat.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_token" className="text-white/70">From Token</Label>
              <Input
                id="from_token"
                value={formData.from_token}
                onChange={(e) => setFormData({ ...formData, from_token: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="BTC"
              />
            </div>
            <div>
              <Label htmlFor="from_amount" className="text-white/70">Amount</Label>
              <Input
                id="from_amount"
                type="number"
                step="0.00000001"
                value={formData.from_amount}
                onChange={(e) => setFormData({ ...formData, from_amount: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          {(formData.type === 'swap' || formData.type === 'trade') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="to_token" className="text-white/70">To Token</Label>
                <Input
                  id="to_token"
                  value={formData.to_token}
                  onChange={(e) => setFormData({ ...formData, to_token: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="ETH"
                />
              </div>
              <div>
                <Label htmlFor="to_amount" className="text-white/70">Amount</Label>
                <Input
                  id="to_amount"
                  type="number"
                  step="0.00000001"
                  value={formData.to_amount}
                  onChange={(e) => setFormData({ ...formData, to_amount: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-white/70">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-white/5 border-white/10 text-white min-h-20"
              placeholder="Add notes about this transaction..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/20 text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}