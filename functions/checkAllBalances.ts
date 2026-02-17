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

        // Rotating Bitcoin APIs to avoid rate limits
        const btcAPIs = [
            { name: 'blockstream', url: (addr) => `https://blockstream.info/api/address/${addr}`, parse: (d) => (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8 },
            { name: 'mempool', url: (addr) => `https://mempool.space/api/address/${addr}`, parse: (d) => (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8 },
            { name: 'blockcypher', url: (addr) => `https://api.blockcypher.com/v1/btc/main/addrs/${addr}/balance`, parse: (d) => d.balance / 1e8 }
        ];
        
        let btcAPIIndex = 0;

        // Check balances sequentially with small delays to avoid overwhelming APIs
        const walletBalances = [];
        
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            
            try {
                let balance = 0;
                let price = 0;
                let symbol = '';

                if (wallet.blockchain === 'ethereum') {
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
                    // Rotate through Bitcoin APIs
                    let apiWorked = false;
                    
                    for (let attempt = 0; attempt < btcAPIs.length && !apiWorked; attempt++) {
                        const api = btcAPIs[btcAPIIndex];
                        btcAPIIndex = (btcAPIIndex + 1) % btcAPIs.length;
                        
                        try {
                            const response = await fetch(api.url(wallet.address), {
                                signal: AbortSignal.timeout(5000)
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                balance = api.parse(data);
                                apiWorked = true;
                            }
                        } catch (err) {
                            console.log(`BTC API ${api.name} failed for ${wallet.address}: ${err.message}`);
                        }
                    }
                    
                    // If all APIs fail, use cached balance
                    if (!apiWorked) {
                        balance = wallet.cached_balance || 0;
                        console.log(`Using cached balance for ${wallet.address}`);
                    }
                    
                    price = 43250;
                    symbol = 'BTC';
                }

                // Update cached balance if we got a fresh one
                if (balance > 0 || wallet.cached_balance !== balance) {
                    await base44.asServiceRole.entities.ImportedWallet.update(wallet.id, {
                        cached_balance: balance,
                        last_balance_check: new Date().toISOString()
                    });
                }

                walletBalances.push({
                    id: wallet.id,
                    address: wallet.address,
                    blockchain: wallet.blockchain,
                    label: wallet.label,
                    balance,
                    price,
                    symbol: symbol || wallet.blockchain.toUpperCase(),
                    usd_value: balance * price
                });
                
                // Small delay between requests to avoid rate limits
                if (i < wallets.length - 1 && wallet.blockchain === 'bitcoin') {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Error checking wallet ${wallet.address}:`, error);
                // Still add the wallet with cached balance
                walletBalances.push({
                    id: wallet.id,
                    address: wallet.address,
                    blockchain: wallet.blockchain,
                    label: wallet.label,
                    balance: wallet.cached_balance || 0,
                    price: 0,
                    symbol: wallet.blockchain.toUpperCase(),
                    usd_value: 0
                });
            }
        }

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