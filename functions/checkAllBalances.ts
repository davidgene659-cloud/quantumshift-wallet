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

                if (wallet.blockchain === 'ethereum') {
                    // Check ETH balance using Etherscan API
                    const etherscanResponse = await fetch(
                        `https://api.etherscan.io/api?module=account&action=balance&address=${wallet.address}&tag=latest&apikey=YourApiKeyToken`
                    );
                    const data = await etherscanResponse.json();
                    
                    if (data.status === '1') {
                        balance = Number(BigInt(data.result)) / 1e18;
                        price = 2280; // Approximate ETH price
                    }
                } else if (wallet.blockchain === 'bitcoin') {
                    // Use blockchain.info API for Bitcoin
                    const btcResponse = await fetch(
                        `https://blockchain.info/q/addressbalance/${wallet.address}`
                    );
                    const satoshis = await btcResponse.text();
                    balance = Number(satoshis) / 1e8;
                    price = 43250; // Approximate BTC price
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