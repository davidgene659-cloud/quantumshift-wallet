import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, AlertTriangle, User, Shield, Bell, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';

export default function Settings() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    
    try {
      // Delete user account
      await base44.entities.User.delete(user.id);
      await base44.auth.logout();
    } catch (error) {
      alert('Failed to delete account. Please contact support.');
    }
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', value: user?.email || 'Loading...', action: () => {} },
        { icon: Shield, label: 'Privacy', value: 'Manage', action: () => {} },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', value: 'Enabled', action: () => {} },
        { icon: Moon, label: 'Theme', value: 'Dark', action: () => {} },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to={createPageUrl('Portfolio')}>
            <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all" style={{ minWidth: '44px', minHeight: '44px' }}>
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-white/50 text-sm">Manage your account</p>
          </div>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
          >
            <h2 className="text-white font-semibold mb-3">{section.title}</h2>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all ${
                    i !== section.items.length - 1 ? 'border-b border-white/10' : ''
                  }`}
                  style={{ minHeight: '60px' }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-white/70" />
                    <span className="text-white">{item.label}</span>
                  </div>
                  <span className="text-white/50 text-sm">{item.value}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-red-400 font-semibold mb-3">Danger Zone</h2>
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="text-white font-semibold">Delete Account</h3>
                <p className="text-white/50 text-sm">Permanently delete your account and all data</p>
              </div>
            </div>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              className="w-full bg-red-500 hover:bg-red-600"
              style={{ minHeight: '44px' }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Account</DialogTitle>
            <DialogDescription className="text-white/70">
              This action cannot be undone. All your data, including wallets, bots, and miners will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-white/90 text-sm">Type <span className="font-bold text-red-400">DELETE</span> to confirm:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
              style={{ minHeight: '44px' }}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteDialog(false)}
                variant="outline"
                className="flex-1 border-white/10"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE'}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                Delete Forever
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}