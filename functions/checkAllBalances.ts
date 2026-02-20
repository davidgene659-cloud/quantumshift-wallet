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

        // Fetch live BTC price once before the wallet loop (avoid redundant calls)
        let btcPrice = 43250; // fallback
        try {
            const priceRes = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                { signal: AbortSignal.timeout(5000) }
            );
            if (priceRes.ok) {
                const priceData = await priceRes.json();
                btcPrice = priceData?.bitcoin?.usd || 43250;
                console.log(`Live BTC price fetched: $${btcPrice}`);
            }
        } catch (err) {
            console.log(`BTC price fetch failed, using fallback $${btcPrice}: ${err.message}`);
        }

        // Check balances sequentially with small delays to avoid overwhelming APIs
        const walletBalances = [];
        
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            
            try {
                let balance = 0;
                let price = 0;
                let symbol = '';

                // EVM chain config (native token balance)
                const evmChains = {
                    ethereum:  { api: 'https://api.etherscan.io/api',                  symbol: 'ETH',  price: 2280  },
                    polygon:   { api: 'https://api.polygonscan.com/api',               symbol: 'MATIC', price: 0.8  },
                    bsc:       { api: 'https://api.bscscan.com/api',                   symbol: 'BNB',  price: 310   },
                    avalanche: { api: 'https://api.snowtrace.io/api',                   symbol: 'AVAX', price: 35   },
                    arbitrum:  { api: 'https://api.arbiscan.io/api',                    symbol: 'ETH',  price: 2280 },
                    optimism:  { api: 'https://api-optimistic.etherscan.io/api',        symbol: 'ETH',  price: 2280 },
                };

                if (wallet.blockchain in evmChains) {
                    const chain = evmChains[wallet.blockchain];
                    const response = await fetch(
                        `${chain.api}?module=account&action=balance&address=${wallet.address}&tag=latest`
                    );
                    const data = await response.json();
                    if (data.status === '1') {
                        balance = Number(BigInt(data.result)) / 1e18;
                        price = chain.price;
                        symbol = chain.symbol;
                    }
                } else if (wallet.blockchain === 'solana') {
                    const response = await fetch('https://api.mainnet-beta.solana.com', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0', id: 1,
                            method: 'getBalance',
                            params: [wallet.address]
                        })
                    });
                    const data = await response.json();
                    if (data.result?.value !== undefined) {
                        balance = data.result.value / 1e9;
                        price = 130;
                        symbol = 'SOL';
                    }
                } else if (wallet.blockchain === 'tron') {
                    const response = await fetch(`https://apilist.tronscan.org/api/account?address=${wallet.address}`);
                    const data = await response.json();
                    if (data.balance !== undefined) {
                        balance = data.balance / 1e6;
                        price = 0.12;
                        symbol = 'TRX';
                    }
                } else if (wallet.blockchain === 'bitcoin') {
                    // Rotate through Bitcoin APIs
                    let apiWorked = false;
                    
                    for (let attempt = 0; attempt < btcAPIs.length && !apiWorked; attempt++) {
                        const api = btcAPIs[btcAPIIndex]; // Fix: read BEFORE incrementing
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
                    
                    price = btcPrice; // Use live price fetched above
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
