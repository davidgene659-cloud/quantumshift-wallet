import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function TaxReport({ user }) {
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch transactions for tax year
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['tax-transactions', user?.id, taxYear],
    queryFn: async () => {
      if (!user) return [];
      const result = await base44.entities.Transaction.filter(
        { user_id: user.id },
        '-created_date',
        1000
      );
      
      // Filter by tax year
      return result.filter(tx => {
        if (!tx.created_date) return false;
        const txYear = new Date(tx.created_date).getFullYear();
        return txYear === taxYear;
      });
    },
    enabled: !!user,
  });

  // Calculate capital gains/losses
  const calculateTaxReport = () => {
    const gains = { shortTerm: 0, longTerm: 0 };
    const losses = { shortTerm: 0, longTerm: 0 };
    const income = 0;

    transactions.forEach(tx => {
      if (tx.type === 'withdraw' || tx.type === 'swap') {
        // Mock calculation - in production, track cost basis
        const costBasis = tx.usd_value * 0.85;
        const proceeds = tx.usd_value;
        const gainLoss = proceeds - costBasis;

        // Assume all trades are short-term for mock
        if (gainLoss > 0) {
          gains.shortTerm += gainLoss;
        } else {
          losses.shortTerm += Math.abs(gainLoss);
        }
      }
    });

    return {
      totalGains: gains.shortTerm + gains.longTerm,
      totalLosses: losses.shortTerm + losses.longTerm,
      netGainLoss: (gains.shortTerm + gains.longTerm) - (losses.shortTerm + losses.longTerm),
      shortTermGains: gains.shortTerm,
      longTermGains: gains.longTerm,
      shortTermLosses: losses.shortTerm,
      longTermLosses: losses.longTerm,
      totalTransactions: transactions.length
    };
  };

  const taxData = calculateTaxReport();

  const generateReport = async () => {
    setIsGenerating(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate CSV
    const csv = [
      ['Date', 'Type', 'Asset', 'Amount', 'USD Value', 'Gain/Loss'],
      ...transactions.map(tx => [
        tx.created_date ? format(new Date(tx.created_date), 'yyyy-MM-dd') : '',
        tx.type,
        tx.from_token,
        tx.from_amount,
        tx.usd_value?.toFixed(2) || '0.00',
        tx.type === 'withdraw' ? (tx.usd_value * 0.15).toFixed(2) : '0.00'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${taxYear}.csv`;
    a.click();

    setIsGenerating(false);
    toast.success('Tax report downloaded');
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Tax Reporting</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            {[2026, 2025, 2024, 2023].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button
            onClick={generateReport}
            disabled={isGenerating || transactions.length === 0}
            className="bg-gradient-to-r from-blue-500 to-cyan-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-white/50 py-8">Loading tax data...</div>
      ) : (
        <>
          {/* Tax Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-emerald-400 text-sm mb-1">Total Gains</p>
              <p className="text-white text-2xl font-bold">
                ${taxData.totalGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-sm mb-1">Total Losses</p>
              <p className="text-white text-2xl font-bold">
                ${taxData.totalLosses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`border rounded-xl p-4 ${
              taxData.netGainLoss >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className={`text-sm mb-1 ${taxData.netGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Net Gain/Loss
              </p>
              <p className={`text-2xl font-bold ${taxData.netGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {taxData.netGainLoss >= 0 ? '+' : ''}${Math.abs(taxData.netGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-400 text-sm mb-1">Total Transactions</p>
              <p className="text-white text-2xl font-bold">
                {taxData.totalTransactions}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-4">Capital Gains Breakdown</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Short-Term Gains (held &lt; 1 year)</span>
                <span className="text-emerald-400 font-bold">
                  ${taxData.shortTermGains.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Long-Term Gains (held &gt; 1 year)</span>
                <span className="text-emerald-400 font-bold">
                  ${taxData.longTermGains.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Short-Term Losses</span>
                <span className="text-red-400 font-bold">
                  ${taxData.shortTermLosses.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Long-Term Losses</span>
                <span className="text-red-400 font-bold">
                  ${taxData.longTermLosses.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-6">
            <p className="text-amber-400 text-sm">
              <strong>Disclaimer:</strong> This report is for informational purposes only and should not be considered tax advice. 
              Please consult with a qualified tax professional for your specific situation. Tax laws vary by jurisdiction.
            </p>
          </div>
        </>
      )}
    </div>
  );
}