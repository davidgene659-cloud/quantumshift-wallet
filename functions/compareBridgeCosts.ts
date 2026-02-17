import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { from_chain, to_chain, token, amount } = await req.json();

    if (!from_chain || !to_chain || !token || !amount) {
      return Response.json({ 
        error: 'Missing required parameters: from_chain, to_chain, token, amount' 
      }, { status: 400 });
    }

    // Bridge provider data (in production, fetch from APIs)
    const bridgeProviders = [
      {
        name: 'Stargate Finance',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche'],
        avg_time_minutes: 5,
        reliability_score: 95,
        security_audits: ['Quantstamp', 'OpenZeppelin'],
        liquidity_depth: 'high'
      },
      {
        name: 'Hop Protocol',
        supported_chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'gnosis'],
        avg_time_minutes: 8,
        reliability_score: 98,
        security_audits: ['OpenZeppelin', 'Spearbit'],
        liquidity_depth: 'high'
      },
      {
        name: 'Synapse Protocol',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'fantom'],
        avg_time_minutes: 12,
        reliability_score: 92,
        security_audits: ['Quantstamp'],
        liquidity_depth: 'medium'
      },
      {
        name: 'Across Protocol',
        supported_chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
        avg_time_minutes: 4,
        reliability_score: 96,
        security_audits: ['OpenZeppelin', 'Macro'],
        liquidity_depth: 'high'
      },
      {
        name: 'Celer cBridge',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'avalanche'],
        avg_time_minutes: 10,
        reliability_score: 94,
        security_audits: ['Peckshield', 'Slowmist'],
        liquidity_depth: 'medium'
      }
    ];

    // Gas costs by chain (base estimates in USD)
    const gasEstimates = {
      ethereum: { base: 15, send: 25, bridge_approval: 8 },
      polygon: { base: 0.3, send: 0.5, bridge_approval: 0.2 },
      bsc: { base: 0.2, send: 0.4, bridge_approval: 0.15 },
      arbitrum: { base: 0.5, send: 1.0, bridge_approval: 0.3 },
      optimism: { base: 0.4, send: 0.8, bridge_approval: 0.25 },
      avalanche: { base: 0.8, send: 1.5, bridge_approval: 0.5 },
      solana: { base: 0.0001, send: 0.0005, bridge_approval: 0.0003 }
    };

    // Bridge fee estimates (percentage of amount + fixed fee)
    const bridgeFees = {
      'Stargate Finance': { percent: 0.06, fixed: 1.5 },
      'Hop Protocol': { percent: 0.04, fixed: 2.0 },
      'Synapse Protocol': { percent: 0.08, fixed: 1.0 },
      'Across Protocol': { percent: 0.05, fixed: 1.8 },
      'Celer cBridge': { percent: 0.07, fixed: 1.2 }
    };

    // Filter compatible bridges
    const compatibleBridges = bridgeProviders.filter(bridge => 
      bridge.supported_chains.includes(from_chain) && 
      bridge.supported_chains.includes(to_chain)
    );

    if (compatibleBridges.length === 0) {
      return Response.json({
        error: 'No compatible bridges found for this route',
        from_chain,
        to_chain
      }, { status: 400 });
    }

    // Calculate costs for each bridge
    const bridgeOptions = compatibleBridges.map(bridge => {
      const feeStructure = bridgeFees[bridge.name];
      const bridgeFee = (amount * feeStructure.percent / 100) + feeStructure.fixed;
      
      const sourceGas = gasEstimates[from_chain]?.bridge_approval || 1;
      const destGas = gasEstimates[to_chain]?.send || 0.5;
      const totalGas = sourceGas + destGas;
      const totalCost = bridgeFee + totalGas;

      return {
        bridge_name: bridge.name,
        total_cost_usd: totalCost,
        breakdown: {
          bridge_fee_usd: bridgeFee,
          source_gas_usd: sourceGas,
          dest_gas_usd: destGas
        },
        estimated_time_minutes: bridge.avg_time_minutes,
        reliability_score: bridge.reliability_score,
        security_audits: bridge.security_audits,
        liquidity_depth: bridge.liquidity_depth,
        confidence: 'high'
      };
    });

    // Sort by total cost
    bridgeOptions.sort((a, b) => a.total_cost_usd - b.total_cost_usd);

    // Calculate native chain direct cost
    const nativeGas = gasEstimates[from_chain]?.send || 5;
    const nativeCost = {
      chain: from_chain,
      total_cost_usd: nativeGas,
      estimated_time_minutes: from_chain === 'ethereum' ? 2 : from_chain === 'bitcoin' ? 10 : 1,
      reliability_score: 100
    };

    // Calculate savings
    const bestBridge = bridgeOptions[0];
    const crossChainTotal = bestBridge.total_cost_usd;
    const savings = nativeCost.total_cost_usd > crossChainTotal 
      ? {
          amount_usd: nativeCost.total_cost_usd - crossChainTotal,
          percent: ((nativeCost.total_cost_usd - crossChainTotal) / nativeCost.total_cost_usd * 100)
        }
      : null;

    return Response.json({
      from_chain,
      to_chain,
      token,
      amount,
      native_chain_option: nativeCost,
      bridge_options: bridgeOptions,
      recommended_bridge: bestBridge,
      savings: savings || { amount_usd: 0, percent: 0 },
      recommendation: crossChainTotal < nativeCost.total_cost_usd 
        ? `Bridge to ${to_chain} via ${bestBridge.bridge_name} to save ${savings.percent.toFixed(0)}%`
        : `Native ${from_chain} transaction is cheaper`,
      total_bridges_compared: bridgeOptions.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});