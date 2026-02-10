import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Settings, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TokenSelector, { tokens } from './TokenSelector';

export default function SwapCard({ onSwapComplete }) {
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fromPrice = tokens.find(t => t.symbol === fromToken)?.price || 0;
  const toPrice = tokens.find(t => t.symbol === toToken)?.price || 0;
  
  const toAmount = fromAmount && fromPrice && toPrice 
    ? ((parseFloat(fromAmount) * fromPrice) / toPrice).toFixed(6)
    : '';
  
  const usdValue = fromAmount ? (parseFloat(fromAmount) * fromPrice).toFixed(2) : '0.00';
  const fee = fromAmount ? (parseFloat(fromAmount) * fromPrice * 0.05).toFixed(2) : '0.00';

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    
    setIsSwapping(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSwapping(false);
    setShowSuccess(true);
    
    if (onSwapComplete) {
      onSwapComplete({
        fromToken,
        toToken,
        fromAmount: parseFloat(fromAmount),
        toAmount: parseFloat(toAmount),
        fee: parseFloat(fee)
      });
    }
    
    setTimeout(() => {
      setShowSuccess(false);
      setFromAmount('');
    }, 3000);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-10 bg-gray-900/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-white mb-2"
            >
              Swap Successful!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/60"
            >
              {fromAmount} {fromToken} → {toAmount} {toToken}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Swap Tokens</h2>
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <Settings className="w-5 h-5 text-white/70" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="bg-gray-900 border-white/10 text-white w-80">
              <h4 className="font-semibold mb-4">Slippage Tolerance</h4>
              <div className="flex gap-2 mb-4">
                {[0.1, 0.5, 1.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      slippage === val ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
              <Slider
                value={[slippage]}
                onValueChange={([val]) => setSlippage(val)}
                max={5}
                step={0.1}
                className="mb-2"
              />
              <p className="text-white/50 text-sm">Current: {slippage}%</p>
            </PopoverContent>
          </Popover>
        </div>

        {/* From Token */}
        <div className="bg-white/5 rounded-2xl p-4 mb-2">
          <div className="flex justify-between mb-2">
            <span className="text-white/50 text-sm">From</span>
            <span className="text-white/50 text-sm">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent border-none text-3xl font-bold text-white placeholder:text-white/30 focus-visible:ring-0 p-0"
            />
            <TokenSelector
              selected={fromToken}
              onSelect={setFromToken}
              excludeToken={toToken}
            />
          </div>
          <p className="text-white/40 text-sm mt-2">≈ ${usdValue}</p>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSwapTokens}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
          >
            <ArrowDownUp className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* To Token */}
        <div className="bg-white/5 rounded-2xl p-4 mt-2">
          <div className="flex justify-between mb-2">
            <span className="text-white/50 text-sm">To</span>
            <span className="text-white/50 text-sm">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={toAmount}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-transparent border-none text-3xl font-bold text-white placeholder:text-white/30 focus-visible:ring-0 p-0"
            />
            <TokenSelector
              selected={toToken}
              onSelect={setToToken}
              excludeToken={fromToken}
            />
          </div>
        </div>

        {/* Info */}
        {fromAmount && parseFloat(fromAmount) > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-white/5 rounded-xl space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Rate</span>
              <span className="text-white">1 {fromToken} = {(fromPrice / toPrice).toFixed(6)} {toToken}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Platform Fee (5%)</span>
              <span className="text-white">${fee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Slippage Tolerance</span>
              <span className="text-white">{slippage}%</span>
            </div>
          </motion.div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
          className="w-full mt-6 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-lg rounded-2xl disabled:opacity-50"
        >
          {isSwapping ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          {isSwapping ? 'Swapping...' : 'Swap Now'}
        </Button>
      </div>
    </div>
  );
}