import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const maxPullDistance = 80;
  const triggerDistance = 60;

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY > 0 || refreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setPulling(true);
      setPullDistance(Math.min(distance, maxPullDistance));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= triggerDistance && !refreshing) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{
          opacity: pulling || refreshing ? 1 : 0,
          y: pulling || refreshing ? 0 : -40,
        }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 z-50"
      >
        <div className="flex items-center gap-2">
          {refreshing ? (
            <>
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              <span className="text-white/70 text-sm">Refreshing...</span>
            </>
          ) : (
            <motion.div
              animate={{ rotate: pullDistance >= triggerDistance ? 180 : 0 }}
              className="text-white/70"
            >
              ↓
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: pulling ? pullDistance * 0.5 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}