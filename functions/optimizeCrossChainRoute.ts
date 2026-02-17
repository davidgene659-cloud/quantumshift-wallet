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
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Bridge providers to compare
    const bridges = [
      {
        name: 'Stargate',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'avalanche'],
        base_fee_percent: 0.06,
        estimated_time_minutes: 15
      },
      {
        name: 'Wormhole',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'solana'],
        base_fee_percent: 0.10,
        estimated_time_minutes: 10
      },
      {
        name: 'Synapse',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'avalanche'],
        base_fee_percent: 0.08,
        estimated_time_minutes: 12
      },
      {
        name: 'Hop Protocol',
        supported_chains: ['ethereum', 'polygon'],
        base_fee_percent: 0.04,
        estimated_time_minutes: 20
      },
      {
        name: 'Allbridge',
        supported_chains: ['ethereum', 'polygon', 'bsc', 'solana'],
        base_fee_percent: 0.12,
        estimated_time_minutes: 8
      }
    ];

    // Filter bridges that support both chains
    const compatibleBridges = bridges.filter(bridge => 
      bridge.supported_chains.includes(from_chain) && 
      bridge.supported_chains.includes(to_chain)
    );

    if (compatibleBridges.length === 0) {
      return Response.json({
        error: 'No compatible bridges found for these chains',
        suggestion: 'Consider a multi-hop route through a common chain'
      }, { status: 400 });
    }

    // Get current gas prices
    const gasOracle = await base44.functions.invoke('getGasOracle', {
      blockchain: from_chain
    });

    const gasPriceGwei = gasOracle.data?.instant || 50;
    const gasEstimate = {
      ethereum: 150000,
      polygon: 100000,
      bsc: 120000,
      solana: 5000
    }[from_chain] || 100000;

    const gasCostUSD = (gasPriceGwei * gasEstimate) / 1e9 * 2280; // Assuming ETH price

    // Calculate costs for each bridge
    const bridgeOptions = compatibleBridges.map(bridge => {
      const bridgeFee = amount * (bridge.base_fee_percent / 100);
      const totalCost = bridgeFee + gasCostUSD;
      
      return {
        bridge_name: bridge.name,
        bridge_fee_percent: bridge.base_fee_percent,
        bridge_fee_usd: bridgeFee,
        gas_cost_usd: gasCostUSD,
        total_cost_usd: totalCost,
        estimated_time_minutes: bridge.estimated_time_minutes,
        amount_received: amount - bridgeFee,
        efficiency_score: (amount - totalCost) / amount * 100
      };
    });

    // Sort by total cost (cheapest first)
    bridgeOptions.sort((a, b) => a.total_cost_usd - b.total_cost_usd);

    const recommended = bridgeOptions[0];
    const comparison = bridgeOptions.slice(1, 3);

    // Check if direct on-chain is cheaper
    const directOnChainCost = gasCostUSD * 1.2; // Assume slightly higher for direct transfer
    
    const shouldUseBridge = recommended.total_cost_usd < directOnChainCost * 1.5;

    // Multi-hop analysis
    let multiHopRoute = null;
    if (!shouldUseBridge) {
      // Analyze going through a common chain (e.g., Ethereum)
      const intermediateChain = 'ethereum';
      if (from_chain !== intermediateChain && to_chain !== intermediateChain) {
        const hop1 = bridges.find(b => 
          b.supported_chains.includes(from_chain) && 
          b.supported_chains.includes(intermediateChain)
        );
        const hop2 = bridges.find(b => 
          b.supported_chains.includes(intermediateChain) && 
          b.supported_chains.includes(to_chain)
        );

        if (hop1 && hop2) {
          const hop1Cost = amount * (hop1.base_fee_percent / 100) + gasCostUSD;
          const remainingAmount = amount - (amount * (hop1.base_fee_percent / 100));
          const hop2Cost = remainingAmount * (hop2.base_fee_percent / 100) + gasCostUSD;
          
          multiHopRoute = {
            route: `${from_chain} → ${intermediateChain} → ${to_chain}`,
            bridges: [hop1.name, hop2.name],
            total_cost_usd: hop1Cost + hop2Cost,
            total_time_minutes: hop1.estimated_time_minutes + hop2.estimated_time_minutes,
            final_amount: remainingAmount - (remainingAmount * (hop2.base_fee_percent / 100))
          };
        }
      }
    }

    return Response.json({
      from_chain,
      to_chain,
      token,
      amount,
      recommended_bridge: recommended,
      alternative_options: comparison,
      should_use_bridge: shouldUseBridge,
      direct_on_chain_cost: directOnChainCost,
      multi_hop_route: multiHopRoute,
      savings: {
        amount_usd: comparison.length > 0 ? comparison[0].total_cost_usd - recommended.total_cost_usd : 0,
        percent: comparison.length > 0 ? ((comparison[0].total_cost_usd - recommended.total_cost_usd) / comparison[0].total_cost_usd * 100) : 0
      },
      execution_steps: [
        `Approve ${token} spending on ${from_chain}`,
        `Initiate bridge transfer via ${recommended.bridge_name}`,
        `Wait ~${recommended.estimated_time_minutes} minutes for confirmation`,
        `Receive ${token} on ${to_chain}`
      ]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});