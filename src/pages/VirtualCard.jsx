import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Eye, EyeOff, Lock, Unlock, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AIChatbot from '@/components/chat/AIChatbot';

export default function VirtualCard() {
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [cardStatus, setCardStatus] = useState('active');

  const { data: cards = [] } = useQuery({
    queryKey: ['virtualCards'],
    queryFn: () => base44.entities.VirtualCard.list(),
    initialData: [],
  });

  const activeCard = cards.find(c => c.status === 'active') || {
    card_type: 'virtual',
    card_number_last_four: '4242',
    status: 'active',
    spending_limit_daily: 500,
    crypto_source: 'auto',
    total_spent: 127.50
  };

  const recentTransactions = [
    { merchant: 'Amazon', amount: 45.99, crypto: 'USDC', date: 'Today, 2:30 PM' },
    { merchant: 'Starbucks', amount: 6.75, crypto: 'ETH', date: 'Today, 9:15 AM' },
    { merchant: 'Whole Foods', amount: 75.20, crypto: 'USDC', date: 'Yesterday, 4:20 PM' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Virtual Card</h1>
            <p className="text-white/60">Spend your crypto anywhere, instantly</p>
          </div>
        </div>

        {/* Virtual Card Display */}
        <div className="relative">
          <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-12">
              <CreditCard className="w-12 h-12 text-white/90" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCardNumber(!showCardNumber)}
                className="text-white hover:bg-white/20"
              >
                {showCardNumber ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-white/70 text-sm mb-2">Card Number</p>
                <p className="text-white text-2xl font-mono tracking-wider">
                  {showCardNumber ? `4532 •••• •••• ${activeCard.card_number_last_four}` : '•••• •••• •••• ' + activeCard.card_number_last_four}
                </p>
              </div>

              <div className="flex justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">Daily Limit</p>
                  <p className="text-white text-lg font-semibold">${activeCard.spending_limit_daily}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-1">Spent Today</p>
                  <p className="text-white text-lg font-semibold">${activeCard.total_spent}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-1">Expires</p>
                  <p className="text-white text-lg font-semibold">12/28</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Controls */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
            <Button
              variant="outline"
              className="bg-gray-900/90 border-white/10 text-white hover:bg-gray-800"
              onClick={() => setCardStatus(cardStatus === 'active' ? 'frozen' : 'active')}
            >
              {cardStatus === 'active' ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Freeze Card
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unfreeze Card
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Available to Spend</p>
                  <p className="text-white text-2xl font-bold">$1,247</p>
                  <p className="text-green-400 text-sm mt-1">≈ 0.45 ETH + USDC</p>
                </div>
                <DollarSign className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">This Month</p>
                  <p className="text-white text-2xl font-bold">$2,143</p>
                  <p className="text-white/60 text-sm mt-1">127 transactions</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Saved (vs Fiat)</p>
                  <p className="text-white text-2xl font-bold">$43.20</p>
                  <p className="text-green-400 text-sm mt-1">↑ Smart crypto selection</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Transactions</CardTitle>
            <CardDescription className="text-white/60">Your latest card purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{tx.merchant}</p>
                      <p className="text-white/60 text-sm">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${tx.amount}</p>
                    <p className="text-white/60 text-sm">Paid with {tx.crypto}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white">💡 How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-3">
            <p>✓ <strong>Shop anywhere:</strong> Use this card at any merchant that accepts Visa/Mastercard</p>
            <p>✓ <strong>Instant conversion:</strong> Your crypto is automatically converted to USD at the moment of purchase</p>
            <p>✓ <strong>Smart selection:</strong> AI picks the best crypto to spend based on tax efficiency and market conditions</p>
            <p>✓ <strong>Real money, real shopping:</strong> Works exactly like your regular debit card - in stores, online, everywhere</p>
          </CardContent>
        </Card>

      </div>

      <AIChatbot />
    </div>
  );
}