import React, { useEffect, useRef } from 'react';
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
  Gamepad2,
  TrendingUp,
  CreditCard,
  BookOpen,
  Heart,
  Brain,
  Image
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
  { icon: TrendingUp, label: 'Analytics', page: 'Analytics' },
];

const secondaryNavItems = [
  { icon: 'Brain', label: 'AI', page: 'AIHub' },
  { icon: 'Image', label: 'NFTs', page: 'NFTs' },
  { icon: 'CreditCard', label: 'Card', page: 'VirtualCard' },
  { icon: 'BookOpen', label: 'Learn', page: 'Education' },
  { icon: 'Heart', label: 'Legacy', page: 'Legacy' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const scrollPositions = useRef({});
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const savedPosition = scrollPositions.current[currentPath] || 0;
      contentRef.current.scrollTop = savedPosition;
    }
  }, [currentPath]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        scrollPositions.current[currentPath] = contentRef.current.scrollTop;
      }
    };

    const contentEl = contentRef.current;
    contentEl?.addEventListener('scroll', handleScroll);
    return () => contentEl?.removeEventListener('scroll', handleScroll);
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-gray-950" style={{ 
      overscrollBehaviorY: 'none',
      paddingTop: 'max(env(safe-area-inset-top), 0px)',
      paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
      paddingLeft: 'max(env(safe-area-inset-left), 0px)',
      paddingRight: 'max(env(safe-area-inset-right), 0px)'
    }}>
      <div ref={contentRef} style={{ height: '100vh', overflow: 'auto' }}>
        {children}
      </div>
      
      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 md:hidden z-40 select-none" style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0px)'
      }}>
        <div className="overflow-x-auto">
          <div className="flex justify-start items-center px-2 gap-1" style={{ minHeight: '64px', minWidth: 'max-content' }}>
            {[...navItems, ...secondaryNavItems].map((item) => {
              const isActive = currentPath.includes(item.page);
              const Icon = typeof item.icon === 'string' ? 
                (item.icon === 'Brain' ? Brain : item.icon === 'Image' ? Image : item.icon === 'CreditCard' ? CreditCard : item.icon === 'BookOpen' ? BookOpen : Heart) : 
                item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none flex-shrink-0 ${
                    isActive ? 'text-purple-400' : 'text-white/50 hover:text-white/70'
                  }`}
                  style={{ minWidth: '64px', minHeight: '44px' }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Side Navigation - Desktop */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 hidden md:flex flex-col items-center py-6 z-40 select-none">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8">
          <Wallet className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPath.includes(item.page);
            return (
              <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`rounded-xl flex items-center justify-center transition-all select-none ${
                    isActive 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                  style={{ minWidth: '56px', minHeight: '56px' }}
                  title={item.label}
                >
                  <item.icon className="w-6 h-6" />
                </Link>
            );
          })}

          <div className="h-px bg-white/10 my-2 mx-2"></div>

          {secondaryNavItems.map((item) => {
            const isActive = currentPath.includes(item.page);
            const Icon = item.icon === 'Brain' ? Brain : item.icon === 'Image' ? Image : item.icon === 'CreditCard' ? CreditCard : item.icon === 'BookOpen' ? BookOpen : Heart;
            return (
              <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`rounded-xl flex items-center justify-center transition-all select-none ${
                    isActive 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                  }`}
                  style={{ minWidth: '56px', minHeight: '56px' }}
                  title={item.label}
                >
                  <Icon className="w-6 h-6" />
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