import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Hardcoded fallback fees used when external APIs fail or timeout
const FALLBACKS = {
  bitcoin:   { slow: 25, standard: 25, fast: 25 },       // sat/vB - fixed as requested
  ethereum:  { slow: 20, standard: 35, fast: 60 },        // gwei
  polygon:   { slow: 80, standard: 120, fast: 200 },      // gwei
  bsc:       { slow: 3,  standard: 5,  fast: 8  },        // gwei
  avalanche: { slow: 25, standard: 35, fast: 50 },        // gwei
  arbitrum:  { slow: 0.1,standard: 0.2,fast: 0.3 },      // gwei
  optimism:  { slow: 0.1,standard: 0.2,fast: 0.3 },      // gwei
  solana:    { slow: 0.000005, standard: 0.000005, fast: 0.000005 }, // SOL flat fee
};

async function fetchWithTimeout(url, timeoutMs = 4000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildEvmResponse(blockchain, slow, standard, fast, nativePrice) {
  const gasLimit = 21000;
  const toEth = (gwei) => gwei * gasLimit * 1e-9;
  return {
    blockchain,
    timestamp: new Date().toISOString(),
    instant: fast,
    prices: {
      slow:     { gwei: Math.round(slow),     estimatedTime: '10-15 min', estimatedCost: (toEth(slow)     * nativePrice).toFixed(4) },
      standard: { gwei: Math.round(standard), estimatedTime: '3-5 min',   estimatedCost: (toEth(standard) * nativePrice).toFixed(4) },
      fast:     { gwei: Math.round(fast),     estimatedTime: '30-60 sec', estimatedCost: (toEth(fast)     * nativePrice).toFixed(4) },
    },
    congestionLevel: standard > 80 ? 'high' : standard > 40 ? 'medium' : 'low',
    recommendation: standard > 80 ? 'High congestion - consider waiting' : 'Good time to transact',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { blockchain } = await req.json();

    // ── BITCOIN ── fixed at 25 sat/vB
    if (blockchain === 'bitcoin') {
      const satPerVbyte = 25;
      const feeBtc = (satPerVbyte * 250) / 1e8;
      const btcPrice = 43250;
      return Response.json({
        blockchain: 'bitcoin',
        timestamp: new Date().toISOString(),
        instant: satPerVbyte,
        prices: {
          slow:     { sat_per_vbyte: satPerVbyte, estimatedTime: '~60 min', estimatedCost: (feeBtc * btcPrice).toFixed(4) },
          standard: { sat_per_vbyte: satPerVbyte, estimatedTime: '~30 min', estimatedCost: (feeBtc * btcPrice).toFixed(4) },
          fast:     { sat_per_vbyte: satPerVbyte, estimatedTime: '~10 min', estimatedCost: (feeBtc * btcPrice).toFixed(4) },
        },
        congestionLevel: 'low',
        recommendation: 'Fixed fee rate of 25 sat/vB',
      });
    }

    // ── SOLANA ── flat fee, no oracle needed
    if (blockchain === 'solana') {
      return Response.json({
        blockchain: 'solana',
        timestamp: new Date().toISOString(),
        instant: 0.000005,
        prices: {
          slow:     { sol: 0.000005, estimatedTime: '~30 sec', estimatedCost: '0.0007' },
          standard: { sol: 0.000005, estimatedTime: '~15 sec', estimatedCost: '0.0007' },
          fast:     { sol: 0.000005, estimatedTime: '~5 sec',  estimatedCost: '0.0007' },
        },
        congestionLevel: 'low',
        recommendation: 'Solana fees are always minimal',
      });
    }

    // ── ETHEREUM ── try oracle, fallback immediately on timeout
    if (blockchain === 'ethereum') {
      const data = await fetchWithTimeout('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      const fb = FALLBACKS.ethereum;
      const slow     = data?.result ? parseFloat(data.result.SafeGasPrice)    : fb.slow;
      const standard = data?.result ? parseFloat(data.result.ProposeGasPrice) : fb.standard;
      const fast     = data?.result ? parseFloat(data.result.FastGasPrice)    : fb.fast;
      return Response.json(buildEvmResponse('ethereum', slow, standard, fast, 2280));
    }

    // ── POLYGON ──
    if (blockchain === 'polygon') {
      const data = await fetchWithTimeout('https://gasstation.polygon.technology/v2');
      const fb = FALLBACKS.polygon;
      const slow     = data?.safeLow?.maxFee     ?? fb.slow;
      const standard = data?.standard?.maxFee    ?? fb.standard;
      const fast     = data?.fast?.maxFee        ?? fb.fast;
      return Response.json(buildEvmResponse('polygon', slow, standard, fast, 0.8));
    }

    // ── BSC ──
    if (blockchain === 'bsc') {
      const data = await fetchWithTimeout('https://api.bscscan.com/api?module=gastracker&action=gasoracle');
      const fb = FALLBACKS.bsc;
      const slow     = data?.result ? parseFloat(data.result.SafeGasPrice)    : fb.slow;
      const standard = data?.result ? parseFloat(data.result.ProposeGasPrice) : fb.standard;
      const fast     = data?.result ? parseFloat(data.result.FastGasPrice)    : fb.fast;
      return Response.json(buildEvmResponse('bsc', slow, standard, fast, 310));
    }

    // ── AVALANCHE / ARBITRUM / OPTIMISM ── no reliable free oracle, use fallbacks
    if (['avalanche', 'arbitrum', 'optimism'].includes(blockchain)) {
      const fb = FALLBACKS[blockchain];
      const prices = { avalanche: 35, arbitrum: 2280, optimism: 2280 };
      return Response.json(buildEvmResponse(blockchain, fb.slow, fb.standard, fb.fast, prices[blockchain]));
    }

    return Response.json({ error: 'Unsupported blockchain' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});