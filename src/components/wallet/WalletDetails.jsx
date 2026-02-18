import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, Copy, QrCode, ExternalLink, Eye, EyeOff,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Calendar, DollarSign, Coins, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// --- CONFIGURATION: API KEYS ---
// Replace with your own API keys for production. 
const API_KEYS = {
  ethereum: process.env.NEXT_PUBLIC_ETHERSCAN_KEY || "YOUR_ETHERSCAN_KEY",
  bsc: process.env.NEXT_PUBLIC_BSCSCAN_KEY || "YOUR_BSCSCAN_KEY",
  polygon: process.env.NEXT_PUBLIC_POLYGONSCAN_KEY || "YOUR_POLYGONSCAN_KEY",
  avalanche: process.env.NEXT_PUBLIC_SNOWTRACE_KEY || "YOUR_SNOWTRACE_KEY",
  arbitrum: process.env.NEXT_PUBLIC_ARBISCAN_KEY || "YOUR_ARBISCAN_KEY",
  optimism: process.env.NEXT_PUBLIC_OPTIMISM_KEY || "YOUR_OPTIMISM_KEY"
};

// --- UTILS ---
const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

// --- API HELPERS ---
const getRpcUrl = (blockchain) => {
  const map = {
    ethereum: 'https://cloudflare-eth.com',
    bsc: 'https://bsc-dataseed.binance.org',
    polygon: 'https://polygon-rpc.com',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io'
  };
  return map[blockchain] || map.ethereum;
};

const getScanUrl = (blockchain) => {
  const map = {
    ethereum: 'https://api.etherscan.io/api',
    bsc: 'https://api.bscscan.com/api',
    polygon: 'https://api.polygonscan.com/api',
    avalanche: 'https://api.snowtrace.io/api',
    arbitrum: 'https://api.arbiscan.io/api',
    optimism: 'https://api-optimistic.etherscan.io/api'
  };
  return map[blockchain];
};

// --- COMPONENT ---
export default function WalletDetails({ wallet }) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Real Data States
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [nativeBalance, setNativeBalance] = useState({ raw: 0, formatted: '0', usd: 0 });
  
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [loadingBal, setLoadingBal] = useState(false);

  const address = wallet?.address;

  // 1. FETCH NATIVE BALANCE
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    const fetchBalance = async () => {
      setLoadingBal(true);
      try {
        const rpcUrl = getRpcUrl(wallet.blockchain);
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1
          })
        });
        const data = await response.json();
        const wei = parseInt(data.result, 16);
        const ether = wei / 1e18;
        
        // Simple price fetch
        let price = 0;
        try {
            const coinId = wallet.blockchain === 'ethereum' ? 'ethereum' : 
                           wallet.blockchain === 'bsc' ? 'binancecoin' : 'matic-network';
            const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
            const priceData = await priceRes.json();
            price = priceData[coinId].usd;
        } catch(e) { console.log("Price fetch failed"); }

        setNativeBalance({
          raw: wei,
          formatted: ether.toFixed(4),
          usd: ether * price
        });
      } catch (error) {
        console.error("Balance fetch error:", error);
      } finally {
        setLoadingBal(false);
      }
    };
    fetchBalance();
  }, [address, wallet?.blockchain]);

  // 2. FETCH TOKENS
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    if (!['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(wallet.blockchain)) return;

    const fetchTokens = async () => {
      setLoadingTokens(true);
      try {
        const scanUrl = getScanUrl(wallet.blockchain);
        const apiKey = API_KEYS[wallet.blockchain];
        
        // Known high-volume tokens to check (Real logic requires a DB of tokens)
        const tokenContracts = {
          ethereum: ['0xdac17f958d2ee523a2206206994597c13d831ec7', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'], 
          bsc: ['0x55d398326f99059fF775485246999027B3197955', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'], 
          polygon: ['0xc2132D05D31c914a87C6611C10748AEb04B58e8F', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174']
        };
        
        const targets = tokenContracts[wallet.blockchain] || [];
        const realTokens = [];

        for (const contract of targets) {
           const balRes = await fetch(`${scanUrl}?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`);
           const balData = await balRes.json();
           if (parseInt(balData.result) > 0) {
              const metaRes = await fetch(`${scanUrl}?module=token&action=tokeninfo&contractaddress=${contract}&apikey=${apiKey}`);
              const metaData = await metaRes.json();
              if (metaData.status === "1" && metaData.result.length > 0) {
                  const info = metaData.result[0];
                  const rawBal = parseInt(balData.result);
                  const decimals = parseInt(info.divisor) || 18;
                  const formattedBal = (rawBal / (10 ** decimals)).toFixed(4);
                  realTokens.push({
                    symbol: info.symbol,
                    name: info.tokenName,
                    balance: formattedBal,
                    contract: contract
                  });
              }
           }
        }
        setTokens(realTokens);
      } catch (error) {
        console.error("Failed to load tokens:", error);
      } finally {
        setLoadingTokens(false);
      }
    };
    fetchTokens();
  }, [address, wallet?.blockchain]);

  // 3. FETCH TRANSACTIONS
  useEffect(() => {
    if (!address || !wallet?.blockchain) return;
    if (!['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(wallet.blockchain)) return;

    const fetchTransactions = async () => {
      setLoadingTxs(true);
      try {
        const scanUrl = getScanUrl(wallet.blockchain);
        const apiKey = API_KEYS[wallet.blockchain];

        const response = await fetch(`${scanUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`);
        const data = await response.json();

        if (data.status === "1" && data.result) {
          const txs = data.result.map(tx => {
            const isIncoming = tx.to.toLowerCase() === address.toLowerCase();
            const valueEth = parseInt(tx.value) / 1e18;
            const symbol = wallet.blockchain === 'ethereum' ? 'ETH' : wallet.blockchain === 'bsc' ? 'BNB' : 'MATIC';
            
            return {
              hash: tx.hash,
              type: isIncoming ? 'receive' : 'send',
              amount: `${isIncoming ? '+' : '-'}${valueEth.toFixed(4)} ${symbol}`,
              counterparty: isIncoming ? tx.from : tx.to,
              date: new Date(tx.timeStamp * 1000).toLocaleDateString(),
              timestamp: tx.timeStamp
            };
          });
          setTransactions(txs);
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoadingTxs(false);
      }
    };

    fetchTransactions();
  }, [address, wallet?.blockchain]);

  // --- HANDLERS ---
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  // --- RENDER ---
  return (
    <div className="space-y-4">
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
              <span className="text-white/50 text-xs">Main Wallet</span>
              <button
                onClick={() => setShowFullAddress(!showFullAddress)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {showFullAddress ? 
                  <EyeOff className="w-4 h-4 text-white/70" /> : 
                  <Eye className="w-4 h-4 text-white/70" />
                }
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3">
              {showFullAddress ? address : formatAddress(address)}
            </p>
            <div className="flex gap-2">
              <Button onClick={copyAddress} variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button onClick={() => setShowQR(!showQR)} variant="outline" size="sm" className="flex-1 border-white/20 text-white hover:bg-white/10">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-xl p-6 flex flex-col items-center"
              >
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`} 
                  alt="QR Code" 
                  className="w-48 h-48 rounded-xl mb-3"
                />
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
            Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBal ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-xs">Total Balance</p>
                <p className="text-white font-bold text-2xl">{nativeBalance.formatted} {wallet?.blockchain === 'ethereum' ? 'ETH' : 'Tokens'}</p>
                <p className="text-white/70 text-sm">{formatCurrency(nativeBalance.usd)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-white/50 text-xs">24h Change</span>
                  </div>
                  <p className="text-emerald-400 font-bold text-lg">+2.4%</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-white/50 text-xs">Tx Count</span>
                  </div>
                  <p className="text-blue-400 font-bold text-lg">{transactions.length}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Holdings */}
      {wallet && ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(wallet.blockchain) && (
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
                <span className="ml-2 text-white/70">Scanning contracts...</span>
              </div>
            ) : tokens.length > 0 ? (
              <div className="space-y-2">
                {tokens.map((token, idx) => (
                  <div key={idx} className="bg-black/30 rounded-xl p-4 hover:bg-black/40 transition-colors">
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
      )}

      {/* Recent Transactions */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-purple-400 hover:text-purple-300"
              onClick={() => window.open(`${getScanUrl(wallet.blockchain).replace('/api', '')}/address/${address}`, '_blank')}
            >
              View All
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTxs ? (
             <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="ml-2 text-white/70">Loading history...</span>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx, idx) => (
                <div 
                  key={idx}
                  className="bg-black/30 rounded-xl p-4 hover:bg-black/40 transition-colors cursor-pointer"
                  onClick={() => window.open(`${getScanUrl(wallet.blockchain).replace('/api', '')}/tx/\${tx.hash}`, '_blank')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center \${
                        tx.type === 'receive' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx{tx.type === 'receive' ? 
                          <ArrowDownRight className="w-5 h-5" /> : 
                          <ArrowUpRight className="w-5 h-5" />
                        }
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{tx.amount}</p>
                        <p className="text-white/50 text-xs">
                          {tx.type === 'receive' ? `From ${formatAddress(tx.counterparty)}` : `To ${formatAddress(tx.counterparty)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs">{tx.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
               <Calendar className="w-12 h-12 text-white/30 mx-auto mb-2" />
               <p className="text-white/50 text-sm">No recent transactions</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}