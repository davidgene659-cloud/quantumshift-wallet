import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, TrendingUp, DollarSign, Users, Eye, Sparkles, Loader2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Marketing() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAIAgent, setShowAIAgent] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [partnership, setPartnership] = useState({
    partner_name: '',
    partner_type: 'exchange',
    campaign_name: '',
    ad_placement: 'banner',
    budget: '',
    start_date: '',
    end_date: '',
    target_audience: '',
    landing_page_url: '',
  });

  const queryClient = useQueryClient();

  const { data: partnerships = [] } = useQuery({
    queryKey: ['adPartnerships'],
    queryFn: () => base44.entities.AdPartnership.list(),
  });

  const createPartnershipMutation = useMutation({
    mutationFn: (data) => base44.entities.AdPartnership.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adPartnerships'] });
      setShowAddDialog(false);
      setPartnership({
        partner_name: '',
        partner_type: 'exchange',
        campaign_name: '',
        ad_placement: 'banner',
        budget: '',
        start_date: '',
        end_date: '',
        target_audience: '',
        landing_page_url: '',
      });
    },
  });

  const updatePartnershipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AdPartnership.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adPartnerships'] }),
  });

  const handleAddPartnership = () => {
    createPartnershipMutation.mutate({
      ...partnership,
      budget: parseFloat(partnership.budget) || 0,
      status: 'pending',
    });
  };

  const handleAIAssistant = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a crypto marketing AI agent for a multi-coin wallet platform. The platform offers:
- Multi-coin wallet with swap, send/receive
- Trading bots (arbitrage, grid, DCA, flash loans)
- Cloud mining for BTC, ETH, LTC, DOGE
- DeFi DApp integrations (Uniswap, Aave, etc.)
- Crypto casino integrations
- Texas Hold'em poker

User request: ${aiPrompt}

Provide a detailed marketing strategy, partnership recommendations, or ad campaign ideas. Be specific and actionable.`,
      });

      setAiResponse(result);
    } catch (error) {
      setAiResponse('Failed to generate response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalRevenue = partnerships.reduce((acc, p) => acc + (p.revenue_generated || 0), 0);
  const totalClicks = partnerships.reduce((acc, p) => acc + (p.clicks || 0), 0);
  const totalImpressions = partnerships.reduce((acc, p) => acc + (p.impressions || 0), 0);

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
              <h1 className="text-2xl font-bold text-white">Marketing Hub</h1>
              <p className="text-white/50 text-sm">Partnerships & sponsorships</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAIAgent(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Agent
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Partnership
            </Button>
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
            { icon: DollarSign, label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: 'text-emerald-400' },
            { icon: Users, label: 'Active Campaigns', value: partnerships.filter(p => p.status === 'active').length, color: 'text-white' },
            { icon: TrendingUp, label: 'Total Clicks', value: totalClicks.toLocaleString(), color: 'text-blue-400' },
            { icon: Eye, label: 'Impressions', value: totalImpressions.toLocaleString(), color: 'text-purple-400' },
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

        {/* Partnerships */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Active Partnerships</h2>
          {partnerships.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {partnerships.map((partner) => (
                <div
                  key={partner.id}
                  className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold">{partner.partner_name}</h3>
                      <p className="text-white/50 text-sm capitalize">{partner.partner_type}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      partner.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      partner.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {partner.status}
                    </span>
                  </div>

                  <p className="text-white text-sm mb-3">{partner.campaign_name}</p>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-white/50 text-xs">Budget</p>
                      <p className="text-white font-semibold text-sm">${partner.budget}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-white/50 text-xs">Clicks</p>
                      <p className="text-white font-semibold text-sm">{partner.clicks || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-white/50 text-xs">Revenue</p>
                      <p className="text-emerald-400 font-semibold text-sm">${partner.revenue_generated || 0}</p>
                    </div>
                  </div>

                  {partner.status === 'pending' && (
                    <Button
                      onClick={() => updatePartnershipMutation.mutate({ id: partner.id, data: { status: 'active' } })}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-sm"
                    >
                      Activate Campaign
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No partnerships yet</h3>
              <p className="text-white/50 mb-4">Start adding partnerships to track your marketing efforts</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500"
              >
                Add Partnership
              </Button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Add Partnership Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Partnership</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Partner Name</Label>
              <Input
                value={partnership.partner_name}
                onChange={(e) => setPartnership({ ...partnership, partner_name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label>Partner Type</Label>
              <Select value={partnership.partner_type} onValueChange={(v) => setPartnership({ ...partnership, partner_type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="defi_protocol">DeFi Protocol</SelectItem>
                  <SelectItem value="casino">Casino</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="nft_project">NFT Project</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Campaign Name</Label>
              <Input
                value={partnership.campaign_name}
                onChange={(e) => setPartnership({ ...partnership, campaign_name: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label>Ad Placement</Label>
              <Select value={partnership.ad_placement} onValueChange={(v) => setPartnership({ ...partnership, ad_placement: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="modal">Modal</SelectItem>
                  <SelectItem value="sponsored_content">Sponsored Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget ($)</Label>
              <Input
                type="number"
                value={partnership.budget}
                onChange={(e) => setPartnership({ ...partnership, budget: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={partnership.start_date}
                onChange={(e) => setPartnership({ ...partnership, start_date: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={partnership.end_date}
                onChange={(e) => setPartnership({ ...partnership, end_date: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div className="col-span-2">
              <Label>Landing Page URL</Label>
              <Input
                value={partnership.landing_page_url}
                onChange={(e) => setPartnership({ ...partnership, landing_page_url: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
            <div className="col-span-2">
              <Label>Target Audience</Label>
              <Textarea
                value={partnership.target_audience}
                onChange={(e) => setPartnership({ ...partnership, target_audience: e.target.value })}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>
          </div>
          <Button
            onClick={handleAddPartnership}
            disabled={!partnership.partner_name || !partnership.campaign_name}
            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500"
          >
            Create Partnership
          </Button>
        </DialogContent>
      </Dialog>

      {/* AI Agent Dialog */}
      <Dialog open={showAIAgent} onOpenChange={setShowAIAgent}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Marketing Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>What can I help you with?</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., Create a campaign strategy for attracting DeFi users, or suggest partnership opportunities with crypto casinos"
                className="bg-white/5 border-white/10 text-white mt-2 h-24"
              />
            </div>
            <Button
              onClick={handleAIAssistant}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Strategy
                </>
              )}
            </Button>
            {aiResponse && (
              <div className="bg-white/5 rounded-xl p-4 max-h-96 overflow-y-auto">
                <p className="text-white/90 text-sm whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}