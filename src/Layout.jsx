import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Wallet, 
  ArrowLeftRight, 
  Bot, 
  Cpu, 
  Spade, 
  Landmark,
  LayoutDashboard,
  Grid3x3,
  Gamepad2
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Portfolio', page: 'Portfolio' },
  { icon: ArrowLeftRight, label: 'Swap', page: 'Swap' },
  { icon: Bot, label: 'Bots', page: 'TradingBots' },
  { icon: Cpu, label: 'Mining', page: 'CloudMining' },
  { icon: Grid3x3, label: 'DApps', page: 'DApps' },
  { icon: Gamepad2, label: 'Casinos', page: 'Casinos' },
  { icon: Spade, label: 'Poker', page: 'Poker' },
  { icon: Landmark, label: 'Banking', page: 'Banking' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-950">
      {children}
      
      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 md:hidden z-40">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = currentPath.includes(item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive ? 'text-purple-400' : 'text-white/50 hover:text-white/70'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side Navigation - Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 hidden md:flex flex-col items-center py-6 z-40">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = currentPath.includes(item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                }`}
                title={item.label}
              >
                <item.icon className="w-6 h-6" />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop content padding */}
      <style>{`
        @media (min-width: 768px) {
          main, .min-h-screen {
            margin-left: 80px;
          }
        }
        @media (max-width: 767px) {
          main, .min-h-screen {
            padding-bottom: 80px;
          }
        }
      `}</style>
    </div>
  );
}