import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Upload, Palette, Code, Zap, BookOpen, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const tutorials = [
  { icon: BookOpen, title: 'NFT Basics', description: 'What are NFTs and how do they work?', time: '5 min' },
  { icon: Palette, title: 'Create Digital Art', description: 'Tools and techniques for NFT art', time: '10 min' },
  { icon: Code, title: 'Smart Contracts', description: 'Understanding ERC-721 & ERC-1155', time: '8 min' },
  { icon: Zap, title: 'Minting Guide', description: 'Deploy your NFT collection', time: '12 min' }
];

export default function NFTCreator() {
  const [activeTab, setActiveTab] = useState('create');
  const [generating, setGenerating] = useState(false);
  const [nftData, setNftData] = useState({
    name: '',
    description: '',
    imageUrl: ''
  });

  const handleGenerateArt = async () => {
    if (!nftData.description) {
      toast.error('Please enter a description for your NFT');
      return;
    }

    setGenerating(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `NFT artwork: ${nftData.description}. High quality, digital art, vibrant colors, trending on NFT marketplaces`
      });

      setNftData(prev => ({ ...prev, imageUrl: result.url }));
      toast.success('NFT artwork generated!');
    } catch (error) {
      toast.error('Failed to generate artwork');
    } finally {
      setGenerating(false);
    }
  };

  const handleMintNFT = async () => {
    if (!nftData.name || !nftData.imageUrl) {
      toast.error('Please complete all fields');
      return;
    }

    toast.success('NFT minted! (Demo mode)');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">NFT Workstation</h2>
          <p className="text-white/50 text-sm">Create, learn, and mint NFTs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'create'
              ? 'bg-purple-500 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Create NFT
        </button>
        <button
          onClick={() => setActiveTab('learn')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'learn'
              ? 'bg-purple-500 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Learn
        </button>
      </div>

      {activeTab === 'create' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* AI Art Generator */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Art Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Describe your NFT</label>
                <Textarea
                  value={nftData.description}
                  onChange={(e) => setNftData({ ...nftData, description: e.target.value })}
                  placeholder="A futuristic cyberpunk cat with neon glasses..."
                  className="bg-white/5 border-white/10 text-white"
                  rows={3}
                />
              </div>
              <Button
                onClick={handleGenerateArt}
                disabled={generating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {generating ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Art
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          {nftData.imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <img
                    src={nftData.imageUrl}
                    alt="Generated NFT"
                    className="w-full aspect-square object-cover rounded-xl mb-4"
                  />
                  <div className="space-y-3">
                    <div>
                      <label className="text-white/70 text-sm mb-2 block">NFT Name</label>
                      <Input
                        value={nftData.name}
                        onChange={(e) => setNftData({ ...nftData, name: e.target.value })}
                        placeholder="My Awesome NFT"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <Button
                      onClick={handleMintNFT}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Mint NFT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {activeTab === 'learn' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {tutorials.map((tutorial, index) => {
            const Icon = tutorial.icon;
            return (
              <Card
                key={index}
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{tutorial.title}</h3>
                      <p className="text-white/60 text-sm">{tutorial.description}</p>
                    </div>
                    <div className="text-purple-400 text-sm font-medium">{tutorial.time}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}