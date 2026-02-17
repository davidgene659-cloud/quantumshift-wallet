import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address, blockchain } = await req.json();

        if (!address || !blockchain) {
            return Response.json({ error: 'Address and blockchain required' }, { status: 400 });
        }

        const tokens = [];

        if (blockchain === 'ethereum') {
            // Use Etherscan API to get ERC-20 token list
            const response = await fetch(
                `https://api.etherscan.io/api?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${Deno.env.get('ETHERSCAN_API_KEY')}`
            );
            const data = await response.json();

            if (data.status === '1' && data.result.length > 0) {
                // Get unique tokens
                const uniqueTokens = new Map();
                data.result.forEach(tx => {
                    if (!uniqueTokens.has(tx.contractAddress)) {
                        uniqueTokens.set(tx.contractAddress, {
                            contractAddress: tx.contractAddress,
                            name: tx.tokenName,
                            symbol: tx.tokenSymbol,
                            decimals: parseInt(tx.tokenDecimal)
                        });
                    }
                });

                // Fetch balances for each token
                for (const [contractAddress, token] of uniqueTokens) {
                    try {
                        const balanceResponse = await fetch(
                            `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${Deno.env.get('ETHERSCAN_API_KEY')}`
                        );
                        const balanceData = await balanceResponse.json();

                        if (balanceData.status === '1' && balanceData.result !== '0') {
                            const balance = Number(balanceData.result) / Math.pow(10, token.decimals);
                            
                            if (balance > 0) {
                                tokens.push({
                                    ...token,
                                    balance: balance.toFixed(4),
                                    rawBalance: balanceData.result
                                });
                            }
                        }

                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 250));
                    } catch (err) {
                        console.error(`Failed to fetch balance for ${token.symbol}:`, err);
                    }
                }
            }
        } else if (['bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(blockchain)) {
            // For other EVM chains, use similar approach with respective block explorers
            const apiUrls = {
                bsc: 'https://api.bscscan.com/api',
                polygon: 'https://api.polygonscan.com/api',
                avalanche: 'https://api.snowtrace.io/api',
                arbitrum: 'https://api.arbiscan.io/api',
                optimism: 'https://api-optimistic.etherscan.io/api'
            };

            const apiUrl = apiUrls[blockchain];
            if (apiUrl) {
                try {
                    const response = await fetch(
                        `${apiUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc`
                    );
                    const data = await response.json();

                    if (data.status === '1' && data.result.length > 0) {
                        const uniqueTokens = new Map();
                        data.result.forEach(tx => {
                            if (!uniqueTokens.has(tx.contractAddress)) {
                                uniqueTokens.set(tx.contractAddress, {
                                    contractAddress: tx.contractAddress,
                                    name: tx.tokenName,
                                    symbol: tx.tokenSymbol,
                                    decimals: parseInt(tx.tokenDecimal)
                                });
                            }
                        });

                        for (const [contractAddress, token] of uniqueTokens) {
                            try {
                                const balanceResponse = await fetch(
                                    `${apiUrl}?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest`
                                );
                                const balanceData = await balanceResponse.json();

                                if (balanceData.status === '1' && balanceData.result !== '0') {
                                    const balance = Number(balanceData.result) / Math.pow(10, token.decimals);
                                    
                                    if (balance > 0) {
                                        tokens.push({
                                            ...token,
                                            balance: balance.toFixed(4),
                                            rawBalance: balanceData.result
                                        });
                                    }
                                }

                                await new Promise(resolve => setTimeout(resolve, 250));
                            } catch (err) {
                                console.error(`Failed to fetch balance for ${token.symbol}:`, err);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch tokens for ${blockchain}:`, err);
                }
            }
        }

        return Response.json({ tokens });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});