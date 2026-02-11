import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Grid3x3, Sparkles, ExternalLink, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockNFTs = [
  { id: 1, name: 'Bored Ape #1234', image: 'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=400', collection: 'BAYC', floor: '45 ETH', rarity: 'Legendary', verified: true },
  { id: 2, name: 'CryptoPunk #5678', image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400', collection: 'CryptoPunks', floor: '120 ETH', rarity: 'Rare', verified: true },
  { id: 3, name: 'Azuki #9012', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', collection: 'Azuki', floor: '18 ETH', rarity: 'Epic', verified: true },
  { id: 4, name: 'Doodle #3456', image: 'https://images.unsplash.com/photo-1634193295627-1cdddf751ebf?w=400', collection: 'Doodles', floor: '8 ETH', rarity: 'Common', verified: true },
  { id: 5, name: 'Moonbird #7890', image: 'https://images.unsplash.com/photo-1634926878768-2a5b3c42f139?w=400', collection: 'Moonbirds', floor: '12 ETH', rarity: 'Rare', verified: true },
  { id: 6, name: 'Clone X #2345', image: 'https://images.unsplash.com/photo-1633218388467-539651dcf81a?w=400', collection: 'Clone X', floor: '15 ETH', rarity: 'Epic', verified: true },
];

export default function NFTGallery() {
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [view, setView] = useState('grid');

  const rarityColors = {
    Common: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    Rare: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    Epic: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    Legendary: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">NFT Collection</h2>
            <p className="text-white/50 text-sm">{mockNFTs.length} items • Floor: 218 ETH</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setView('grid')}
            variant={view === 'grid' ? 'default' : 'outline'}
            size="sm"
            className={view === 'grid' ? 'bg-purple-500' : 'border-white/10'}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {mockNFTs.map((nft, index) => (
          <motion.div
            key={nft.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedNFT(nft)}
            className="cursor-pointer"
          >
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/10 overflow-hidden hover:border-purple-500/50 transition-all">
              <div className="aspect-square relative overflow-hidden">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="w-full h-full object-cover"
                />
                {nft.verified && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge className={`${rarityColors[nft.rarity]} text-xs border`}>
                    {nft.rarity}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-white font-semibold text-sm mb-1 truncate">{nft.name}</p>
                <p className="text-white/50 text-xs mb-2">{nft.collection}</p>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold text-sm">Floor: {nft.floor}</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* NFT Detail Modal */}
      <AnimatePresence>
        {selectedNFT && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNFT(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid md:grid-cols-2">
                <div className="relative aspect-square">
                  <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white text-xl font-bold">{selectedNFT.name}</h3>
                      {selectedNFT.verified && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-white/70">{selectedNFT.collection}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/50 text-xs mb-1">Floor Price</p>
                      <p className="text-emerald-400 font-bold">{selectedNFT.floor}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/50 text-xs mb-1">Rarity</p>
                      <Badge className={`${rarityColors[selectedNFT.rarity]} text-xs border`}>
                        {selectedNFT.rarity}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                      <Zap className="w-4 h-4 mr-2" />
                      List for Sale
                    </Button>
                    <Button variant="outline" className="w-full border-white/10">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on OpenSea
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}