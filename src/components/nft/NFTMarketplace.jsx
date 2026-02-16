import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Tag, Wallet, TrendingUp, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function NFTMarketplace({ userId }) {
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [listPrice, setListPrice] = useState('');
  const [listCurrency, setListCurrency] = useState('ETH');
  const [showListDialog, setShowListDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: myNFTs = [] } = useQuery({
    queryKey: ['nfts', userId],
    queryFn: () => base44.entities.NFT.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: listedNFTs = [] } = useQuery({
    queryKey: ['listedNFTs'],
    queryFn: () => base44.entities.NFT.filter({ listed_for_sale: true }),
  });

  const listNFTMutation = useMutation({
    mutationFn: async ({ nftId, price, currency }) => {
      return await base44.entities.NFT.update(nftId, {
        listed_for_sale: true,
        price,
        price_currency: currency,
        status: 'listed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['nfts']);
      queryClient.invalidateQueries(['listedNFTs']);
      setShowListDialog(false);
      toast.success('NFT listed for sale!');
    },
  });

  const buyNFTMutation = useMutation({
    mutationFn: async (nft) => {
      const platformFee = nft.price * 0.025; // 2.5% fee
      const sellerReceives = nft.price - platformFee;

      // Create sale record
      await base44.entities.NFTSale.create({
        nft_id: nft.id,
        seller_id: nft.user_id,
        buyer_id: userId,
        sale_price: nft.price,
        currency: nft.price_currency,
        platform_fee: platformFee,
        seller_receives: sellerReceives,
        seller_wallet: '0xdd8D383a483d995e5352C3437b3F49B7D1CD2713',
        status: 'completed',
        transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      });

      // Update NFT ownership
      await base44.entities.NFT.update(nft.id, {
        user_id: userId,
        listed_for_sale: false,
        status: 'owned',
      });

      // Create transaction for buyer
      await base44.entities.Transaction.create({
        user_id: userId,
        type: 'trade',
        from_token: nft.price_currency,
        to_token: 'NFT',
        from_amount: nft.price,
        to_amount: 1,
        fee: platformFee,
        usd_value: nft.price,
      });

      // Update seller wallet balance
      const sellerWallets = await base44.entities.Wallet.filter({ user_id: nft.user_id });
      if (sellerWallets[0]) {
        const currentBalances = sellerWallets[0].balances || {};
        const currentBalance = parseFloat(currentBalances[nft.price_currency] || 0);
        await base44.entities.Wallet.update(sellerWallets[0].id, {
          balances: {
            ...currentBalances,
            [nft.price_currency]: currentBalance + sellerReceives,
          },
        });
      }

      return nft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['nfts']);
      queryClient.invalidateQueries(['listedNFTs']);
      queryClient.invalidateQueries(['wallet']);
      toast.success('NFT purchased successfully!');
    },
  });

  const handleList = (nft) => {
    setSelectedNFT(nft);
    setShowListDialog(true);
  };

  const confirmListing = () => {
    if (!listPrice || parseFloat(listPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    listNFTMutation.mutate({
      nftId: selectedNFT.id,
      price: parseFloat(listPrice),
      currency: listCurrency,
    });
  };

  return (
    <div className="space-y-6">
      {/* My NFTs Section */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            My NFTs ({myNFTs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myNFTs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {myNFTs.map((nft) => (
                <motion.div
                  key={nft.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    {nft.image_url ? (
                      <img src={nft.image_url} alt={nft.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-12 h-12 text-white/30" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm truncate">{nft.name}</p>
                    <p className="text-white/50 text-xs">{nft.collection || 'No Collection'}</p>
                    {nft.listed_for_sale ? (
                      <div className="mt-2 bg-emerald-500/20 rounded-lg px-2 py-1">
                        <p className="text-emerald-400 text-xs font-bold">
                          Listed: {nft.price} {nft.price_currency}
                        </p>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleList(nft)}
                        className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-xs"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        List for Sale
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Store className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50">No NFTs yet. Create or buy some!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marketplace Section */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-400" />
            NFT Marketplace ({listedNFTs.length} Listed)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listedNFTs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {listedNFTs.map((nft) => (
                <motion.div
                  key={nft.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition-all"
                >
                  <div className="aspect-square bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center relative">
                    {nft.image_url ? (
                      <img src={nft.image_url} alt={nft.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-12 h-12 text-white/30" />
                    )}
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-lg px-2 py-1">
                      <p className="text-white text-xs font-bold">
                        {nft.price} {nft.price_currency}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white font-semibold text-sm truncate">{nft.name}</p>
                    <p className="text-white/50 text-xs mb-2">{nft.collection || 'No Collection'}</p>
                    {nft.user_id !== userId && (
                      <Button
                        size="sm"
                        onClick={() => buyNFTMutation.mutate(nft)}
                        disabled={buyNFTMutation.isPending}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-xs"
                      >
                        <Wallet className="w-3 h-3 mr-1" />
                        Buy Now
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/50">No NFTs listed for sale yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List NFT Dialog */}
      <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>List NFT for Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedNFT && (
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white font-semibold">{selectedNFT.name}</p>
                <p className="text-white/50 text-sm">{selectedNFT.collection}</p>
              </div>
            )}
            <div>
              <label className="text-white/70 text-sm mb-2 block">Price</label>
              <Input
                type="number"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-white/70 text-sm mb-2 block">Currency</label>
              <Select value={listCurrency} onValueChange={setListCurrency}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-blue-200 text-xs">
                Platform fee: 2.5% | You'll receive: {listPrice ? (parseFloat(listPrice) * 0.975).toFixed(4) : '0'} {listCurrency}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                Funds deposited to: 0xdd8D...2713
              </p>
            </div>
            <Button
              onClick={confirmListing}
              disabled={listNFTMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {listNFTMutation.isPending ? 'Listing...' : 'List NFT'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}