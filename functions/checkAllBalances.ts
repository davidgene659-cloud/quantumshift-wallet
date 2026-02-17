import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all imported wallets for this user
        const wallets = await base44.entities.ImportedWallet.filter({ 
            user_id: user.id,
            is_active: true 
        });

        if (wallets.length === 0) {
            return Response.json({ 
                total_balance_usd: 0,
                wallets: [],
                message: 'No wallets imported yet'
            });
        }

        // Fetch balances for each wallet
        const balancePromises = wallets.map(async (wallet) => {
            try {
                let balance = 0;
                let price = 0;
                let symbol = '';

                if (wallet.blockchain === 'ethereum') {
                    // Check ETH balance using Etherscan API
                    const etherscanResponse = await fetch(
                        `https://api.etherscan.io/api?module=account&action=balance&address=${wallet.address}&tag=latest&apikey=${Deno.env.get('ETHERSCAN_API_KEY')}`
                    );
                    const data = await etherscanResponse.json();
                    
                    if (data.status === '1') {
                        balance = Number(BigInt(data.result)) / 1e18;
                        price = 2280;
                        symbol = 'ETH';
                    }
                } else if (wallet.blockchain === 'bitcoin') {
                    // Try multiple free Bitcoin APIs with fallbacks
                    try {
                        const btcResponse = await fetch(
                            `https://blockchain.info/q/addressbalance/${wallet.address}`
                        );
                        const satoshis = await btcResponse.text();
                        balance = Number(satoshis) / 1e8;
                    } catch {
                        try {
                            const blockstreamResponse = await fetch(
                                `https://blockstream.info/api/address/${wallet.address}`
                            );
                            const data = await blockstreamResponse.json();
                            balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8;
                        } catch {
                            const mempoolResponse = await fetch(
                                `https://mempool.space/api/address/${wallet.address}`
                            );
                            const data = await mempoolResponse.json();
                            balance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8;
                        }
                    }
                    price = 43250;
                    symbol = 'BTC';
                } else if (wallet.blockchain === 'solana') {
                    // Check SOL balance using public RPC
                    const solResponse = await fetch('https://api.mainnet-beta.solana.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'getBalance',
                            params: [wallet.address]
                        })
                    });
                    const solData = await solResponse.json();
                    if (solData.result) {
                        balance = solData.result.value / 1e9;
                        price = 98.5;
                        symbol = 'SOL';
                    }
                } else if (wallet.blockchain === 'polygon') {
                    // Check MATIC balance using Polygonscan API
                    const polyResponse = await fetch(
                        `https://api.polygonscan.com/api?module=account&action=balance&address=${wallet.address}&tag=latest&apikey=${Deno.env.get('POLYGONSCAN_API_KEY') || 'YourApiKeyToken'}`
                    );
                    const polyData = await polyResponse.json();
                    if (polyData.status === '1') {
                        balance = Number(BigInt(polyData.result)) / 1e18;
                        price = 0.88;
                        symbol = 'MATIC';
                    }
                } else if (wallet.blockchain === 'bsc') {
                    // Check BNB balance using BscScan API
                    const bscResponse = await fetch(
                        `https://api.bscscan.com/api?module=account&action=balance&address=${wallet.address}&tag=latest&apikey=${Deno.env.get('BSCSCAN_API_KEY') || 'YourApiKeyToken'}`
                    );
                    const bscData = await bscResponse.json();
                    if (bscData.status === '1') {
                        balance = Number(BigInt(bscData.result)) / 1e18;
                        price = 312;
                        symbol = 'BNB';
                    }
                }

                // Update cached balance
                await base44.asServiceRole.entities.ImportedWallet.update(wallet.id, {
                    cached_balance: balance,
                    last_balance_check: new Date().toISOString()
                });

                return {
                    id: wallet.id,
                    address: wallet.address,
                    blockchain: wallet.blockchain,
                    label: wallet.label,
                    balance,
                    price,
                    symbol,
                    usd_value: balance * price
                };
            } catch (error) {
                console.error(`Error checking wallet ${wallet.address}:`, error);
                return {
                    id: wallet.id,
                    address: wallet.address,
                    blockchain: wallet.blockchain,
                    label: wallet.label,
                    balance: wallet.cached_balance || 0,
                    price: 0,
                    symbol: wallet.blockchain.toUpperCase(),
                    usd_value: 0,
                    error: error.message
                };
            }
        });

        const walletBalances = await Promise.all(balancePromises);
        const totalBalanceUsd = walletBalances.reduce((sum, w) => sum + w.usd_value, 0);

        return Response.json({
            total_balance_usd: totalBalanceUsd,
            wallets: walletBalances,
            checked_at: new Date().toISOString()
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});