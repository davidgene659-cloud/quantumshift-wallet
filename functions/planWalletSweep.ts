import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { target_wallet_id, include_wallet_ids, min_balance_threshold = 0.01 } = await req.json();

    if (!target_wallet_id) {
      return Response.json({ error: 'target_wallet_id is required' }, { status: 400 });
    }

    // Get target wallet
    const targetWallet = await base44.entities.ImportedWallet.get(target_wallet_id);
    if (!targetWallet || targetWallet.user_id !== user.id) {
      return Response.json({ error: 'Invalid target wallet' }, { status: 400 });
    }

    // Get all user wallets
    let sourceWallets = await base44.entities.ImportedWallet.filter({
      user_id: user.id,
      is_active: true
    });

    // Filter out target wallet and apply filters
    sourceWallets = sourceWallets.filter(w => w.id !== target_wallet_id);
    
    if (include_wallet_ids && include_wallet_ids.length > 0) {
      sourceWallets = sourceWallets.filter(w => include_wallet_ids.includes(w.id));
    }

    // Fetch current balances
    const balancesResponse = await base44.functions.invoke('checkAllBalances', {});
    const balanceData = balancesResponse.data?.wallets || [];

    // Create balance map
    const balanceMap = {};
    balanceData.forEach(b => {
      balanceMap[b.address] = b;
    });

    // Analyze each source wallet for sweep opportunities
    const sweepPlan = [];
    let totalEstimatedCost = 0;
    let totalValueToSweep = 0;

    for (const wallet of sourceWallets) {
      const balanceInfo = balanceMap[wallet.address];
      if (!balanceInfo || balanceInfo.balance < min_balance_threshold) {
        continue;
      }

      const blockchain = wallet.blockchain;
      let estimatedFee = 0;
      let canSweep = false;

      // Enhanced fee estimation using gas oracle
      try {
        const gasResponse = await base44.functions.invoke('getGasOracle', {
          blockchain: blockchain
        });
        
        const gasData = gasResponse.data;
        
        if (blockchain === 'bitcoin') {
          // BTC: fee per byte * estimated transaction size
          const satPerByte = gasData?.instant || 50;
          const txSize = 250; // Average transaction size
          estimatedFee = (satPerByte * txSize) / 1e8;
          canSweep = balanceInfo.balance > estimatedFee * 3;
        } else if (blockchain === 'ethereum') {
          // ETH: gas price * gas limit
          const gasPriceGwei = gasData?.instant || 50;
          const gasLimit = 21000;
          estimatedFee = (gasPriceGwei * gasLimit) / 1e9;
          canSweep = balanceInfo.balance > estimatedFee * 2.5;
        } else if (blockchain === 'solana') {
          estimatedFee = 0.000005;
          canSweep = balanceInfo.balance > estimatedFee * 10;
        } else if (['polygon', 'bsc'].includes(blockchain)) {
          const gasPriceGwei = gasData?.instant || 20;
          const gasLimit = 21000;
          estimatedFee = (gasPriceGwei * gasLimit) / 1e9;
          canSweep = balanceInfo.balance > estimatedFee * 5;
        }
      } catch (error) {
        // Fallback to conservative estimates
        if (blockchain === 'bitcoin') estimatedFee = 0.0002;
        else if (blockchain === 'ethereum') estimatedFee = 0.002;
        else if (blockchain === 'solana') estimatedFee = 0.00001;
        else estimatedFee = 0.001;
        
        canSweep = balanceInfo.balance > estimatedFee * 3;
      }

      if (!canSweep) {
        continue;
      }

      const amountToSweep = balanceInfo.balance - estimatedFee;
      const valueToSweep = amountToSweep * balanceInfo.price;

      sweepPlan.push({
        wallet_id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        label: wallet.label,
        current_balance: balanceInfo.balance,
        symbol: balanceInfo.symbol,
        price: balanceInfo.price,
        estimated_fee: estimatedFee,
        amount_to_sweep: amountToSweep,
        value_to_sweep_usd: valueToSweep,
        fee_usd: estimatedFee * balanceInfo.price
      });

      totalEstimatedCost += estimatedFee * balanceInfo.price;
      totalValueToSweep += valueToSweep;
    }

    // Analyze timing (get historical data)
    let timingRecommendation = null;
    try {
      const historyResponse = await base44.functions.invoke('analyzeTransactionHistory', {
        days: 30
      });
      const historyData = historyResponse.data;
      
      if (historyData.current_conditions) {
        timingRecommendation = {
          execute_now: historyData.current_conditions.is_optimal,
          wait_hours: historyData.next_optimal_window?.hours_from_now || 0,
          potential_savings_percent: historyData.current_conditions.savings_if_wait || 0,
          confidence: historyData.confidence_score
        };
      }
    } catch (error) {
      console.error('Failed to get timing recommendation:', error);
    }

    // Check cross-chain opportunities
    const crossChainOpportunities = [];
    const uniqueChains = [...new Set(sweepPlan.map(s => s.blockchain))];
    
    if (uniqueChains.length > 1 && targetWallet.blockchain !== 'bitcoin') {
      for (const sourceChain of uniqueChains) {
        if (sourceChain === targetWallet.blockchain) continue;
        
        try {
          const bridgeResponse = await base44.functions.invoke('compareBridgeCosts', {
            from_chain: sourceChain,
            to_chain: targetWallet.blockchain,
            token: 'USDC',
            amount: 1000
          });
          
          if (bridgeResponse.data?.savings?.percent > 10) {
            crossChainOpportunities.push({
              from_chain: sourceChain,
              to_chain: targetWallet.blockchain,
              savings_percent: bridgeResponse.data.savings.percent,
              recommended_bridge: bridgeResponse.data.recommended_bridge?.bridge_name
            });
          }
        } catch (error) {
          console.error(`Failed to analyze bridge from ${sourceChain}:`, error);
        }
      }
    }

    // Calculate net value after fees
    const netValueReceived = totalValueToSweep - totalEstimatedCost;
    const efficiencyPercent = totalValueToSweep > 0 
      ? (netValueReceived / totalValueToSweep * 100) 
      : 0;

    return Response.json({
      target_wallet: {
        id: targetWallet.id,
        address: targetWallet.address,
        blockchain: targetWallet.blockchain,
        label: targetWallet.label
      },
      sweep_plan: sweepPlan,
      summary: {
        total_wallets_to_sweep: sweepPlan.length,
        total_value_to_sweep_usd: totalValueToSweep,
        total_estimated_fees_usd: totalEstimatedCost,
        net_value_received_usd: netValueReceived,
        efficiency_percent: efficiencyPercent
      },
      timing_recommendation: timingRecommendation,
      cross_chain_opportunities: crossChainOpportunities,
      warnings: sweepPlan.length === 0 
        ? ['No wallets meet the minimum balance threshold for sweeping']
        : efficiencyPercent < 95
        ? ['High fee percentage - consider waiting for lower network fees']
        : []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});