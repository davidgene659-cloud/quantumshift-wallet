import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Image, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import NFTGallery from '@/components/nft/NFTGallery';
import NFTCreator from '@/components/nft/NFTCreator';
import NFTMarketplace from '@/components/nft/NFTMarketplace';
import AIChatbot from '@/components/chat/AIChatbot';
import { base44 } from '@/api/base44Client';

export default function NFTs() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <motion.div
      key="nfts"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ type: 'tween', duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 p-4 md:p-6"
    >
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
              <h1 className="text-2xl font-bold text-white">NFT Studio</h1>
              <p className="text-white/50 text-sm">Collect, create, and trade NFTs</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('gallery')}
              variant={activeTab === 'gallery' ? 'default' : 'outline'}
              className={activeTab === 'gallery' ? 'bg-purple-500' : 'border-white/10'}
            >
              <Image className="w-4 h-4 mr-2" />
              Gallery
            </Button>
            <Button
              onClick={() => setActiveTab('create')}
              variant={activeTab === 'create' ? 'default' : 'outline'}
              className={activeTab === 'create' ? 'bg-purple-500' : 'border-white/10'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {activeTab === 'gallery' ? <NFTMarketplace userId={user?.id} /> : <NFTCreator userId={user?.id} />}
        </motion.div>
      </div>

      <AIChatbot />
    </motion.div>
  );
}