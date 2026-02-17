import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function DebugPanel({ 
  allWalletBalances, 
  allTokenBalances, 
  balanceError, 
  tokenError,
  totalValue,
  realTotal,
  tokensTotal,
  tokens 
}) {
  const [expanded, setExpanded] = useState(false);

  const wallets = allWalletBalances?.wallets || [];
  const fetchedTokens = allTokenBalances?.tokens || [];

  return (
    <Card className="bg-yellow-500/10 border-yellow-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bug className="w-5 h-5 text-yellow-400" />
            Debug Panel
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-white/70 hover:text-white"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/50 text-xs">Native Wallets</p>
            <p className="text-white font-semibold">{wallets.length}</p>
            {balanceError && <AlertCircle className="w-4 h-4 text-red-400 mt-1" />}
            {!balanceError && <CheckCircle className="w-4 h-4 text-green-400 mt-1" />}
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/50 text-xs">Token Balances</p>
            <p className="text-white font-semibold">{fetchedTokens.length}</p>
            {tokenError && <AlertCircle className="w-4 h-4 text-red-400 mt-1" />}
            {!tokenError && <CheckCircle className="w-4 h-4 text-green-400 mt-1" />}
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/50 text-xs">Native Total</p>
            <p className="text-white font-semibold">${realTotal.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/50 text-xs">Tokens Total</p>
            <p className="text-white font-semibold">${tokensTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Calculation Breakdown */}
        <div className="bg-white/5 rounded-lg p-3">
          <h4 className="text-white font-semibold text-sm mb-2">Calculation Breakdown</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/70">
              <span>Native Coins:</span>
              <span className="text-white">${realTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>ERC-20/BEP-20/SPL Tokens:</span>
              <span className="text-white">${tokensTotal.toFixed(2)}</span>
            </div>
            <div className="h-px bg-white/10 my-1"></div>
            <div className="flex justify-between text-white font-semibold">
              <span>Total Spendable:</span>
              <span>${totalValue.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {expanded && (
          <>
            {/* Native Wallet Details */}
            {wallets.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-white font-semibold text-sm mb-2">Native Wallet Balances</h4>
                <div className="space-y-2">
                  {wallets.map((wallet, i) => (
                    <div key={i} className="text-xs bg-white/5 rounded p-2">
                      <div className="flex justify-between mb-1">
                        <Badge variant="outline" className="text-xs">{wallet.blockchain}</Badge>
                        <span className="text-white/50">{wallet.address.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">
                          {wallet.balance.toFixed(wallet.symbol === 'BTC' ? 8 : 4)} {wallet.symbol}
                        </span>
                        <span className="text-white font-semibold">${wallet.usd_value.toFixed(2)}</span>
                      </div>
                      {wallet.error && (
                        <div className="text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{wallet.error}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token Details */}
            {fetchedTokens.length > 0 && (
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-white font-semibold text-sm mb-2">Token Balances (Raw)</h4>
                <div className="space-y-2">
                  {fetchedTokens.slice(0, 10).map((token, i) => (
                    <div key={i} className="text-xs bg-white/5 rounded p-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-white">{token.symbol || token.name}</span>
                        <Badge variant="outline" className="text-xs">{token.blockchain}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">{token.balance.toFixed(4)}</span>
                        <span className="text-white font-semibold">${(token.usd_value || 0).toFixed(2)}</span>
                      </div>
                      {token.price && (
                        <div className="text-white/50 mt-1">Price: ${token.price.toFixed(6)}</div>
                      )}
                    </div>
                  ))}
                  {fetchedTokens.length > 10 && (
                    <p className="text-white/50 text-xs text-center">
                      ...and {fetchedTokens.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Aggregated Token Display */}
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-white font-semibold text-sm mb-2">Aggregated Display ({tokens.length})</h4>
              <div className="space-y-1 text-xs">
                {tokens.map((token, i) => (
                  <div key={i} className="flex justify-between text-white/70">
                    <span>{token.symbol}</span>
                    <span className="text-white">
                      {token.balance.toFixed(4)} ≈ ${(token.balance * (token.price || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Errors */}
            {(balanceError || tokenError) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Errors Detected
                </h4>
                {balanceError && (
                  <p className="text-red-300 text-xs mb-1">Balance fetch: {balanceError.message}</p>
                )}
                {tokenError && (
                  <p className="text-red-300 text-xs">Token fetch: {tokenError.message}</p>
                )}
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Clock className="w-3 h-3" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}