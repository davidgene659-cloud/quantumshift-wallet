import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = [];

    // Fetch current gas prices
    let gasData;
    try {
      const gasResponse = await base44.functions.invoke('getGasOracle', {});
      gasData = gasResponse.data;
    } catch (error) {
      console.error('Failed to fetch gas data:', error);
    }

    // Check for gas price alerts
    if (gasData?.ethereum) {
      const currentGas = gasData.ethereum.standard?.maxFee || 0;
      const avgGas = 30; // Historical 24h average (could be fetched from DB)
      
      if (currentGas > avgGas * 1.5) {
        alerts.push({
          type: 'gas_spike',
          severity: 'high',
          chain: 'ethereum',
          title: 'High Ethereum Gas Fees',
          message: `Gas is ${((currentGas / avgGas - 1) * 100).toFixed(0)}% above 24h average (${currentGas} vs ${avgGas} gwei)`,
          recommendation: 'Consider waiting or using an L2/alternative chain',
          urgency: 'medium',
          impact: 'transaction_cost'
        });
      } else if (currentGas < avgGas * 0.7) {
        alerts.push({
          type: 'gas_optimal',
          severity: 'low',
          chain: 'ethereum',
          title: 'Low Ethereum Gas Fees',
          message: `Gas is ${((1 - currentGas / avgGas) * 100).toFixed(0)}% below 24h average - great time to transact!`,
          recommendation: 'Execute pending transactions now to save on fees',
          urgency: 'low',
          impact: 'savings_opportunity'
        });
      }

      // Network congestion alert
      if (gasData.ethereum.congestion_level === 'high') {
        alerts.push({
          type: 'network_congestion',
          severity: 'medium',
          chain: 'ethereum',
          title: 'Ethereum Network Congestion',
          message: 'High transaction volume detected - confirmations may be delayed',
          recommendation: 'Increase gas price for faster confirmation or consider L2s',
          urgency: 'medium',
          impact: 'transaction_speed'
        });
      }
    }

    // Check user's wallet balances for optimization opportunities
    try {
      const balancesResponse = await base44.functions.invoke('checkAllBalances', {});
      const wallets = balancesResponse.data?.wallets || [];

      // Check for consolidation opportunities
      const btcWallets = wallets.filter(w => w.blockchain === 'bitcoin' && w.balance > 0);
      if (btcWallets.length > 5) {
        alerts.push({
          type: 'consolidation_opportunity',
          severity: 'low',
          chain: 'bitcoin',
          title: 'Multiple BTC Wallets Detected',
          message: `You have ${btcWallets.length} BTC wallets that could be consolidated`,
          recommendation: 'Consolidate during low-fee periods to optimize future transaction costs',
          urgency: 'low',
          impact: 'cost_optimization'
        });
      }

      // Check for dust balances
      const dustBalances = wallets.filter(w => w.usd_value > 0 && w.usd_value < 10);
      if (dustBalances.length > 3) {
        alerts.push({
          type: 'dust_cleanup',
          severity: 'low',
          chain: 'multi',
          title: 'Small Balance Cleanup Available',
          message: `${dustBalances.length} wallets have small balances (<$10) that could be consolidated`,
          recommendation: 'Consider consolidating or swapping to reduce wallet clutter',
          urgency: 'low',
          impact: 'organization'
        });
      }

    } catch (error) {
      console.error('Failed to check wallet balances:', error);
    }

    // Check for batching opportunities
    try {
      const batchResponse = await base44.functions.invoke('analyzeBatchTransactions', {});
      if (batchResponse.data?.can_batch && batchResponse.data.savings_percent > 20) {
        alerts.push({
          type: 'batch_opportunity',
          severity: 'medium',
          chain: batchResponse.data.blockchain,
          title: 'Transaction Batching Available',
          message: `Batch ${batchResponse.data.transaction_count} transactions to save ${batchResponse.data.savings_percent}%`,
          recommendation: `Use batching to save $${batchResponse.data.savings_usd.toFixed(2)}`,
          urgency: 'medium',
          impact: 'savings_opportunity'
        });
      }
    } catch (error) {
      console.error('Failed to analyze batching:', error);
    }

    // General market alerts (could integrate with price APIs)
    const currentHour = new Date().getUTCHours();
    if (currentHour >= 2 && currentHour <= 6) {
      alerts.push({
        type: 'optimal_time_window',
        severity: 'low',
        chain: 'all',
        title: 'Optimal Transaction Time Window',
        message: 'Current time (2-6 AM UTC) typically has 30-40% lower fees',
        recommendation: 'Execute pending transactions now for best rates',
        urgency: 'low',
        impact: 'savings_opportunity'
      });
    }

    // Sort alerts by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return Response.json({
      total_alerts: alerts.length,
      alerts,
      checked_at: new Date().toISOString(),
      recommendations_summary: {
        high_priority: alerts.filter(a => a.severity === 'high').length,
        savings_opportunities: alerts.filter(a => a.impact === 'savings_opportunity').length,
        optimization_available: alerts.filter(a => a.type.includes('opportunity')).length
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});