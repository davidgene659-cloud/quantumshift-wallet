import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Upload, Loader2, AlertTriangle, CheckCircle2, Network } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const networks = [
  { name: 'Bitcoin', symbol: 'BTC', color: 'from-orange-500 to-amber-500' },
  { name: 'Ethereum', symbol: 'ETH', color: 'from-indigo-500 to-purple-500' },
  { name: 'Binance Smart Chain', symbol: 'BSC', color: 'from-amber-500 to-yellow-500' },
  { name: 'Polygon', symbol: 'MATIC', color: 'from-purple-500 to-pink-500' },
  { name: 'Avalanche', symbol: 'AVAX', color: 'from-red-500 to-rose-500' },
  { name: 'Arbitrum', symbol: 'ARB', color: 'from-blue-500 to-cyan-500' },
  { name: 'Optimism', symbol: 'OP', color: 'from-red-500 to-pink-500' },
  { name: 'Solana', symbol: 'SOL', color: 'from-green-500 to-teal-500' },
];

// Renamed to explicit named export
const PrivateKeyImportDialog = ({ isOpen, onClose, onImport }) => {
  const [privateKeys, setPrivateKeys] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [selectedNetworks, setSelectedNetworks] = useState(networks.map(n => n.symbol));

  const toggleNetwork = (symbol) => {
    setSelectedNetworks(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const parseJsonImport = (text) => {
    try {
      const data = JSON.parse(text);
      const wallets = [];
      
      // Handle nested structure like { "Bitcoin": { "Address 1": { "Address": "...", "PrivateKey...": "..." } } }
      if (data.Bitcoin && typeof data.Bitcoin === 'object') {
        Object.values(data.Bitcoin).forEach(wallet => {
          if (wallet.Address && (wallet['PrivateKey(WIF-Compressed)'] || wallet['PrivateKey(WIF-Uncompressed)'])) {
            wallets.push({
              address: wallet.Address,
              privateKey: wallet['PrivateKey(WIF-Compressed)'] || wallet['PrivateKey(WIF-Uncompressed)'],
              network: 'BTC'
            });
          }
        });
      }
      
      return wallets;
    } catch {
      return null;
    }
  };

  const scanPrivateKeys = async () => {
    setIsScanning(true);
    setScanResults([]);

    try {
      // Try parsing as JSON first
      const jsonWallets = parseJsonImport(privateKeys);
      
      if (jsonWallets && jsonWallets.length > 0) {
        // JSON import detected
        const results = jsonWallets.map(wallet => ({
          network: wallet.network,
          address: wallet.address,
          balance: (Math.random() * 0.5).toFixed(8), // Mock balance
          key: wallet.privateKey.substring(0, 10) + '...'
        }));
        setScanResults(results);
      } else {
        // Manual key entry
        const keys = privateKeys.split('\n').filter(k => k.trim());
        if (keys.length === 0) return;

        const results = [];
        for (const key of keys) {
          for (const network of selectedNetworks) {
            const mockAddress = network === 'BTC' 
              ? `${['1', '3', 'bc1'][Math.floor(Math.random() * 3)]}${Math.random().toString(36).substr(2, 9)}`
              : `0x${Math.random().toString(16).substr(2, 40)}`;
            const mockBalance = Math.random() * 10;
            if (mockBalance > 0.01) {
              results.push({
                network,
                address: mockAddress,
                balance: mockBalance.toFixed(4),
                key: key.substring(0, 10) + '...'
              });
            }
          }
        }
        setScanResults(results);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    try {
      const user = await base44.auth.me();
      
      // Map network symbols to blockchain names
      const blockchainMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'BSC': 'bsc',
        'MATIC': 'polygon',
        'SOL': 'solana',
        'AVAX': 'avalanche',
        'ARB': 'arbitrum',
        'OP': 'optimism'
      };
      
      // Save wallets to database
      const walletPromises = scanResults.map(result => 
        base44.entities.ImportedWallet.create({
          user_id: user.id,
          address: result.address,
          blockchain: blockchainMap[result.network] || result.network.toLowerCase(),
          label: `${result.network} Wallet`,
          cached_balance: parseFloat(result.balance) || 0
        })
      );
      
      await Promise.all(walletPromises);
      
      onImport(scanResults);
      setPrivateKeys('');
      setScanResults([]);
      toast.success(`Successfully imported ${scanResults.length} wallet(s)`);
      onClose();
    } catch (error) {
      toast.error('Failed to import wallets: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            Import Private Keys
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Security Warning</p>
              <p className="text-white/70 text-xs mt-1">Never share your private keys. Only import keys you own.</p>
            </div>
          </div>

          {/* Private Keys Input */}
          <div>
            <label className="text-white/70 text-sm mb-2 block">Private Keys</label>
            <Textarea
              value={privateKeys}
              onChange={(e) => setPrivateKeys(e.target.value)}
              placeholder="Paste JSON format or private keys (one per line)&#x0a;&#x0a;Example JSON:&#x0a;{&#x0a;  &quot;Bitcoin&quot;: {&#x0a;    &quot;Address 1&quot;: {&#x0a;      &quot;Address&quot;: &quot;1ABC...&quot;,&#x0a;      &quot;PrivateKey(WIF-Compressed)&quot;: &quot;L...&quot;&#x0a;    }&#x0a;  }&#x0a;}"
              className="bg-white/5 border-white/10 text-white font-mono text-sm h-40"
            />
            <p className="text-white/50 text-xs mt-2">
              Supports bulk JSON import or manual entry (one key per line)
            </p>
          </div>

          {/* Network Selection */}
          <div>
            <label className="text-white/70 text-sm mb-2 block flex items-center gap-2">
              <Network className="w-4 h-4" />
              Scan Networks
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {networks.map((network) => (
                <button
                  key={network.symbol}
                  onClick={() => toggleNetwork(network.symbol)}
                  className={`p-3 rounded-xl border transition-all ${
                    selectedNetworks.includes(network.symbol)
                      ? `bg-gradient-to-br ${network.color} border-white/20`
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{network.symbol}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Scan Button */}
          <Button
            onClick={scanPrivateKeys}
            disabled={isScanning || privateKeys.trim().length === 0 || selectedNetworks.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning {selectedNetworks.length} Networks...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Scan & Import
              </>
            )}
          </Button>

          {/* Scan Results */}
          {scanResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Found Wallets</h4>
                <span className="text-emerald-400 text-sm">{scanResults.length} wallets</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scanResults.map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{result.network}</span>
                      <span className="text-emerald-400 font-bold">{result.balance}</span>
                    </div>
                    <p className="text-white/50 text-xs font-mono">{result.address}</p>
                  </motion.div>
                ))}
              </div>
              <Button onClick={handleImport} className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Import {scanResults.length} Wallets
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Explicit Named Export
export { PrivateKeyImportDialog };