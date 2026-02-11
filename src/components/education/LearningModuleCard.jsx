import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function LearningModuleCard({ module }) {
  const [showContent, setShowContent] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const queryClient = useQueryClient();

  const completeModuleMutation = useMutation({
    mutationFn: () => base44.entities.LearningModule.create({
      module_id: module.id.toString(),
      title: module.title,
      category: module.category,
      progress: 100,
      completed: true,
      quiz_score: 100
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningModules'] });
    },
  });

  const lessonContent = {
    1: [
      { type: 'text', content: '🪙 Cryptocurrency is digital money that exists only on the internet.' },
      { type: 'text', content: 'Think of it like the money in your bank account - you can\'t physically hold it, but it\'s real and valuable.' },
      { type: 'text', content: '💡 Key Difference: Unlike your bank controlling your money, YOU control your crypto. No middleman needed!' },
      { type: 'quiz', question: 'Cryptocurrency is...', options: ['Digital money you control', 'Physical coins', 'A bank account'], answer: 0 }
    ],
    4: [
      { type: 'text', content: '💵 Converting crypto to cash is simple! Just like withdrawing from an ATM.' },
      { type: 'text', content: 'Step 1: Go to the Banking section in your wallet' },
      { type: 'text', content: 'Step 2: Select "Cash Out" and choose how much crypto to convert' },
      { type: 'text', content: 'Step 3: The money appears in your linked bank account within 1-3 business days' },
      { type: 'quiz', question: 'How long does it take for cash to reach your bank?', options: ['Instantly', '1-3 business days', '1 week'], answer: 1 }
    ],
    5: [
      { type: 'text', content: '💳 Your crypto card works exactly like your debit card!' },
      { type: 'text', content: 'Use it at ANY store, restaurant, or website that accepts Visa/Mastercard.' },
      { type: 'text', content: '✨ Behind the scenes: When you swipe, your crypto is instantly converted to dollars.' },
      { type: 'text', content: 'The merchant gets regular money, you spend your crypto. It\'s that simple!' },
      { type: 'quiz', question: 'Can you use a crypto card at regular stores?', options: ['Yes, anywhere that accepts Visa/Mastercard', 'No, only at crypto stores', 'Only online'], answer: 0 }
    ]
  };

  const content = lessonContent[module.id] || [
    { type: 'text', content: 'This lesson is coming soon! Check back later.' }
  ];

  const handleNext = () => {
    if (currentStep < content.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeModuleMutation.mutate();
      setShowContent(false);
      setCurrentStep(0);
    }
  };

  return (
    <>
      <Card className="bg-gray-900/50 border-white/10 hover:border-purple-500/30 transition-all cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="text-4xl">{module.icon}</div>
            {module.completed && (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            )}
          </div>
          
          <h3 className="text-white font-bold text-lg mb-2">{module.title}</h3>
          <p className="text-white/60 text-sm mb-4">{module.description}</p>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-sm">⏱️ {module.duration}</span>
            <div className="flex items-center gap-1 text-amber-400 text-sm">
              <Award className="w-4 h-4" />
              <span>{module.reward}</span>
            </div>
          </div>

          <Button 
            onClick={() => setShowContent(true)}
            className={`w-full ${module.completed ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-purple-500 hover:bg-purple-600'}`}
            disabled={module.completed}
          >
            {module.completed ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Completed
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Lesson
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="bg-gray-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">{module.title}</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {content[currentStep]?.type === 'text' && (
              <p className="text-white text-lg leading-relaxed mb-6">
                {content[currentStep].content}
              </p>
            )}

            {content[currentStep]?.type === 'quiz' && (
              <div>
                <p className="text-white text-lg font-bold mb-4">{content[currentStep].question}</p>
                <div className="space-y-3">
                  {content[currentStep].options.map((option, idx) => (
                    <Button
                      key={idx}
                      onClick={handleNext}
                      className="w-full justify-start bg-gray-800 hover:bg-purple-600 text-white text-left"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-white/60 text-sm">
              Step {currentStep + 1} of {content.length}
            </span>
            <Button onClick={handleNext} className="bg-purple-500 hover:bg-purple-600">
              {currentStep < content.length - 1 ? 'Next' : 'Complete & Claim Reward'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}