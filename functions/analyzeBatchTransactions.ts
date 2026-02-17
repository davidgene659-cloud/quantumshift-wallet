import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transactions, blockchain } = await req.json();

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return Response.json({ error: 'Transactions array required' }, { status: 400 });
        }

        // Analyze if batching is possible and beneficial
        const batchingAnalysis = {
            canBatch: false,
            recommendations: [],
            estimatedSavings: 0,
            implementation: null
        };

        // Group transactions by recipient and token
        const grouped = {};
        transactions.forEach(tx => {
            const key = `${tx.to}_${tx.token || 'native'}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(tx);
        });

        // Check if batching is beneficial
        const multipleToSame = Object.values(grouped).some(g => g.length > 1);
        const sameToken = transactions.every(tx => tx.token === transactions[0].token);

        if (blockchain === 'ethereum' || blockchain === 'polygon' || blockchain === 'bsc') {
            if (multipleToSame) {
                batchingAnalysis.canBatch = true;
                batchingAnalysis.recommendations.push({
                    type: 'consolidate_recipients',
                    message: 'Multiple transactions to same recipients can be combined',
                    savings: (transactions.length - Object.keys(grouped).length) * 21000 * 0.00000003 * 2800,
                    savingsPercent: ((transactions.length - Object.keys(grouped).length) / transactions.length * 100).toFixed(0)
                });
            }

            if (transactions.length >= 3 && sameToken) {
                batchingAnalysis.canBatch = true;
                batchingAnalysis.recommendations.push({
                    type: 'smart_contract_batch',
                    message: 'Use smart contract batching (e.g., Disperse.app)',
                    savings: transactions.length * 21000 * 0.4 * 0.00000003 * 2800,
                    savingsPercent: 40,
                    tool: 'Disperse.app or custom MultiSend contract'
                });
            }

            // Check for small amounts that could wait
            const smallTxs = transactions.filter(tx => tx.amount < 0.01);
            if (smallTxs.length >= 2) {
                batchingAnalysis.recommendations.push({
                    type: 'delay_small_transactions',
                    message: `${smallTxs.length} small transactions detected. Consider batching them in a single session during low-fee periods`,
                    potentialSavings: smallTxs.length * 21000 * 0.5 * 0.00000003 * 2800
                });
            }
        } else if (blockchain === 'bitcoin') {
            // Bitcoin UTXO batching
            const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
            const individualFees = transactions.length * 0.0001; // Approx fee per tx
            const batchedFee = 0.0002; // Approx fee for batched tx

            if (transactions.length >= 2) {
                batchingAnalysis.canBatch = true;
                batchingAnalysis.recommendations.push({
                    type: 'bitcoin_batch',
                    message: 'Batch Bitcoin transactions into a single transaction with multiple outputs',
                    savings: (individualFees - batchedFee) * 43000,
                    savingsPercent: ((individualFees - batchedFee) / individualFees * 100).toFixed(0),
                    implementation: 'Use Bitcoin Core sendmany command or wallet with batching support'
                });
            }
        }

        // Calculate total estimated savings
        batchingAnalysis.estimatedSavings = batchingAnalysis.recommendations.reduce(
            (sum, rec) => sum + (rec.savings || rec.potentialSavings || 0), 
            0
        );

        // Add timing recommendation
        if (batchingAnalysis.canBatch) {
            batchingAnalysis.recommendations.push({
                type: 'timing',
                message: 'Execute batched transactions during off-peak hours (typically weekends or late nights UTC)',
                additionalSavings: batchingAnalysis.estimatedSavings * 0.3
            });
        }

        return Response.json({
            canBatch: batchingAnalysis.canBatch,
            transactionCount: transactions.length,
            recommendations: batchingAnalysis.recommendations,
            totalEstimatedSavings: batchingAnalysis.estimatedSavings.toFixed(2),
            summary: batchingAnalysis.canBatch 
                ? `You can save approximately $${batchingAnalysis.estimatedSavings.toFixed(2)} by batching these transactions`
                : 'No significant batching opportunities found for these transactions'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});