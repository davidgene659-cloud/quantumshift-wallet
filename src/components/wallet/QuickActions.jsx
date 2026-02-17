import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Landmark, Gamepad2, Bot, Cpu, Grid3x3, Shield, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import SmartSendDialog from './SmartSendDialog';

const actions = [
  { icon: ArrowUpRight, label: 'Send', color: 'from-blue-500 to-cyan-500', page: 'Send', useSmart: true },
  { icon: ArrowDownLeft, label: 'Receive', color: 'from-green-500 to-emerald-500', page: 'Receive' },
  { icon: RefreshCw, label: 'Swap', color: 'from-purple-500 to-pink-500', page: 'Swap' },
  { icon: Image, label: 'NFTs', color: 'from-fuchsia-500 to-pink-500', page: 'NFTs' },
  { icon: Shield, label: 'Privacy', color: 'from-emerald-500 to-teal-500', page: 'Privacy' },
  { icon: Grid3x3, label: 'DApps', color: 'from-violet-500 to-purple-500', page: 'DApps' },
  { icon: Gamepad2, label: 'Casinos', color: 'from-pink-500 to-rose-500', page: 'Casinos' },
  { icon: Bot, label: 'Bots', color: 'from-indigo-500 to-violet-500', page: 'TradingBots' },
  { icon: Cpu, label: 'Mining', color: 'from-rose-500 to-red-500', page: 'CloudMining' },
  { icon: Landmark, label: 'Banking', color: 'from-amber-500 to-orange-500', page: 'Banking' },
];

export default function QuickActions() {
  const [showSmartSend, setShowSmartSend] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {actions.map((action, index) => {
          const Component = action.useSmart ? 'button' : Link;
          const props = action.useSmart 
            ? { onClick: () => setShowSmartSend(true), className: 'w-full' }
            : { to: createPageUrl(action.page) };

          return (
            <Component key={action.label} {...props}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors">{action.label}</span>
              </motion.div>
            </Component>
          );
        })}
      </div>

      <SmartSendDialog 
        isOpen={showSmartSend} 
        onClose={() => setShowSmartSend(false)}
      />
    </>
  );
}