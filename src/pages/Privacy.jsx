import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Globe, Zap, Lock, Eye, Server, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DIDManager from '@/components/identity/DIDManager';

const vpnTiers = [
  {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    data: '1 GB/month',
    features: ['Basic encryption', '1 server location', 'Standard speed', 'No logs'],
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    data: '50 GB/month',
    features: ['Military-grade encryption', '10 server locations', 'High speed', 'No logs', 'Kill switch'],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    data: '200 GB/month',
    features: ['Military-grade encryption', '50+ server locations', 'Ultra-fast speed', 'No logs', 'Kill switch', 'Multi-hop', 'Dedicated IP option'],
    color: 'from-purple-500 to-pink-500',
    popular: true
  },
  {
    id: 'ultra',
    name: 'Ultra Privacy',
    price: 19.99,
    data: 'Unlimited',
    features: ['Quantum-resistant encryption', '100+ server locations', 'Maximum speed', 'Zero logs', 'Kill switch', 'Multi-hop', 'Dedicated IP', 'Tor over VPN', 'Obfuscated servers'],
    color: 'from-emerald-500 to-teal-500'
  }
];

const servers = [
  { location: 'United States', ping: 12, flag: '🇺🇸' },
  { location: 'Switzerland', ping: 45, flag: '🇨🇭' },
  { location: 'Singapore', ping: 89, flag: '🇸🇬' },
  { location: 'Netherlands', ping: 35, flag: '🇳🇱' },
  { location: 'Japan', ping: 102, flag: '🇯🇵' },
];

export default function Privacy() {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showDID, setShowDID] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscription } = useQuery({
    queryKey: ['vpnSubscription'],
    queryFn: () => base44.entities.VPNSubscription.list().then(subs => subs[0]),
  });

  const createSubscription = useMutation({
    mutationFn: (tier) => base44.entities.VPNSubscription.create({
      tier,
      data_used_gb: 0,
      data_limit_gb: tier === 'free' ? 1 : tier === 'basic' ? 50 : tier === 'pro' ? 200 : 999999,
      status: 'active'
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vpnSubscription'] }),
  });

  const connectVPN = (server) => {
    setSelectedServer(server);
    setIsConnected(true);
  };

  const disconnectVPN = () => {
    setIsConnected(false);
    setSelectedServer(null);
  };

  const currentTier = subscription?.tier || 'free';
  const dataUsed = subscription?.data_used_gb || 0;
  const dataLimit = subscription?.data_limit_gb || 1;

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
              <h1 className="text-2xl font-bold text-white">Privacy Shield</h1>
              <p className="text-white/50 text-sm">VPN • Proxy • Decentralized Identity</p>
            </div>
          </div>
          <Button
            onClick={() => setShowDID(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Shield className="w-4 h-4 mr-2" />
            DID Manager
          </Button>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-gradient-to-r ${
            isConnected 
              ? 'from-emerald-500/20 to-green-500/20 border-emerald-500/30' 
              : 'from-gray-500/20 to-gray-600/20 border-gray-500/30'
          } border rounded-2xl p-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl ${
                isConnected 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                  : 'bg-gradient-to-br from-gray-500 to-gray-600'
              } flex items-center justify-center`}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {isConnected ? 'Protected' : 'Unprotected'}
                </h3>
                <p className="text-white/70 text-sm">
                  {isConnected ? `Connected to ${selectedServer?.location}` : 'Not connected to VPN'}
                </p>
              </div>
            </div>
            <Button
              onClick={isConnected ? disconnectVPN : () => connectVPN(servers[0])}
              className={isConnected 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              }
            >
              {isConnected ? 'Disconnect' : 'Quick Connect'}
            </Button>
          </div>

          {subscription && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm">Data Usage</span>
                <span className="text-white text-sm font-semibold">
                  {dataUsed.toFixed(2)} GB / {dataLimit === 999999 ? '∞' : `${dataLimit} GB`}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${Math.min((dataUsed / dataLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Server Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Server Locations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {servers.map((server) => (
              <button
                key={server.location}
                onClick={() => connectVPN(server)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedServer?.location === server.location
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{server.flag}</span>
                    <span className="text-white font-medium">{server.location}</span>
                  </div>
                  <Server className="w-4 h-4 text-white/50" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white/70 text-sm">{server.ping}ms</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* VPN Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Privacy Plans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vpnTiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-2xl p-5 border ${
                  tier.popular 
                    ? 'border-purple-500 bg-purple-500/10 relative' 
                    : currentTier === tier.id
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-500 rounded-full text-white text-xs font-bold">
                    POPULAR
                  </div>
                )}
                <h3 className="text-white font-bold mb-1">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">${tier.price}</span>
                  <span className="text-white/50 text-sm">/month</span>
                </div>
                <p className="text-white/70 text-sm mb-4">{tier.data}</p>
                <ul className="space-y-2 mb-4">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => createSubscription.mutate(tier.id)}
                  disabled={currentTier === tier.id}
                  className={`w-full ${
                    currentTier === tier.id 
                      ? 'bg-white/10 cursor-not-allowed' 
                      : `bg-gradient-to-r ${tier.color}`
                  }`}
                >
                  {currentTier === tier.id ? 'Current Plan' : 'Select'}
                </Button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-4"
        >
          {[
            { icon: Eye, title: 'Zero Logs', desc: 'We never track or store your activity' },
            { icon: Lock, title: 'End-to-End Encryption', desc: 'Military-grade AES-256 encryption' },
            { icon: Zap, title: 'Lightning Fast', desc: 'Optimized servers for crypto trading' },
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <feature.icon className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-white font-bold mb-2">{feature.title}</h3>
              <p className="text-white/70 text-sm">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <DIDManager
        isOpen={showDID}
        onClose={() => setShowDID(false)}
        onConnect={(did) => console.log('DID connected:', did)}
      />
    </div>
  );
}