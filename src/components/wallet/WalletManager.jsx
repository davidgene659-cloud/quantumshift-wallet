import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Plus, Trash2, Star, Edit2, HardDrive, Key, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const getWalletIcon = (type) => {
  switch (type) {
    case 'hardware': return HardDrive;
    case 'imported': return Key;
    default: return Wallet;
  }
};

export default function WalletManager({ wallets = [], user, onSelectWallet, selectedWalletId, onAddWallet }) {
  const [showManager, setShowManager] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [newName, setNewName] = useState('');

  const queryClient = useQueryClient();

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Wallet.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet updated');
      setEditingWallet(null);
    }
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Wallet.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Wallet removed');
    }
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id) => {
      // Set all to non-primary first
      for (const wallet of wallets) {
        if (wallet.id !== id && wallet.is_primary) {
          await base44.entities.Wallet.update(wallet.id, { is_primary: false });
        }
      }
      // Set selected as primary
      return await base44.entities.Wallet.update(id, { is_primary: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Primary wallet updated');
    }
  });

  const handleRename = (wallet) => {
    setEditingWallet(wallet);
    setNewName(wallet.wallet_name || 'My Wallet');
  };

  const saveRename = () => {
    if (!editingWallet || !newName.trim()) return;
    updateWalletMutation.mutate({ id: editingWallet.id, data: { wallet_name: newName } });
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId) || wallets[0];

  return (
    <>
      {/* Wallet Selector Button */}
      <button
        onClick={() => setShowManager(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
        style={{ minHeight: '44px' }}
      >
        <Wallet className="w-4 h-4 text-purple-400" />
        <span className="text-white text-sm font-medium">
          {selectedWallet?.wallet_name || 'Select Wallet'}
        </span>
        {wallets.length > 1 && (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
            {wallets.length}
          </span>
        )}
      </button>

      {/* Wallet Manager Dialog */}
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>My Wallets</span>
              <Button
                onClick={() => {
                  setShowManager(false);
                  onAddWallet?.();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wallet
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {wallets.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <Wallet className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/70 mb-4">No wallets yet. Add your first wallet to get started.</p>
                <Button
                  onClick={() => {
                    setShowManager(false);
                    onAddWallet?.();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wallet
                </Button>
              </div>
            ) : (
              wallets.map((wallet) => {
                const Icon = getWalletIcon(wallet.wallet_type);
                const isSelected = wallet.id === selectedWalletId;
                const totalValue = wallet.total_usd_value || 0;

                return (
                  <motion.div
                    key={wallet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white/5 border rounded-xl p-4 transition-all ${
                      isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => {
                          onSelectWallet(wallet.id);
                          setShowManager(false);
                        }}
                        className="flex-1 flex items-start gap-3 text-left"
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-white/10'
                        }`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold">
                              {wallet.wallet_name || 'Unnamed Wallet'}
                            </h3>
                            {wallet.is_primary && (
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          <p className="text-white/50 text-xs font-mono mt-1">
                            {wallet.wallet_address?.slice(0, 6)}...{wallet.wallet_address?.slice(-4)}
                          </p>
                          <p className="text-emerald-400 font-bold text-lg mt-2">
                            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {wallet.wallet_type === 'hardware' && wallet.hardware_device && (
                            <p className="text-blue-400 text-xs mt-1">
                              {wallet.hardware_device}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="flex gap-2">
                        {!wallet.is_primary && (
                          <button
                            onClick={() => setPrimaryMutation.mutate(wallet.id)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Set as primary"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            <Star className="w-4 h-4 text-white/50" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRename(wallet)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Rename"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <Edit2 className="w-4 h-4 text-white/50" />
                        </button>
                        {wallets.length > 1 && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this wallet?')) {
                                deleteWalletMutation.mutate(wallet.id);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                            title="Remove"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!editingWallet} onOpenChange={() => setEditingWallet(null)}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Rename Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-white/70">Wallet Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Wallet"
                className="bg-white/5 border-white/10 text-white mt-2"
                onKeyPress={(e) => e.key === 'Enter' && saveRename()}
              />
            </div>
            <Button
              onClick={saveRename}
              disabled={!newName.trim() || updateWalletMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{ minHeight: '44px' }}
            >
              <Check className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}