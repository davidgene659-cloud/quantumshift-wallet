import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calculator, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function TaxReporter({ userId }) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', userId],
    queryFn: () => base44.entities.Transaction.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const { data: taxReport } = useQuery({
    queryKey: ['taxReport', userId, selectedYear],
    queryFn: async () => {
      const reports = await base44.entities.TaxReport.filter({ 
        user_id: userId, 
        tax_year: selectedYear 
      });
      return reports[0];
    },
    enabled: !!userId,
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const yearTransactions = transactions.filter(t => {
        const txDate = new Date(t.created_date);
        return txDate.getFullYear() === selectedYear;
      });

      const taxableEvents = yearTransactions
        .filter(t => ['swap', 'trade', 'poker_win', 'bot_trade'].includes(t.type))
        .map(t => ({
          date: t.created_date,
          type: t.type,
          from: t.from_token,
          to: t.to_token,
          amount: t.to_amount,
          usd_value: t.usd_value || 0,
        }));

      const totalGains = taxableEvents
        .filter(e => ['poker_win', 'bot_trade'].includes(e.type))
        .reduce((sum, e) => sum + (e.usd_value || 0), 0);

      const totalLosses = transactions
        .filter(t => t.type === 'poker_loss')
        .reduce((sum, t) => sum + (t.usd_value || 0), 0);

      const estimatedTax = (totalGains - totalLosses) * 0.25; // Simplified 25% rate

      if (taxReport?.id) {
        return await base44.entities.TaxReport.update(taxReport.id, {
          total_gains: totalGains,
          total_losses: totalLosses,
          short_term_gains: totalGains * 0.7,
          long_term_gains: totalGains * 0.3,
          taxable_events: taxableEvents,
          estimated_tax_owed: Math.max(0, estimatedTax),
        });
      } else {
        return await base44.entities.TaxReport.create({
          user_id: userId,
          tax_year: selectedYear,
          total_gains: totalGains,
          total_losses: totalLosses,
          short_term_gains: totalGains * 0.7,
          long_term_gains: totalGains * 0.3,
          taxable_events: taxableEvents,
          estimated_tax_owed: Math.max(0, estimatedTax),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['taxReport', userId, selectedYear]);
    },
  });

  const exportTaxReport = () => {
    if (!taxReport) return;

    const report = {
      tax_year: selectedYear,
      generated_date: format(new Date(), 'yyyy-MM-dd'),
      taxpayer_id: userId,
      summary: {
        total_gains: taxReport.total_gains,
        total_losses: taxReport.total_losses,
        net_gains: taxReport.total_gains - taxReport.total_losses,
        short_term_gains: taxReport.short_term_gains,
        long_term_gains: taxReport.long_term_gains,
        estimated_tax: taxReport.estimated_tax_owed,
      },
      taxable_events: taxReport.taxable_events,
      disclaimer: 'This is an estimate. Consult a tax professional for accurate filing.',
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${selectedYear}.json`;
    a.click();
  };

  return (
    <Card className="bg-gray-900/50 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Tax Estimation & Reporting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-200 text-sm">
            This is an estimate only. Please consult a qualified tax professional for accurate tax filing.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => generateReportMutation.mutate()} 
            disabled={generateReportMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-cyan-500"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {generateReportMutation.isPending ? 'Calculating...' : 'Generate Report'}
          </Button>
        </div>

        {taxReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-sm">Total Gains</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${taxReport.total_gains.toFixed(2)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-sm">Total Losses</p>
                <p className="text-2xl font-bold text-red-400">
                  ${taxReport.total_losses.toFixed(2)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-white/50 text-sm">Net Gain/Loss</p>
                <p className={`text-2xl font-bold ${(taxReport.total_gains - taxReport.total_losses) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${(taxReport.total_gains - taxReport.total_losses).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-white/70 text-sm mb-1">Estimated Tax Owed</p>
              <p className="text-3xl font-bold text-blue-400">
                ${taxReport.estimated_tax_owed.toFixed(2)}
              </p>
              <p className="text-white/50 text-xs mt-2">
                Based on {taxReport.taxable_events?.length || 0} taxable events
              </p>
            </div>

            <Button onClick={exportTaxReport} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Tax Report (JSON)
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}