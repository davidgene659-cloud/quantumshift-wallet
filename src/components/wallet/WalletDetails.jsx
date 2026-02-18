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
  DollarSign,
  Coins,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Use the global libraries loaded from the CDN in index.html
const { ethers } = window;
const axios = window.axios;

// Helper to truncate for display when toggled off
const truncate = (str, start = 6, end = 4) =>
  str ? `${str.slice(0, start)}...${str.slice(-end)}` : '';

// Zerion API key (replace with your own if needed)
const ZERION_API_KEY = '13f4f9612cdb4951b76b4c442ea42dfb';

export default function WalletDetails({ wallet }) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [nativeBalance, setNativeBalance] = useState('0');
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
        case 'ethereum': return 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'; // Replace with your Infura key or use a public endpoint
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
      setNativeBalance(ethers.formatEther(bal));
    }).catch(console.error);
  }, [address, wallet?.blockchain]);

  // Fetch token balances using Zerion API
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    const supportedChains = ['ethereum', 'base', 'polygon', 'bsc', 'arbitrum', 'optimism'];
    if (!supportedChains.includes(wallet.blockchain)) return;
    setLoadingTokens(true);

    // Zerion API endpoint – returns all positions (tokens, DeFi, NFTs) for the wallet
    const ZERION_URL = `https://api.zerion.io/v1/wallets/${address}/positions/`;

    axios.get(ZERION_URL, {
      headers: {
        'Authorization': `Basic ${btoa(ZERION_API_KEY + ':')}`,
        'Accept': 'application/json'
      },
      params: {
        'currency': 'usd' // optional, to get USD values
      }
    })
    .then((response) => {
      const positions = response.data.data;
      // Filter for fungible tokens that have a balance > 0
      const tokenBalances = positions
        .filter(pos => 
          pos.attributes.quantity && 
          pos.attributes.fungible_info && 
          parseFloat(pos.attributes.quantity.float) > 0
        )
        .map(pos => ({
          symbol: pos.attributes.fungible_info.symbol,
          name: pos.attributes.fungible_info.name,
          balance: pos.attributes.quantity.float,
          decimals: pos.attributes.quantity.decimals,
          address: pos.relationships.chain?.data?.id, // This is the chain id, not token contract
          // Optionally include USD value
          valueUsd: pos.attributes.value
        }));
      setTokens(tokenBalances);
    })
    .catch((error) => {
      console.error('Failed to load tokens with Zerion:', error);
      toast.error('Failed to load token balances. Check your API key or network.');
    })
    .finally(() => setLoadingTokens(false));
  }, [address, wallet?.blockchain]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const nativeSymbol = (() => {
    switch (wallet?.blockchain) {
      case 'ethereum': return 'ETH';
      case 'base': return 'ETH';
      case 'polygon': return 'MATIC';
      case 'bsc': return 'BNB';
      case 'arbitrum': return 'ETH';
      case 'optimism': return 'ETH';
      default: return '';
    }
  })();

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
              >
                {showFullAddress ? <EyeOff className="w-4 h-4 text-white/70" /> : <Eye className="w-4 h-4 text-white/70" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {showFullAddress ? address : truncate(address)}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(address, 'Address')} variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={() => setShowQR(!showQR)} variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>

          {/* QR Code (shown when toggled) */}
          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-black/30 rounded-xl p-4 flex justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`}
                    alt="Wallet Address QR Code"
                    className="w-40 h-40 rounded-lg"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Private Key Section */}
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">Private Key</span>
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4 text-white/70" /> : <Eye className="w-4 h-4 text-white/70" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {showPrivateKey ? privateKey : truncate(privateKey, 8, 8)}
            </p>
            <Button onClick={() => copyToClipboard(privateKey, 'Private key')} variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
              <Copy className="w-4 h-4 mr-2" />
              Copy Private Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balances Card */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Native Balance */}
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-xs">Native Balance</span>
              <span className="text-white font-mono text-sm">
                {parseFloat(nativeBalance).toFixed(6)} {nativeSymbol}
              </span>
            </div>
          </div>

          {/* Token Balances */}
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">Token Balances</span>
              {loadingTokens && <Loader2 className="w-4 h-4 text-white/50 animate-spin" />}
            </div>
            {tokens.length === 0 && !loadingTokens && (
              <p className="text-white/50 text-sm text-center py-2">No token balances found</p>
            )}
            {tokens.map((token, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                <div>
                  <span className="text-white text-sm font-medium">{token.symbol}</span>
                  <span className="text-white/50 text-xs ml-2">{token.name}</span>
                </div>
                <span className="text-white font-mono text-sm">
                  {parseFloat(token.balance).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  Copy,
  QrCode,
  Eye,
  EyeOff,
  DollarSign,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const { ethers } = window;

const truncate = (str, start = 6, end = 4) =>
  str ? `${str.slice(0, start)}...${str.slice(-end)}` : '';

export default function WalletDetails({ wallet }) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!wallet?.mnemonic) return;
    try {
      const hdNode = ethers.HDNodeWallet.fromPhrase(wallet.mnemonic);
      setAddress(hdNode.address);
    } catch (e) {
      console.error('Failed to derive address:', e);
    }
  }, [wallet?.mnemonic]);

  useEffect(() => {
    if (!wallet?.id) return;
    const fetchPrivateKey = async () => {
      setLoadingKey(true);
      try {
        const response = await fetch(`/api/get-private-key?wallet_id=${wallet.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // adjust auth
        });
        const data = await response.json();
        if (data.private_key) setPrivateKey(data.private_key);
        else toast.error('Private key not found');
      } catch (err) {
        console.error('Failed to fetch private key:', err);
        toast.error('Could not load private key');
      } finally {
        setLoadingKey(false);
      }
    };
    fetchPrivateKey();
  }, [wallet?.id]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-red-900/30 border-red-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div className="text-xs text-red-300">
            <strong>Security Warning:</strong> Private key shown for development only. Never expose in production.
          </div>
        </CardContent>
      </Card>

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
              <button onClick={() => setShowFullAddress(!showFullAddress)} className="p-1 hover:bg-white/10 rounded-lg">
                {showFullAddress ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {showFullAddress ? address : truncate(address)}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => copyToClipboard(address, 'Address')} variant="outline" size="sm" className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button onClick={() => setShowQR(!showQR)} variant="outline" size="sm" className="flex-1">
                <QrCode className="w-4 h-4 mr-2" /> QR Code
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-black/30 rounded-xl p-4 flex justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`} alt="QR" className="w-40 h-40 rounded-lg" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs">Private Key</span>
              <button onClick={() => setShowPrivateKey(!showPrivateKey)} className="p-1 hover:bg-white/10 rounded-lg" disabled={loadingKey}>
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3 break-all">
              {loadingKey ? 'Loading...' : (showPrivateKey ? privateKey : truncate(privateKey))}
            </p>
            <Button onClick={() => copyToClipboard(privateKey, 'Private key')} variant="outline" size="sm" className="w-full" disabled={!privateKey}>
              <Copy className="w-4 h-4 mr-2" /> Copy Private Key
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}