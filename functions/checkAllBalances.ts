import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALCHEMY_API_KEY = Deno.env.get('ALCHEMY_API_KEY') ?? '';

const ALCHEMY_ENDPOINTS: Record<string, string> = {
    ethereum:  `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    polygon:   `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    arbitrum:  `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    optimism:  `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    avalanche: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

const FALLBACK_PRICES: Record<string, number> = {
    BTC: 43250, ETH: 2280, SOL: 130,
    MATIC: 0.8, BNB: 310, AVAX: 35, TRX: 0.12,
};

const COINGECKO_IDS: Record<string, string> = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
    MATIC: 'matic-network', BNB: 'binancecoin',
    AVAX: 'avalanche-2', TRX: 'tron',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BATCH_SIZE = 50;
const walletBalances: any[] = [];

for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
    const batch = wallets.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
        batch.map(async (wallet: any) => {
            let balance = 0;
            let symbol = '';

            if (wallet.blockchain in ALCHEMY_ENDPOINTS) {
                balance = await getAlchemyBalance(wallet.blockchain, wallet.address);
                symbol = wallet.blockchain === 'polygon' ? 'MATIC' :
                         wallet.blockchain === 'avalanche' ? 'AVAX' : 'ETH';

            } else if (wallet.blockchain === 'bsc') {
                const res = await fetch(
                    `https://api.bscscan.com/api?module=account&action=balance&address=${wallet.address}&tag=latest`,
                    { signal: AbortSignal.timeout(6000) }
                );
                const data = await res.json();
                if (data.status === '1') balance = Number(BigInt(data.result)) / 1e18;
                symbol = 'BNB';

            } else if (wallet.blockchain === 'solana') {
                const res = await fetch('https://api.mainnet-beta.solana.com', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0', id: 1,
                        method: 'getBalance',
                        params: [wallet.address]
                    }),
                    signal: AbortSignal.timeout(6000)
                });
                const data = await res.json();
                if (data.result?.value !== undefined) balance = data.result.value / 1e9;
                symbol = 'SOL';

            } else if (wallet.blockchain === 'bitcoin') {
                let apiWorked = false;
                for (let attempt = 0; attempt < btcAPIs.length && !apiWorked; attempt++) {
                    const api = btcAPIs[btcAPIIndex];
                    btcAPIIndex = (btcAPIIndex + 1) % btcAPIs.length;
                    try {
                        const res = await fetch(api.url(wallet.address), { signal: AbortSignal.timeout(5000) });
                        if (res.ok) {
                            const data = await res.json();
                            balance = api.parse(data);
                            apiWorked = true;
                        }
                    } catch (err: any) {
                        console.log(`BTC API ${api.name} failed: ${err.message}`);
                    }
                    await sleep(300);
                }
                if (!apiWorked) balance = wallet.cached_balance || 0;
                symbol = 'BTC';

            } else if (wallet.blockchain === 'tron') {
                const res = await fetch(`https://apilist.tronscan.org/api/account?address=${wallet.address}`, { signal: AbortSignal.timeout(6000) });
                const data = await res.json();
                if (data.balance !== undefined) balance = data.balance / 1e6;
                symbol = 'TRX';
            }

            const price = livePrices[symbol] ?? 0;
            const usd_value = balance * price;

            if (balance > 0) {
                await base44.asServiceRole.entities.ImportedWallet.update(wallet.id, {
                    cached_balance: balance,
                    last_balance_check: new Date().toISOString()
                });
            }

            return {
                id: wallet.id,
                address: wallet.address,
                blockchain: wallet.blockchain,
                label: wallet.label,
                balance,
                price,
                symbol: symbol || wallet.blockchain.toUpperCase(),
                usd_value,
            };
        })
    );

    for (const result of batchResults) {
        if (result.status === 'fulfilled') {
            walletBalances.push(result.value);
        } else {
            console.error('Wallet check failed:', result.reason);
        }
    }

    // 500ms between batches to avoid rate limits
    if (i + BATCH_SIZE < wallets.length) await sleep(500);
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
