import React from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, Clock, XCircle, MoreVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const bankLogos = {
  'Chase': '🏦',
  'Bank of America': '🏛️',
  'Wells Fargo': '🏧',
  'Citibank': '🏢',
  'Capital One': '💳',
  'default': '🏦'
};

const statusConfig = {
  verified: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Verified' },
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
};

export default function BankCard({ account, onRemove, onSetPrimary }) {
  const status = statusConfig[account.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border rounded-2xl p-5 ${
        account.is_primary ? 'border-purple-500/50' : 'border-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
            {bankLogos[account.bank_name] || bankLogos.default}
          </div>
          <div>
            <h3 className="text-white font-semibold">{account.bank_name}</h3>
            <p className="text-white/50 text-sm capitalize">{account.account_type} •••• {account.account_last_four}</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <MoreVertical className="w-4 h-4 text-white/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-900 border-white/10">
            {!account.is_primary && account.status === 'verified' && (
              <DropdownMenuItem 
                onClick={() => onSetPrimary(account)}
                className="text-white hover:bg-white/10"
              >
                Set as Primary
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => onRemove(account)}
              className="text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
        
        {account.is_primary && (
          <Badge className="bg-purple-500/20 text-purple-400 border-0">
            Primary
          </Badge>
        )}
      </div>
    </motion.div>
  );
}