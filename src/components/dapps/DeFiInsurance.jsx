import React from 'react';
import { Shield, Lock, TrendingUp, ExternalLink } from 'lucide-react';

const insuranceProtocols = [
  {
    name: 'Nexus Mutual',
    icon: '🛡️',
    description: 'Decentralized insurance for smart contracts and protocol risks',
    color: 'from-blue-500 to-cyan-500',
    coverage: '$500M+',
    features: ['Smart Contract Cover', 'Protocol Cover', 'Yield Token Cover'],
    url: 'https://nexusmutual.io'
  },
  {
    name: 'Unslashed',
    icon: '⚡',
    description: 'Insurance marketplace with customizable coverage options',
    color: 'from-purple-500 to-pink-500',
    coverage: '$100M+',
    features: ['Validator Insurance', 'DeFi Coverage', 'Custom Policies'],
    url: 'https://unslashed.finance'
  },
  {
    name: 'InsurAce',
    icon: '🔐',
    description: 'Multi-chain insurance protocol with portfolio protection',
    color: 'from-emerald-500 to-teal-500',
    coverage: '$200M+',
    features: ['Multi-chain', 'Portfolio Cover', 'Risk Assessment'],
    url: 'https://www.insurace.io'
  }
];

export default function DeFiInsurance() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-bold text-white">DeFi Insurance</h3>
      </div>

      {insuranceProtocols.map((protocol) => (
        <a
          key={protocol.name}
          href={protocol.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-5 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${protocol.color} flex items-center justify-center text-2xl`}>
                {protocol.icon}
              </div>
              <div>
                <h4 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                  {protocol.name}
                </h4>
                <p className="text-white/50 text-xs">Coverage: {protocol.coverage}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-white/30 group-hover:text-blue-400 transition-colors" />
          </div>

          <p className="text-white/70 text-sm mb-3">{protocol.description}</p>

          <div className="flex flex-wrap gap-2">
            {protocol.features.map((feature) => (
              <span key={feature} className="text-xs px-2 py-1 bg-blue-500/20 rounded-full text-blue-300">
                {feature}
              </span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}