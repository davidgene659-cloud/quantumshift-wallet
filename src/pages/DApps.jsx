import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, TrendingUp, Shield, Coins, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import AIChatbot from '@/components/chat/AIChatbot';

const dapps = [
  { name: 'Uniswap', category: 'DEX', icon: '🦄', description: 'Leading decentralized exchange', url: 'https://app.uniswap.org', color: 'from-pink-500 to-rose-500', tvl: '$4.2B' },
  { name: 'Aave', category: 'Lending', icon: '👻', description: 'Decentralized lending protocol', url: 'https://app.aave.com', color: 'from-purple-500 to-indigo-500', tvl: '$10.5B' },
  { name: 'Curve', category: 'DEX', icon: '🌀', description: 'Stablecoin-focused DEX', url: 'https://curve.fi', color: 'from-blue-500 to-cyan-500', tvl: '$3.8B' },
  { name: 'Lido', category: 'Staking', icon: '🔱', description: 'Liquid staking solution', url: 'https://lido.fi', color: 'from-teal-500 to-emerald-500', tvl: '$22.1B' },
  { name: 'MakerDAO', category: 'Stablecoin', icon: '🏦', description: 'DAI stablecoin protocol', url: 'https://makerdao.com', color: 'from-green-500 to-lime-500', tvl: '$5.7B' },
  { name: 'Compound', category: 'Lending', icon: '⚡', description: 'Algorithmic money market', url: 'https://app.compound.finance', color: 'from-emerald-500 to-teal-500', tvl: '$2.9B' },
  { name: 'PancakeSwap', category: 'DEX', icon: '🥞', description: 'BSC leading DEX', url: 'https://pancakeswap.finance', color: 'from-amber-500 to-orange-500', tvl: '$1.8B' },
  { name: '1inch', category: 'Aggregator', icon: '🔄', description: 'DEX aggregator', url: 'https://app.1inch.io', color: 'from-red-500 to-pink-500', tvl: '$500M+' },
  { name: 'GMX', category: 'Derivatives', icon: '📈', description: 'Decentralized perpetuals', url: 'https://gmx.io', color: 'from-indigo-500 to-purple-500', tvl: '$520M' },
  { name: 'Balancer', category: 'DEX', icon: '⚖️', description: 'Programmable liquidity', url: 'https://app.balancer.fi', color: 'from-violet-500 to-purple-500', tvl: '$1.1B' },
];

const categories = ['All', 'DEX', 'Lending', 'Staking', 'Stablecoin', 'Aggregator', 'Derivatives'];

export default function DApps() {
  const [activeCategory, setActiveCategory] = React.useState('All');

  const filteredDapps = activeCategory === 'All' 
    ? dapps 
    : dapps.filter(d => d.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Portfolio')}>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">DeFi DApps</h1>
              <p className="text-white/50 text-sm">Top decentralized applications</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Coins, label: 'Total TVL', value: '$53.3B', color: 'text-emerald-400' },
            { icon: TrendingUp, label: 'DApps Listed', value: dapps.length, color: 'text-white' },
            { icon: Shield, label: 'Audited', value: '100%', color: 'text-blue-400' },
            { icon: Repeat, label: '24h Volume', value: '$2.8B', color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-white/70 text-sm">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* DApps Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredDapps.map((dapp, index) => (
            <motion.a
              key={dapp.name}
              href={dapp.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ y: -4 }}
              className="group bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dapp.color} flex items-center justify-center text-3xl`}>
                    {dapp.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                      {dapp.name}
                    </h3>
                    <span className="text-white/50 text-xs">{dapp.category}</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
              </div>

              <p className="text-white/70 text-sm mb-4">{dapp.description}</p>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-white/50 text-xs">Total Value Locked</span>
                <span className="text-emerald-400 font-bold">{dapp.tvl}</span>
              </div>
            </motion.a>
          ))}
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex items-start gap-4"
        >
          <Shield className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
          <div>
            <h4 className="text-white font-semibold mb-2">Connect with Your Wallet</h4>
            <p className="text-white/70 text-sm">
              Your wallet will automatically connect to these DApps. Always verify the URL and smart contracts before interacting. 
              All listed protocols are audited, but DeFi carries risks. Only invest what you can afford to lose.
            </p>
          </div>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
}