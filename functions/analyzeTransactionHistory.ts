import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blockchain, transaction_type, days = 30 } = await req.json();

    // Fetch historical transactions
    const transactions = await base44.entities.Transaction.filter({
      user_id: user.id,
      ...(blockchain && { blockchain }),
      ...(transaction_type && { type: transaction_type })
    }, '-created_date', 1000);

    // Fetch historical portfolio snapshots for fee analysis
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const snapshots = await base44.entities.PortfolioSnapshot.filter({
      user_id: user.id
    }, '-snapshot_date', days * 24); // Assuming hourly snapshots

    // Analyze transaction patterns by hour of day
    const hourlyStats = Array(24).fill(0).map(() => ({
      count: 0,
      totalFees: 0,
      avgFee: 0,
      minFee: Infinity,
      maxFee: 0
    }));

    // Analyze transaction patterns by day of week
    const dailyStats = Array(7).fill(0).map(() => ({
      count: 0,
      totalFees: 0,
      avgFee: 0
    }));

    transactions.forEach(tx => {
      const date = new Date(tx.created_date);
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      const fee = tx.fee || 0;

      // Hourly stats
      hourlyStats[hour].count++;
      hourlyStats[hour].totalFees += fee;
      hourlyStats[hour].minFee = Math.min(hourlyStats[hour].minFee, fee);
      hourlyStats[hour].maxFee = Math.max(hourlyStats[hour].maxFee, fee);

      // Daily stats
      dailyStats[day].count++;
      dailyStats[day].totalFees += fee;
    });

    // Calculate averages
    hourlyStats.forEach(stat => {
      if (stat.count > 0) {
        stat.avgFee = stat.totalFees / stat.count;
        if (stat.minFee === Infinity) stat.minFee = 0;
      }
    });

    dailyStats.forEach(stat => {
      if (stat.count > 0) {
        stat.avgFee = stat.totalFees / stat.count;
      }
    });

    // Find optimal time windows (lowest average fees)
    const currentHour = new Date().getUTCHours();
    const hoursWithData = hourlyStats
      .map((stat, hour) => ({ hour, ...stat }))
      .filter(stat => stat.count > 0)
      .sort((a, b) => a.avgFee - b.avgFee);

    const optimalHours = hoursWithData.slice(0, 3);
    const currentHourStats = hourlyStats[currentHour];

    // Calculate if now is a good time
    const avgOverallFee = hourlyStats.reduce((sum, stat) => sum + stat.avgFee, 0) / 
                          hourlyStats.filter(s => s.count > 0).length;
    
    const isGoodTimeNow = currentHourStats.avgFee <= avgOverallFee * 1.1;
    const savingsPotential = currentHourStats.avgFee > 0 
      ? ((currentHourStats.avgFee - optimalHours[0].avgFee) / currentHourStats.avgFee * 100)
      : 0;

    // Predict next optimal window
    let nextOptimalHour = null;
    for (let i = 1; i <= 24; i++) {
      const checkHour = (currentHour + i) % 24;
      if (hourlyStats[checkHour].count > 0 && 
          hourlyStats[checkHour].avgFee <= avgOverallFee * 0.9) {
        nextOptimalHour = checkHour;
        break;
      }
    }

    // Day of week recommendations
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDays = dailyStats
      .map((stat, day) => ({ day: dayNames[day], ...stat }))
      .filter(stat => stat.count > 0)
      .sort((a, b) => a.avgFee - b.avgFee)
      .slice(0, 3);

    return Response.json({
      analysis_period: `${days} days`,
      total_transactions: transactions.length,
      current_conditions: {
        hour: currentHour,
        is_optimal: isGoodTimeNow,
        current_avg_fee: currentHourStats.avgFee || 0,
        overall_avg_fee: avgOverallFee,
        savings_if_wait: savingsPotential
      },
      optimal_hours: optimalHours.map(h => ({
        hour: h.hour,
        hour_utc: `${h.hour}:00 UTC`,
        avg_fee_usd: h.avgFee.toFixed(2),
        sample_size: h.count
      })),
      next_optimal_window: nextOptimalHour ? {
        hour: nextOptimalHour,
        hours_from_now: (nextOptimalHour - currentHour + 24) % 24,
        estimated_savings_percent: savingsPotential
      } : null,
      best_days_of_week: bestDays.map(d => ({
        day: d.day,
        avg_fee_usd: d.avgFee.toFixed(2),
        sample_size: d.count
      })),
      recommendation: isGoodTimeNow 
        ? 'Current time is optimal for transactions'
        : `Consider waiting ${nextOptimalHour ? `${(nextOptimalHour - currentHour + 24) % 24} hours` : 'for lower fees'} to save ~${savingsPotential.toFixed(0)}%`,
      confidence_score: transactions.length > 50 ? 'high' : transactions.length > 20 ? 'medium' : 'low'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});