import React from 'react';
import { Repeat, Zap, Lock, ExternalLink } from 'lucide-react';

const bridges = [
  {
    name: 'Stargate',
    icon: '🌟',
    description: 'LayerZero-powered cross-chain bridge with native assets',
    color: 'from-cyan-500 to-blue-500',
    chains: '7+',
    features: ['Native Assets', 'Instant Finality', 'Unified Liquidity'],
    url: 'https://stargate.finance'
  },
  {
    name: 'Synapse',
    icon: '🔗',
    description: 'Multi-chain bridge with optimistic verification',
    color: 'from-purple-500 to-indigo-500',
    chains: '15+',
    features: ['Multi-chain', 'Low Fees', 'Fast Transfers'],
    url: 'https://synapseprotocol.com'
  },
  {
    name: 'Hop Protocol',
    icon: '🦘',
    description: 'Rollup-to-rollup bridge with AMM-based transfers',
    color: 'from-pink-500 to-rose-500',
    chains: '10+',
    features: ['L2 to L2', 'AMM Bridge', 'Fast Exits'],
    url: 'https://hop.exchange'
  },
  {
    name: 'Across',
    icon: '⚡',
    description: 'Optimistic bridge with capital-efficient transfers',
    color: 'from-orange-500 to-amber-500',
    chains: '8+',
    features: ['Optimistic', 'Low Slippage', 'Intent-based'],
    url: 'https://across.to'
  }
];

export default function CrossChainBridges() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Repeat className="w-6 h-6 text-cyan-400" />
        <h3 className="text-xl font-bold text-white">Cross-Chain Bridges</h3>
      </div>

      {bridges.map((bridge) => (
        <a
          key={bridge.name}
          href={bridge.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bridge.color} flex items-center justify-center text-2xl`}>
                {bridge.icon}
              </div>
              <div>
                <h4 className="text-white font-semibold group-hover:text-cyan-400 transition-colors">
                  {bridge.name}
                </h4>
                <p className="text-white/50 text-xs">{bridge.chains} chains supported</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-cyan-400 transition-colors" />
          </div>

          <p className="text-white/70 text-sm mb-3">{bridge.description}</p>

          <div className="flex flex-wrap gap-2">
            {bridge.features.map((feature) => (
              <span key={feature} className="text-xs px-2 py-1 bg-cyan-500/20 rounded-full text-cyan-300">
                {feature}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}