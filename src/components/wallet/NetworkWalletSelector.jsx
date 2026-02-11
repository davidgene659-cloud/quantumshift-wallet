import React from 'react';
import { ChevronDown } from 'lucide-react';
import { getNetworkDisplay } from './NetworkTokens';

export default function NetworkWalletSelector({ wallets, selectedWalletId, onSelectWallet }) {
  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  if (!selectedWallet) return null;

  const primaryNetwork = selectedWallet.networks?.[0];
  const networkDisplay = primaryNetwork ? getNetworkDisplay(primaryNetwork) : { symbol: 'Unknown', color: 'from-gray-500' };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/70 text-xs uppercase tracking-wider">Network Wallet</label>
      <div className="relative">
        <select
          value={selectedWalletId}
          onChange={(e) => onSelectWallet(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:bg-white/15 transition-all"
        >
          {wallets.map(wallet => {
            const network = wallet.networks?.[0] || 'Unknown';
            const display = getNetworkDisplay(network);
            return (
              <option key={wallet.id} value={wallet.id}>
                {wallet.wallet_name} ({display.symbol})
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${networkDisplay.color} flex items-center justify-center text-xs font-bold text-white`}>
            {networkDisplay.symbol[0]}
          </div>
          <ChevronDown className="w-4 h-4 text-white/50" />
        </div>
      </div>
    </div>
  );
}