import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Copy,
  QrCode,
  ExternalLink,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Coins,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import axios from 'axios';

// Helper to truncate for display when toggled off (JSX version)
const truncate = (str, start = 6, end = 4) =>
  `${str.slice(0, start)}...${str.slice(-end)}`;

// Real token list for Base chain (add more if needed)
const BASE_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum', address: 'native', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531736b58', decimals: 6 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  { symbol: 'VVV', name: 'Venice Token', address: '0xacfE6019Ed1A7Dc6f7B508C02d1b04ec88cC21bf', decimals: 18 },
];

export default function WalletDetails({ wallet }) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [ethBalance, setEthBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');

  // Derive wallet from mnemonic
  useEffect(() => {
    if (!wallet?.mnemonic) return;
    try {
      const hdNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic);
      setPrivateKey(hdNode.privateKey);
      setAddress(hdNode.address);
    } catch (e) {
      console.error('Failed to derive wallet:', e);
      toast.error('Invalid mnemonic');
    }
  }, [wallet?.mnemonic]);

  // Fetch native balance
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    const rpcUrl = (() => {
      switch (wallet.blockchain) {
        case 'ethereum': return 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
        case 'base': return 'https://mainnet.base.org';
        case 'polygon': return 'https://polygon-rpc.com';
        case 'bsc': return 'https://bsc-dataseed.binance.org';
        case 'arbitrum': return 'https://arb1.arbitrum.io/rpc';
        case 'optimism': return 'https://mainnet.optimism.io';
        default: return null;
      }
    })();
    if (!rpcUrl) return;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    provider.getBalance(address).then((bal) => {
      setEthBalance(ethers.formatEther(bal));
    }).catch(console.error);
  }, [address, wallet?.blockchain]);

  // Fetch token balances (ERC-20) via 1inch or Moralis
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    const supportedChains = ['ethereum', 'base', 'polygon', 'bsc', 'arbitrum', 'optimism'];
    if (!supportedChains.includes(wallet.blockchain)) return;
    setLoadingTokens(true);
    // Example: 1inch token balances API (requires API key)
    const chainIdMap = {
      ethereum: 1,
      base: 8453,
      polygon: 137,
      bsc: 56,
      arbitrum: 42161,
      optimism: 10,
    };
    const chainId = chainIdMap[wallet.blockchain];
    const tokenAddresses = BASE_TOKENS.filter(t => t.address !== 'native').map(t => t.address).join(',');
    axios
      .get(`https://api.1inch.dev/swap/v6.0/${chainId}/wallets/${address}/balances`, {
        headers: { Authorization: `Bearer YOUR_1INCH_API_KEY` },
        params: { tokens: tokenAddresses }
      })
      .then((res) => {
        const data = res.data;
        const balances = Object.entries(data)
          .filter(([_, bal]) => bal !== '0')
          .map(([addr, bal]) => {
            const token = BASE_TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());
            if (!token) return null;
            const formatted = ethers.formatUnits(bal, token.decimals);
            return { ...token, balance: formatted };
          })
          .filter(Boolean);
        setTokens(balances);
      })
      .catch(() => {
        // Fallback to Moralis if 1inch fails (requires API key)
        axios
          .post('https://deep-index.moralis.io/api/v2.2/wallets/tokens', {
            address,
            limit: 20,
            chain: wallet.blockchain
          }, {
            headers: { 'X-API-Key': 'YOUR_MORALIS_API_KEY' }
          })
          .then((res) => {
            setTokens(res.data.result.map((t) => ({
              symbol: t.symbol,
              name: t.name,
              address: t.token_address,
              decimals: t.decimals,
              balance: ethers.formatUnits(t.balance, t.decimals)
            })));
          })
          .catch((e) => {
            console.error('Failed to load tokens:', e);
            toast.error('Failed to load token balances');
          })
          .finally(() => setLoadingTokens(false));
      })
      .finally(() => setLoadingTokens(false));
  }, [address, wallet?.blockchain]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`\${label} copied to clipboard`);
  };

  return (
    <div className="space-y-4">
      {/* Security Warning */}
      <Card className="bg-red-900/30 border-red-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-xs text-red-300">
            <strong>Security Warning:</strong> Your private key is displayed here for development only. Never expose private keys in production or share them with anyone.
          </div>
        </CardContent>
      </Card>

      {/* Wallet Address Card */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">Address</span>
              <button
                onClick={() => setShowFullAddress(!showFullAddress)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                style={{ minHeight: '36px', minWidth: '36px' }}
              >
                {showFullAddress ? <EyeOff className="w-4 h-4 text-white/70" /> : <Eye className="w-4 h-4 text-white/70" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {showFullAddress ? address : truncate(address)}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(address, 'Address')} variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10" style={{ minHeight: '44px' }}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                onClick={() => setShowQR(!showQR)}
               variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                style={{ minHeight: '44px' }}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>

          {/* Private Key Section */}
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">Private Key</span>
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                style={{ minHeight: '36px', minWidth: '36px' }}
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4 text-white/70" /> : <Eye className="w-4 h-4 text-white/70" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {showPrivateKey ? privateKey : truncate(privateKey, 6, 4)}
            </p>
            <Button
              onClick={() => copyToClipboard(privateKey, 'Private Key')}
              variant="outline"
              size="sm"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              style={{ minHeight: '44px' }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Private Key
            </Button>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-xl p-6 flex flex-col items-center"
              >
                <div className="w-48 h-48 bg-gray-200 rounded-xl flex items-center justify-center mb-3">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
                <p className="text-gray-600 text-xs text-center">Scan to send crypto to this wallet</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Portfolio Stats */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Portfolio Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-white/50 text-xs">24h Change</span>
              </div>
              <p className="text-emerald-400 font-bold text-lg">+$1,847.25</p>
              <p className="text-emerald-400 text-xs">+5.42%</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-white/50 text-xs">30d Change</span>
              </div>
              <p className="text-blue-400 font-bold text-lg">+$8,234.50</p>
              <p className="text-blue-400 text-xs">+28.15%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Native Balance */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Native Balance ({wallet?.blockchain?.toUpperCase() || 'ETH'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black/30 rounded-xl p-4">
            <p className="text-white font-semibold text-lg">{ethBalance} ETH</p>
            <p className="text-white/50 text-xs">Current balance</p>
          </div>
        </CardContent>
      </Card>

      {/* Token Holdings */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Token Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTokens ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="ml-2 text-white/70">Loading tokens...</span>
            </div>
          ) : tokens.length > 0 ? (
            <div className="space-y-2">
              {tokens.map((token, idx) => (
                <div
                  key={idx}
                  className="bg-black/30 rounded-xl p-4 hover:bg-black/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{token.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{token.symbol}</p>
                        <p className="text-white/50 text-xs">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{token.balance}</p>
                      <p className="text-white/50 text-xs">{token.symbol}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Coins className="w-12 h-12 text-white/30 mx-auto mb-2" />
              <p className="text-white/50 text-sm">No tokens found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions (placeholder) */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300"
              style={{ minHeight: '44px' }}
            >
              View All
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-white/50 text-sm">Transaction history not implemented yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}