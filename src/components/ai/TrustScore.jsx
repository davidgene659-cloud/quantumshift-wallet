import React from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function TrustScore({ score, size = 'md' }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return CheckCircle;
    if (score >= 40) return AlertTriangle;
    return Shield;
  };

  const Icon = getScoreIcon(score);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={`${sizeClasses[size]} ${getScoreColor(score)}`} />
      <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
      <span className="text-white/60 text-sm">Trust Score</span>
    </div>
  );
}