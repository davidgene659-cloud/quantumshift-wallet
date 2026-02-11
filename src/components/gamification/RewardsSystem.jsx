import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Target, Star, Gift, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';

const achievements = [
  { id: 1, name: 'First Swap', icon: Zap, description: 'Complete your first token swap', points: 100, unlocked: true },
  { id: 2, name: 'DeFi Explorer', icon: Target, description: 'Connect to 3 DApps', points: 250, unlocked: true },
  { id: 3, name: 'NFT Collector', icon: Star, description: 'Mint your first NFT', points: 200, unlocked: false },
  { id: 4, name: 'High Roller', icon: Trophy, description: 'Win 1000 USDT in poker', points: 500, unlocked: false },
  { id: 5, name: 'Miner', icon: Zap, description: 'Start cloud mining', points: 300, unlocked: true },
  { id: 6, name: 'Trading Pro', icon: Target, description: 'Run a trading bot for 7 days', points: 400, unlocked: false },
];

const levels = [
  { level: 1, name: 'Newbie', xpRequired: 0, color: 'from-gray-400 to-gray-500', rewards: '1% bonus on swaps' },
  { level: 2, name: 'Explorer', xpRequired: 500, color: 'from-blue-400 to-blue-500', rewards: '2% bonus on swaps' },
  { level: 3, name: 'Veteran', xpRequired: 1500, color: 'from-purple-400 to-purple-500', rewards: '3% bonus + Free NFT' },
  { level: 4, name: 'Expert', xpRequired: 3000, color: 'from-orange-400 to-orange-500', rewards: '5% bonus + VIP Support' },
  { level: 5, name: 'Legend', xpRequired: 6000, color: 'from-yellow-400 to-yellow-500', rewards: '10% bonus + Exclusive perks' },
];

export default function RewardsSystem() {
  const [userXP, setUserXP] = useState(850);
  const [showReward, setShowReward] = useState(false);

  const currentLevel = levels.reduce((acc, level) => {
    return userXP >= level.xpRequired ? level : acc;
  }, levels[0]);

  const nextLevel = levels.find(l => l.level === currentLevel.level + 1);
  const progressToNext = nextLevel 
    ? ((userXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100 
    : 100;

  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0);

  const celebrateAchievement = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-4">
      {/* Level Progress */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentLevel.color} flex items-center justify-center`}>
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Level {currentLevel.level}: {currentLevel.name}</h3>
                <p className="text-white/60 text-sm">{userXP} XP</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-purple-400 font-bold text-lg">{totalPoints} pts</p>
              <p className="text-white/50 text-xs">Total Points</p>
            </div>
          </div>
          
          {nextLevel && (
            <>
              <Progress value={progressToNext} className="h-2 mb-2" />
              <p className="text-white/60 text-xs">
                {nextLevel.xpRequired - userXP} XP to {nextLevel.name}
              </p>
            </>
          )}

          <div className="mt-3 p-2 bg-white/5 rounded-lg">
            <p className="text-emerald-400 text-sm font-medium">🎁 {currentLevel.rewards}</p>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <div>
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Achievements
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {achievements.map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: achievement.unlocked ? 1.02 : 1 }}
              >
                <Card className={`${
                  achievement.unlocked 
                    ? 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50' 
                    : 'bg-white/5 border-white/10'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                          : 'bg-white/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${achievement.unlocked ? 'text-white' : 'text-white/30'}`} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-white/50'}`}>
                          {achievement.name}
                        </h4>
                        <p className={`text-xs ${achievement.unlocked ? 'text-white/70' : 'text-white/30'}`}>
                          {achievement.description}
                        </p>
                      </div>
                      {achievement.unlocked && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                          +{achievement.points}
                        </Badge>
                      )}
                    </div>
                    {achievement.unlocked && (
                      <div className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Unlocked
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}