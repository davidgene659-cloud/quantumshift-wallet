import React from 'react';
import { Target, TrendingUp, Users, ExternalLink } from 'lucide-react';

const predictionMarkets = [
  {
    name: 'Polymarket',
    icon: '🎯',
    description: 'Bet on world events with real-time odds and deep liquidity',
    color: 'from-purple-500 to-pink-500',
    volume: '$100M+',
    features: ['Politics', 'Sports', 'Crypto', 'Current Events'],
    url: 'https://polymarket.com'
  },
  {
    name: 'Augur',
    icon: '🔮',
    description: 'Decentralized oracle and prediction market platform',
    color: 'from-orange-500 to-amber-500',
    volume: '$50M+',
    features: ['Custom Markets', 'Oracle System', 'REP Staking'],
    url: 'https://augur.net'
  },
  {
    name: 'Gnosis',
    icon: '⚖️',
    description: 'Conditional tokens and prediction market infrastructure',
    color: 'from-teal-500 to-cyan-500',
    volume: '$30M+',
    features: ['Conditional Tokens', 'Market Creation', 'Resolution'],
    url: 'https://gnosis.io'
  }
];

export default function PredictionMarkets() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Prediction Markets</h3>
      </div>

      {predictionMarkets.map((market) => (
        <a
          key={market.name}
          href={market.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${market.color} flex items-center justify-center text-2xl`}>
                {market.icon}
              </div>
              <div>
                <h4 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                  {market.name}
                </h4>
                <p className="text-white/50 text-xs">Volume: {market.volume}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
          </div>

          <p className="text-white/70 text-sm mb-3">{market.description}</p>

          <div className="flex flex-wrap gap-2">
            {market.features.map((feature) => (
              <span key={feature} className="text-xs px-2 py-1 bg-purple-500/20 rounded-full text-purple-300">
                {feature}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}