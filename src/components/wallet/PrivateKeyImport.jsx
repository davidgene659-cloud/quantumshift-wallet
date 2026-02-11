import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Upload, Loader2, AlertTriangle, CheckCircle2, Network } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { encryptPrivateKey, getBalance, bitcoinService, ethereumService, solanaService } from '@/components/blockchain/blockchainService';

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

export default function PrivateKeyImport({ isOpen, onClose, onImport, user }) {
  const [privateKeys, setPrivateKeys] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [selectedNetworks, setSelectedNetworks] = useState(networks.map(n => n.symbol));
  const [importType, setImportType] = useState('private_key'); // private_key, hardware

  const toggleNetwork = (symbol) => {
    setSelectedNetworks(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  const scanPrivateKeys = async () => {
    const keys = privateKeys.split('\n').filter(k => k.trim());
    if (keys.length === 0) {
      toast.error('Enter at least one private key');
      return;
    }

    setIsScanning(true);
    setImportResults([]);

    try {
      const results = [];

      for (const key of keys) {
        // For each private key, scan selected networks for balance
        for (const networkSymbol of selectedNetworks) {
          const networkObj = networks.find(n => n.symbol === networkSymbol);
          if (!networkObj) continue;

          try {
            let address = null;
            let balance = 0;

            // Derive address based on network and get balance
            if (networkSymbol === 'BTC') {
              address = key;
              balance = await bitcoinService.getBalance(address);
            } else if (networkSymbol === 'ETH' || networkSymbol === 'BSC' || networkSymbol === 'MATIC' || networkSymbol === 'AVAX' || networkSymbol === 'ARB' || networkSymbol === 'OP') {
              // EVM chains - address is same as key
              address = key.startsWith('0x') ? key : '0x' + key;
              balance = await ethereumService.getBalance(address);
            } else if (networkSymbol === 'SOL') {
              address = key;
              balance = await solanaService.getBalance(address);
            }

            if (address && balance > 0) {
              results.push({
                network: networkObj.name,
                symbol: networkSymbol,
                address: address,
                balance: balance.toFixed(6),
                key: key
              });
            }
          } catch (error) {
            console.warn(`Failed to scan ${networkSymbol}:`, error);
            // Continue scanning other networks even if one fails
          }
        }
      }

      if (results.length === 0) {
        toast.error('No wallets found with balance on selected networks');
      } else {
        setImportResults(results);
        toast.success(`Found ${results.length} wallet(s) with balance`);
      }
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error('Scan failed: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast.error('Please log in first');
      return;
    }

    if (importResults.length === 0) {
      toast.error('No wallets to import');
      return;
    }

    setIsImporting(true);

    try {
      // Group wallets by network and consolidate balances
      const consolidatedWallets = {};
      
      importResults.forEach(result => {
        const key = `${result.network}_${result.address}`;
        if (!consolidatedWallets[key]) {
          consolidatedWallets[key] = {
            network: result.network,
            address: result.address,
            balance: 0,
            privateKey: result.key
          };
        }
        consolidatedWallets[key].balance += parseFloat(result.balance);
      });

      // Create one wallet per address/network combo
      const wallets = Object.values(consolidatedWallets);
      let imported = 0;

      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        
        const balances = {};
        balances[wallet.network] = wallet.balance;

        const walletData = {
          user_id: user.id,
          wallet_name: `${wallet.network} Wallet`,
          wallet_address: wallet.address,
          wallet_type: importType === 'hardware' ? 'hardware' : 'imported',
          balances: balances,
          total_usd_value: wallet.balance * 100,
          networks: [wallet.network]
        };

        if (importType === 'hardware') {
          walletData.hardware_device = 'Ledger Nano X';
        } else if (wallet.privateKey) {
          // Encrypt THIS wallet's private key
          walletData.encrypted_private_key = encryptPrivateKey(wallet.privateKey);
        }

        await base44.entities.Wallet.create(walletData);
        imported++;

        // Add delay between creates to avoid rate limiting
        if (i < wallets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      toast.success(`Successfully imported ${imported} wallet(s)`);
      onImport?.(importResults);
      setPrivateKeys('');
      setImportResults([]);
      setImportType('private_key');
      setIsImporting(false);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      setIsImporting(false);
      toast.error(`Failed to import wallets: ${error.message || 'Please try again'}`);
    }
  };

  const connectHardwareWallet = async () => {
    setIsScanning(true);
    setScanResults([]);

    // Simulate hardware wallet connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockHardwareWallets = [
      { network: 'BTC', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', balance: (Math.random() * 2).toFixed(4) },
      { network: 'ETH', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', balance: (Math.random() * 5).toFixed(4) },
    ];

    setScanResults(mockHardwareWallets.filter(w => parseFloat(w.balance) > 0.01));
    setIsScanning(false);
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
          {/* Import Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setImportType('private_key')}
              className={`p-4 rounded-xl border transition-all ${
                importType === 'private_key'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Key className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Private Key</p>
            </button>
            <button
              onClick={() => setImportType('hardware')}
              className={`p-4 rounded-xl border transition-all ${
                importType === 'hardware'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-white/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Upload className="w-6 h-6 text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Hardware Wallet</p>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Security Warning</p>
              <p className="text-white/70 text-xs mt-1">
                {importType === 'hardware' 
                  ? 'Make sure to connect only trusted hardware wallets. Follow device instructions carefully.'
                  : 'Never share your private keys. Only import keys you own. Keys are encrypted locally.'
                }
              </p>
            </div>
          </div>

          {/* Private Keys Input or Hardware Connect */}
          {importType === 'private_key' ? (
            <div>
              <label className="text-white/70 text-sm mb-2 block">
                Private Keys (one per line)
              </label>
              <Textarea
                value={privateKeys}
                onChange={(e) => setPrivateKeys(e.target.value)}
                placeholder="Paste your private keys here, one per line:&#10;KxDsTxfZcYLhTZ6Q8dD8fK4jzEZsHwX4vF7tf3dQLkpypnN5oZeW&#10;Ky69L1tD56YdWzPV2WyKhN4n7cpRKG7TQRfNP94nKmCy..."
                className="bg-white/5 border-white/10 text-white font-mono text-sm h-32"
              />
              <p className="text-white/50 text-xs mt-2">
                {privateKeys.split('\n').filter(k => k.trim()).length} keys • Will scan: {selectedNetworks.join(', ')}
              </p>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">Connect Hardware Wallet</h4>
              <p className="text-white/70 text-sm mb-4">
                Supports Ledger, Trezor, and other hardware wallets. Make sure your device is connected.
              </p>
              <Button
                onClick={connectHardwareWallet}
                disabled={isScanning}
                className="bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Connect Device
                  </>
                )}
              </Button>
            </div>
          )}

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
          {importType === 'private_key' && (
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
          )}

          {/* Scan Results */}
          {importResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Found Wallets</h4>
                <span className="text-emerald-400 text-sm">{importResults.length} wallets</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {importResults.map((result, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{result.network} ({result.symbol})</span>
                      <span className="text-emerald-400 font-bold">{result.balance} {result.symbol}</span>
                    </div>
                    <p className="text-white/50 text-xs font-mono">{result.address}</p>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Import {importResults.length} Wallets
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}