import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function WalletDetails({ wallet }) {
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const mockAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  const mockTransactions = [
    { type: 'receive', amount: '+0.5 ETH', usd: '+$1,245.50', date: '2 hours ago', from: '0x9a7...3bc' },
    { type: 'send', amount: '-0.15 ETH', usd: '-$373.65', date: '5 hours ago', to: '0x5f2...8de' },
    { type: 'receive', amount: '+100 USDT', usd: '+$100.00', date: '1 day ago', from: '0x1c4...9af' },
    { type: 'send', amount: '-0.02 BTC', usd: '-$1,120.00', date: '2 days ago', to: '0x8b3...2cd' },
  ];

  const copyAddress = () => {
    navigator.clipboard.writeText(mockAddress);
    toast.success('Address copied to clipboard');
  };

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
                style={{ minHeight: '36px', minWidth: '36px' }}
              >
                {showFullAddress ? 
                  <EyeOff className="w-4 h-4 text-white/70" /> : 
                  <Eye className="w-4 h-4 text-white/70" />
                }
              </button>
            </div>
            <p className="text-white font-mono text-sm mb-3">
              {showFullAddress ? mockAddress : `${mockAddress.slice(0, 6)}...${mockAddress.slice(-4)}`}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={copyAddress}
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                style={{ minHeight: '44px' }}
              >
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

      {/* Recent Transactions */}
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
          <div className="space-y-3">
            {mockTransactions.map((tx, idx) => (
              <div 
                key={idx}
                className="bg-black/30 rounded-xl p-4 hover:bg-black/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'receive' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.type === 'receive' ? 
                        <ArrowDownRight className="w-5 h-5" /> : 
                        <ArrowUpRight className="w-5 h-5" />
                      }
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{tx.amount}</p>
                      <p className="text-white/50 text-xs">
                        {tx.type === 'receive' ? `From ${tx.from}` : `To ${tx.to}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${
                      tx.type === 'receive' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.usd}
                    </p>
                    <p className="text-white/50 text-xs">{tx.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}