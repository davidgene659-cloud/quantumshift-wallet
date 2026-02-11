import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function SponsorBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: sponsors = [] } = useQuery({
    queryKey: ['activeSponsors'],
    queryFn: async () => {
      const ads = await base44.entities.AdPartnership.filter({ status: 'active' });
      return ads.slice(0, 3);
    },
    initialData: []
  });

  useEffect(() => {
    if (sponsors.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % sponsors.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [sponsors.length]);

  if (dismissed || sponsors.length === 0) return null;

  const currentSponsor = sponsors[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative"
      >
        <motion.a
          key={currentIndex}
          href={currentSponsor.landing_page_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="block bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 rounded-2xl p-4 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">
                  {currentSponsor.partner_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold">{currentSponsor.partner_name}</p>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Sponsored</span>
                </div>
                <p className="text-white/60 text-sm">{currentSponsor.campaign_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-white/50 group-hover:text-purple-400 transition-colors" />
            </div>
          </div>
        </motion.a>
        
        <button
          onClick={(e) => {
            e.preventDefault();
            setDismissed(true);
          }}
          className="absolute top-2 right-2 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        {sponsors.length > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {sponsors.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-purple-400 w-6' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}