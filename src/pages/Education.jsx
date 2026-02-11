import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Award, Play, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import LearningModuleCard from '@/components/education/LearningModuleCard';
import AIChatbot from '@/components/chat/AIChatbot';

export default function Education() {
  const [selectedModule, setSelectedModule] = useState(null);

  const { data: learningModules = [] } = useQuery({
    queryKey: ['learningModules'],
    queryFn: () => base44.entities.LearningModule.list(),
    initialData: [],
  });

  const modules = [
    {
      id: 1,
      title: 'What is Cryptocurrency?',
      description: 'Learn the basics of digital money and how it works',
      category: 'basics',
      duration: '5 min',
      reward: '0.001 ETH',
      completed: learningModules.find(m => m.module_id === '1')?.completed || false,
      icon: '🪙'
    },
    {
      id: 2,
      title: 'Understanding Your Wallet',
      description: 'How wallets work and how to keep them secure',
      category: 'basics',
      duration: '7 min',
      reward: '0.001 ETH',
      completed: learningModules.find(m => m.module_id === '2')?.completed || false,
      icon: '👛'
    },
    {
      id: 3,
      title: 'Sending & Receiving Crypto',
      description: 'Step-by-step guide to your first transaction',
      category: 'basics',
      duration: '6 min',
      reward: '0.001 ETH',
      completed: false,
      icon: '📤'
    },
    {
      id: 4,
      title: 'Converting Crypto to Cash',
      description: 'Learn how to cash out to your bank account',
      category: 'basics',
      duration: '5 min',
      reward: '0.001 ETH',
      completed: false,
      icon: '💵'
    },
    {
      id: 5,
      title: 'Spending Your Crypto',
      description: 'Using crypto cards for everyday purchases',
      category: 'basics',
      duration: '4 min',
      reward: '0.001 ETH',
      completed: false,
      icon: '💳'
    },
    {
      id: 6,
      title: 'Security Best Practices',
      description: 'Protecting yourself from scams and fraud',
      category: 'security',
      duration: '10 min',
      reward: '0.002 ETH',
      completed: false,
      icon: '🔒'
    },
    {
      id: 7,
      title: 'What Are Gas Fees?',
      description: 'Understanding transaction costs in simple terms',
      category: 'basics',
      duration: '5 min',
      reward: '0.001 ETH',
      completed: false,
      icon: '⛽'
    },
    {
      id: 8,
      title: 'Introduction to Trading',
      description: 'Basics of buying and selling cryptocurrency',
      category: 'trading',
      duration: '8 min',
      reward: '0.002 ETH',
      completed: false,
      icon: '📈'
    },
  ];

  const completedCount = modules.filter(m => m.completed).length;
  const totalProgress = (completedCount / modules.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-indigo-950/20 to-gray-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Crypto 101</h1>
            <p className="text-white/60">Learn at your own pace, earn rewards</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/30">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-white font-semibold">{completedCount}/{modules.length}</span>
          </div>
        </div>

        {/* Progress Overview */}
        <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white text-xl font-bold mb-1">Your Learning Journey</h3>
                <p className="text-white/60">Keep going! You're doing great 🎉</p>
              </div>
              <div className="text-right">
                <p className="text-white text-3xl font-bold">{Math.round(totalProgress)}%</p>
                <p className="text-white/60 text-sm">Complete</p>
              </div>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* AI Coach */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold mb-2">Your AI Crypto Coach</h3>
                <p className="text-white/80 mb-4">
                  Have questions? I'm here to help! Ask me anything about crypto, wallets, or how things work. I'll explain it in simple terms.
                </p>
                <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ask a Question
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Modules */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-4">Learning Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module) => (
              <LearningModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>

        {/* Bottom Info */}
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-bold mb-3">💡 Why Learn?</h3>
            <ul className="text-white/80 space-y-2">
              <li>✓ <strong>Build Confidence:</strong> Understand exactly what you're doing with your money</li>
              <li>✓ <strong>Stay Safe:</strong> Learn to spot scams and protect your assets</li>
              <li>✓ <strong>Earn Rewards:</strong> Get real crypto for completing lessons</li>
              <li>✓ <strong>Take Control:</strong> Join the future of finance with confidence</li>
            </ul>
          </CardContent>
        </Card>

      </div>

      <AIChatbot />
    </div>
  );
}