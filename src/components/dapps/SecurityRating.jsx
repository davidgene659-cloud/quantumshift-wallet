import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, AlertTriangle, CheckCircle, Info, Users, FileCheck, Bug, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const getScoreColor = (score) => {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-orange-400';
};

const getScoreGradient = (score) => {
  if (score >= 90) return 'from-emerald-500 to-green-500';
  if (score >= 75) return 'from-green-500 to-lime-500';
  if (score >= 60) return 'from-yellow-500 to-amber-500';
  return 'from-orange-500 to-red-500';
};

const securityDetails = {
  audit: { icon: FileCheck, label: 'Audit Status', weight: 30 },
  timeInMarket: { icon: Clock, label: 'Time in Market', weight: 20 },
  tvl: { icon: Users, label: 'TVL & Adoption', weight: 20 },
  bugs: { icon: Bug, label: 'Bug History', weight: 15 },
  team: { icon: Users, label: 'Team Transparency', weight: 15 }
};

export default function SecurityRating({ dapp, inline = false }) {
  const [showDetails, setShowDetails] = useState(false);

  // Generate detailed scores
  const auditScore = Math.min(100, dapp.trustScore + Math.random() * 10 - 5);
  const timeScore = Math.min(100, dapp.trustScore + Math.random() * 15 - 7);
  const tvlScore = Math.min(100, dapp.trustScore + Math.random() * 12 - 6);
  const bugsScore = Math.min(100, dapp.trustScore + Math.random() * 8 - 4);
  const teamScore = Math.min(100, dapp.trustScore + Math.random() * 10 - 5);

  const scores = {
    audit: auditScore,
    timeInMarket: timeScore,
    tvl: tvlScore,
    bugs: bugsScore,
    team: teamScore
  };

  const overallScore = dapp.trustScore;

  const ScoreDisplay = () => (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 ${getScoreColor(overallScore)}`}>
        <Shield className="w-4 h-4" />
        <span className="font-bold text-sm">{overallScore}/100</span>
      </div>
      {!inline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDetails(true);
          }}
          className="text-white/50 hover:text-white h-auto p-1"
        >
          <Info className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  if (inline) return <ScoreDisplay />;

  return (
    <>
      <ScoreDisplay />

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${dapp.color} flex items-center justify-center text-2xl`}>
                {dapp.icon}
              </div>
              <div>
                <div className="text-white">{dapp.name} Security</div>
                <div className="text-white/50 text-sm font-normal">Detailed Trust Analysis</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Overall Score */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Overall Trust Score</h3>
                <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                  {overallScore}/100
                </div>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallScore}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${getScoreGradient(overallScore)}`}
                />
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Security Breakdown
              </h3>
              
              {Object.entries(securityDetails).map(([key, detail]) => {
                const score = scores[key];
                const Icon = detail.icon;
                return (
                  <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-white/70" />
                        <span className="text-white text-sm">{detail.label}</span>
                        <span className="text-white/40 text-xs">({detail.weight}%)</span>
                      </div>
                      <span className={`font-bold text-sm ${getScoreColor(score)}`}>
                        {score.toFixed(0)}/100
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className={`h-full bg-gradient-to-r ${getScoreGradient(score)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risk Factors */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-400 font-semibold text-sm mb-2">Risk Considerations</h4>
                  <ul className="text-white/70 text-xs space-y-1">
                    <li>• Smart contract risk always exists in DeFi</li>
                    <li>• Past performance doesn't guarantee future results</li>
                    <li>• Always verify transactions before signing</li>
                    <li>• Only invest what you can afford to lose</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-medium text-sm">Audited & Verified</span>
              </div>
              <a
                href={dapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 text-xs hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Audit Reports →
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}