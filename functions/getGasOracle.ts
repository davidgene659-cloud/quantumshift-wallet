import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { blockchain } = await req.json();

        let gasData = {};

        if (blockchain === 'ethereum') {
            // Aggregate multiple gas oracles for accuracy
            const [etherscan, ethGasStation, blocknative] = await Promise.allSettled([
                fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(r => r.json()),
                fetch('https://ethgasstation.info/api/ethgasAPI.json').then(r => r.json()),
                fetch('https://api.blocknative.com/gasprices/blockprices').then(r => r.json())
            ]);

            // Average the results for more accurate prediction
            let slow = 0, standard = 0, fast = 0, count = 0;

            if (etherscan.status === 'fulfilled' && etherscan.value.result) {
                const data = etherscan.value.result;
                slow += parseFloat(data.SafeGasPrice);
                standard += parseFloat(data.ProposeGasPrice);
                fast += parseFloat(data.FastGasPrice);
                count++;
            }

            if (ethGasStation.status === 'fulfilled') {
                const data = ethGasStation.value;
                slow += data.safeLow / 10;
                standard += data.average / 10;
                fast += data.fast / 10;
                count++;
            }

            if (blocknative.status === 'fulfilled' && blocknative.value.blockPrices?.[0]) {
                const data = blocknative.value.blockPrices[0].estimatedPrices;
                const slowPrice = data.find(p => p.confidence === 70);
                const standardPrice = data.find(p => p.confidence === 80);
                const fastPrice = data.find(p => p.confidence === 95);
                
                if (slowPrice) { slow += slowPrice.maxFeePerGas; count++; }
                if (standardPrice) standard += standardPrice.maxFeePerGas;
                if (fastPrice) fast += fastPrice.maxFeePerGas;
            }

            gasData = {
                blockchain: 'ethereum',
                timestamp: new Date().toISOString(),
                prices: {
                    slow: { 
                        gwei: Math.round(slow / count), 
                        estimatedTime: '10-15 min',
                        estimatedCost: ((slow / count) * 21000 * 0.000000001 * 2800).toFixed(2)
                    },
                    standard: { 
                        gwei: Math.round(standard / count), 
                        estimatedTime: '3-5 min',
                        estimatedCost: ((standard / count) * 21000 * 0.000000001 * 2800).toFixed(2)
                    },
                    fast: { 
                        gwei: Math.round(fast / count), 
                        estimatedTime: '30-60 sec',
                        estimatedCost: ((fast / count) * 21000 * 0.000000001 * 2800).toFixed(2)
                    }
                },
                congestionLevel: slow / count > 100 ? 'high' : slow / count > 50 ? 'medium' : 'low',
                recommendation: slow / count > 100 ? 'Consider waiting for lower fees' : 'Good time to transact'
            };
        } else if (blockchain === 'polygon') {
            const response = await fetch('https://gasstation.polygon.technology/v2');
            const data = await response.json();

            gasData = {
                blockchain: 'polygon',
                timestamp: new Date().toISOString(),
                prices: {
                    slow: { 
                        gwei: Math.round(data.safeLow.maxFee), 
                        estimatedTime: '5-10 min',
                        estimatedCost: (data.safeLow.maxFee * 21000 * 0.000000001 * 0.75).toFixed(4)
                    },
                    standard: { 
                        gwei: Math.round(data.standard.maxFee), 
                        estimatedTime: '2-3 min',
                        estimatedCost: (data.standard.maxFee * 21000 * 0.000000001 * 0.75).toFixed(4)
                    },
                    fast: { 
                        gwei: Math.round(data.fast.maxFee), 
                        estimatedTime: '30 sec',
                        estimatedCost: (data.fast.maxFee * 21000 * 0.000000001 * 0.75).toFixed(4)
                    }
                },
                congestionLevel: data.standard.maxFee > 200 ? 'high' : data.standard.maxFee > 100 ? 'medium' : 'low',
                recommendation: 'Polygon typically has low fees'
            };
        } else if (blockchain === 'bsc') {
            // BSC gas price estimation
            const response = await fetch('https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken');
            const data = await response.json();

            if (data.status === '1') {
                gasData = {
                    blockchain: 'bsc',
                    timestamp: new Date().toISOString(),
                    prices: {
                        slow: { 
                            gwei: Math.round(data.result.SafeGasPrice), 
                            estimatedTime: '5-8 min',
                            estimatedCost: (data.result.SafeGasPrice * 21000 * 0.000000001 * 550).toFixed(4)
                        },
                        standard: { 
                            gwei: Math.round(data.result.ProposeGasPrice), 
                            estimatedTime: '2-3 min',
                            estimatedCost: (data.result.ProposeGasPrice * 21000 * 0.000000001 * 550).toFixed(4)
                        },
                        fast: { 
                            gwei: Math.round(data.result.FastGasPrice), 
                            estimatedTime: '30-60 sec',
                            estimatedCost: (data.result.FastGasPrice * 21000 * 0.000000001 * 550).toFixed(4)
                        }
                    },
                    congestionLevel: data.result.ProposeGasPrice > 10 ? 'medium' : 'low',
                    recommendation: 'BSC fees are generally low'
                };
            }
        }

        // Add spike alert if fees are unusually high
        const isSpike = gasData.congestionLevel === 'high' || 
                       (gasData.prices?.standard?.gwei > 80 && blockchain === 'ethereum');

        if (isSpike) {
            gasData.alert = {
                type: 'fee_spike',
                severity: 'high',
                message: `${blockchain} network experiencing high congestion. Consider delaying non-urgent transactions.`,
                suggestion: 'Wait 2-4 hours for potential fee reduction'
            };
        }

        return Response.json(gasData);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});