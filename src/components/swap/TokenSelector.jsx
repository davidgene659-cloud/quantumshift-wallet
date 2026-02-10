import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';

const tokens = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'from-orange-500 to-amber-600', price: 43250.00 },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'from-indigo-500 to-purple-600', price: 2280.00 },
  { symbol: 'USDT', name: 'Tether', icon: '₮', color: 'from-green-500 to-emerald-600', price: 1.00 },
  { symbol: 'BNB', name: 'BNB', icon: '◆', color: 'from-yellow-500 to-orange-500', price: 312.00 },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'from-purple-500 to-pink-500', price: 98.50 },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', color: 'from-gray-600 to-gray-800', price: 0.62 },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', color: 'from-blue-500 to-cyan-500', price: 0.58 },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', color: 'from-amber-400 to-yellow-500', price: 0.082 },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡', color: 'from-violet-500 to-purple-600', price: 0.89 },
];

export default function TokenSelector({ selected, onSelect, excludeToken }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredTokens = tokens.filter(t => 
    t.symbol !== excludeToken &&
    (t.symbol.toLowerCase().includes(search.toLowerCase()) || 
     t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedToken = tokens.find(t => t.symbol === selected);

  const DialogComponent = isMobile ? Drawer : Dialog;
  const ContentComponent = isMobile ? DrawerContent : DialogContent;
  const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
  const TitleComponent = isMobile ? DrawerTitle : DialogTitle;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2 transition-all"
      >
        {selectedToken ? (
          <>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedToken.color} flex items-center justify-center text-white font-bold`}>
              {selectedToken.icon}
            </div>
            <span className="text-white font-semibold">{selectedToken.symbol}</span>
          </>
        ) : (
          <span className="text-white/70">Select token</span>
        )}
        <ChevronDown className="w-4 h-4 text-white/50" />
      </button>

      <DialogComponent open={open} onOpenChange={setOpen}>
        <ContentComponent className="bg-gray-900 border-white/10 text-white max-w-md">
          <HeaderComponent>
            <TitleComponent>Select Token</TitleComponent>
          </HeaderComponent>
          
          <div className="p-4 space-y-4">
            <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or symbol"
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredTokens.map((token) => (
              <motion.button
                key={token.symbol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSelect(token.symbol);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${token.color} flex items-center justify-center text-white font-bold`}>
                    {token.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">{token.symbol}</p>
                    <p className="text-white/50 text-sm">{token.name}</p>
                  </div>
                </div>
                <p className="text-white/70">${token.price.toLocaleString()}</p>
              </motion.button>
            ))}
            </div>
            </div>
            </ContentComponent>
            </DialogComponent>
    </>
  );
}

export { tokens };