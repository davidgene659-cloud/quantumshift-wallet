import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        // ── Fetch live prices upfront for ALL native coins ──
        const FALLBACK_PRICES: Record<string, number> = {
            BTC: 43250, ETH: 2280, SOL: 130,
            MATIC: 0.8, BNB: 310, AVAX: 35,
            TRX: 0.12,
        };

        const COINGECKO_IDS: Record<string, string> = {
            BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
            MATIC: 'matic-network', BNB: 'binancecoin',
            AVAX: 'avalanche-2', TRX: 'tron',
        };

        const livePrices: Record<string, number> = { ...FALLBACK_PRICES };

        try {
            const ids = Object.values(COINGECKO_IDS).join(',');
            const priceRes = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
                { signal: AbortSignal.timeout(6000) }
            );
            if (priceRes.ok) {
                const priceData = await priceRes.json();
                for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
                    const p = priceData[geckoId]?.usd;
                    if (p && p > 0) {
                        livePrices[symbol] = p;
                        console.log(`Live price: ${symbol} = $${p}`);
                    }
                }
            }
        } catch (err) {
            console.log(`CoinGecko fetch failed, using fallback prices: ${err.message}`);
        }

        // ── Bitcoin API rotation ──
        const btcAPIs = [
            { name: 'blockstream', url: (addr: string) => `https://blockstream.info/api/address/${addr}`,   parse: (d: any) => (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8 },
            { name: 'mempool',     url: (addr: string) => `https://mempool.space/api/address/${addr}`,       parse: (d: any) => (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8 },
            { name: 'blockcypher', url: (addr: string) => `https://api.blockcypher.com/v1/btc/main/addrs/${addr}/balance`, parse: (d: any) => d.balance / 1e8 },
        ];
        let btcAPIIndex = 0;

        // ── EVM chain config ──
        const evmChains: Record<string, { api: string; symbol: string }> = {
            ethereum:  { api: 'https://api.etherscan.io/api',             symbol: 'ETH'  },
            polygon:   { api: 'https://api.polygonscan.com/api',           symbol: 'MATIC'},
            bsc:       { api: 'https://api.bscscan.com/api',               symbol: 'BNB'  },
            avalanche: { api: 'https://api.snowtrace.io/api',              symbol: 'AVAX' },
            arbitrum:  { api: 'https://api.arbiscan.io/api',               symbol: 'ETH'  },
            optimism:  { api: 'https://api-optimistic.etherscan.io/api',   symbol: 'ETH'  },
        };

        const walletBalances = [];

        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];

            try {
                let balance = 0;
                let symbol = '';

                if (wallet.blockchain in evmChains) {
                    const chain = evmChains[wallet.blockchain];
                    const response = await fetch(
                        `${chain.api}?module=account&action=balance&address=${wallet.address}&tag=latest`
                    );
                    const data = await response.json();
                    if (data.status === '1') {
                        balance = Number(BigInt(data.result)) / 1e18;
                        symbol = chain.symbol;
                    } else {
                        console.warn(`EVM balance fetch failed for ${wallet.address} on ${wallet.blockchain}: ${data.message}`);
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
                        symbol = 'SOL';
                    }
                } else if (wallet.blockchain === 'tron') {
                    const response = await fetch(`https://apilist.tronscan.org/api/account?address=${wallet.address}`);
                    const data = await response.json();
                    if (data.balance !== undefined) {
                        balance = data.balance / 1e6;
                        symbol = 'TRX';
                    }
                } else if (wallet.blockchain === 'bitcoin') {
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
                    if (!apiWorked) {
                        balance = wallet.cached_balance || 0;
                        console.log(`Using cached balance for ${wallet.address}`);
                    }
                    symbol = 'BTC';
                }

                // Use live price (already includes fallback)
                const price = livePrices[symbol] ?? 0;
                const usd_value = balance * price;

                // Cache the fresh balance
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
                    usd_value,
                });

                if (i < wallets.length - 1 && wallet.blockchain === 'bitcoin') {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Error checking wallet ${wallet.address}:`, error);
                const symbol = wallet.blockchain.toUpperCase();
                const price = livePrices[symbol] ?? 0;
                walletBalances.push({
                    id: wallet.id,
                    address: wallet.address,
                    blockchain: wallet.blockchain,
                    label: wallet.label,
                    balance: wallet.cached_balance || 0,
                    price,
                    symbol,
                    usd_value: (wallet.cached_balance || 0) * price,
                });
            }
        }

        const totalBalanceUsd = walletBalances.reduce((sum, w) => sum + w.usd_value, 0);

        console.log(`Native wallets fetched: ${walletBalances.length}`);
        console.log(`Total USD: $${totalBalanceUsd.toFixed(2)}`);

        return Response.json({
            total_balance_usd: totalBalanceUsd,
            wallets: walletBalances,
            checked_at: new Date().toISOString()
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
