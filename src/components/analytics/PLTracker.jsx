import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Percent, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tokenPrices = {
  BTC: 43250,
  ETH: 2280,
  USDT: 1,
  SOL: 98.5,
  BNB: 312,
  DOGE: 0.082,
  USDC: 1,
  ADA: 0.52,
  DOT: 7.8,
  MATIC: 0.91,
  AVAX: 36.5,
  LINK: 15.2
};

export default function PLTracker({ wallets = [] }) {
  const [showPL, setShowPL] = useState(true);

  // Calculate P&L for each token across all wallets
  const tokenPL = {};
  let totalInvested = 0;
  let totalCurrentValue = 0;

  wallets.forEach(wallet => {
    const balances = wallet.balances || {};
    Object.entries(balances).forEach(([symbol, balance]) => {
      const amount = parseFloat(balance) || 0;
      if (amount === 0) return;

      // Mock purchase price (in production, fetch from transaction history)
      const purchasePrice = tokenPrices[symbol] * (0.85 + Math.random() * 0.2);
      const currentPrice = tokenPrices[symbol] || 0;
      
      const invested = amount * purchasePrice;
      const currentValue = amount * currentPrice;
      const pl = currentValue - invested;
      const plPercent = ((currentValue - invested) / invested) * 100;

      if (!tokenPL[symbol]) {
        tokenPL[symbol] = {
          symbol,
          amount: 0,
          invested: 0,
          currentValue: 0,
          pl: 0,
          plPercent: 0
        };
      }

      tokenPL[symbol].amount += amount;
      tokenPL[symbol].invested += invested;
      tokenPL[symbol].currentValue += currentValue;
      tokenPL[symbol].pl += pl;
      
      totalInvested += invested;
      totalCurrentValue += currentValue;
    });
  });

  // Calculate percentage for each token
  Object.keys(tokenPL).forEach(symbol => {
    tokenPL[symbol].plPercent = ((tokenPL[symbol].currentValue - tokenPL[symbol].invested) / tokenPL[symbol].invested) * 100;
  });

  const tokens = Object.values(tokenPL);
  const totalPL = totalCurrentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-semibold">Profit & Loss</h3>
        </div>
        <Button
          onClick={() => setShowPL(!showPL)}
          variant="outline"
          size="sm"
          className="border-white/20 text-white"
        >
          {showPL ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>

      {/* Overall P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-1">Total Invested</p>
          <p className="text-white text-2xl font-bold">
            {showPL ? `$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm mb-1">Current Value</p>
          <p className="text-white text-2xl font-bold">
            {showPL ? `$${totalCurrentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </p>
        </div>
        <div className={`bg-white/5 border rounded-xl p-4 ${totalPL >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <p className="text-white/50 text-sm mb-1">Total P&L</p>
          <div className="flex items-center gap-2">
            {totalPL >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <p className={`text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {showPL ? (
                <>
                  {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm ml-2">({totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)</span>
                </>
              ) : '••••••'}
            </p>
          </div>
        </div>
      </div>

      {/* Individual Token P&L */}
      <div className="space-y-3">
        <h4 className="text-white/70 text-sm font-medium">Asset Breakdown</h4>
        {tokens.length === 0 ? (
          <p className="text-white/50 text-center py-4">No assets to track</p>
        ) : (
          tokens.map((token, index) => (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-white font-semibold">{token.symbol}</h4>
                    <span className="text-white/50 text-xs">
                      {showPL ? token.amount.toFixed(6) : '••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-white/50">Invested: </span>
                      <span className="text-white">
                        {showPL ? `$${token.invested.toFixed(2)}` : '••••••'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/50">Current: </span>
                      <span className="text-white">
                        {showPL ? `$${token.currentValue.toFixed(2)}` : '••••••'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 ${token.pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {token.pl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="font-bold">
                      {showPL ? (
                        <>
                          {token.pl >= 0 ? '+' : ''}${Math.abs(token.pl).toFixed(2)}
                        </>
                      ) : '••••••'}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 ${token.plPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {showPL ? `${token.plPercent >= 0 ? '+' : ''}${token.plPercent.toFixed(2)}%` : '••••'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}