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

        let tokens = [];

        if (blockchain === 'ethereum' || blockchain === 'polygon' || blockchain === 'bsc' || blockchain === 'avalanche' || blockchain === 'arbitrum' || blockchain === 'optimism') {
            // Fetch ERC-20/BEP-20 tokens using appropriate API
            const apiEndpoints = {
                ethereum: 'https://api.etherscan.io/api',
                polygon: 'https://api.polygonscan.com/api',
                bsc: 'https://api.bscscan.com/api',
                avalanche: 'https://api.snowtrace.io/api',
                arbitrum: 'https://api.arbiscan.io/api',
                optimism: 'https://api-optimistic.etherscan.io/api'
            };

            const response = await fetch(
                `${apiEndpoints[blockchain]}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=asc&apikey=YourApiKeyToken`
            );
            
            const data = await response.json();

            if (data.status === '1' && data.result) {
                // Get unique tokens
                const uniqueTokens = {};
                
                for (const tx of data.result) {
                    if (!uniqueTokens[tx.contractAddress]) {
                        uniqueTokens[tx.contractAddress] = {
                            contract: tx.contractAddress,
                            symbol: tx.tokenSymbol,
                            name: tx.tokenName,
                            decimals: parseInt(tx.tokenDecimal)
                        };
                    }
                }

                // Fetch balances for each token
                for (const tokenAddress in uniqueTokens) {
                    const balanceResponse = await fetch(
                        `${apiEndpoints[blockchain]}?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}&tag=latest&apikey=YourApiKeyToken`
                    );
                    const balanceData = await balanceResponse.json();
                    
                    if (balanceData.status === '1') {
                        const token = uniqueTokens[tokenAddress];
                        const balance = Number(balanceData.result) / Math.pow(10, token.decimals);
                        
                        if (balance > 0) {
                            tokens.push({
                                ...token,
                                balance,
                                blockchain,
                                // Mock price - in production, fetch from CoinGecko/CoinMarketCap
                                price: Math.random() * 100,
                                usd_value: balance * (Math.random() * 100)
                            });
                        }
                    }
                }
            }
        } else if (blockchain === 'solana') {
            // Fetch SPL tokens
            const response = await fetch('https://api.mainnet-beta.solana.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenAccountsByOwner',
                    params: [
                        address,
                        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                        { encoding: 'jsonParsed' }
                    ]
                })
            });

            const data = await response.json();
            
            if (data.result?.value) {
                for (const account of data.result.value) {
                    const info = account.account.data.parsed.info;
                    const balance = info.tokenAmount.uiAmount;
                    
                    if (balance > 0) {
                        tokens.push({
                            contract: info.mint,
                            symbol: 'SPL',
                            name: 'SPL Token',
                            decimals: info.tokenAmount.decimals,
                            balance,
                            blockchain: 'solana',
                            price: Math.random() * 10,
                            usd_value: balance * (Math.random() * 10)
                        });
                    }
                }
            }
        } else if (blockchain === 'tron') {
            // Fetch TRC-20 tokens from Tron network
            const response = await fetch(`https://apilist.tronscan.org/api/account/tokens?address=${address}&start=0&limit=50`);
            const data = await response.json();
            
            if (data.data) {
                for (const token of data.data) {
                    if (token.balance && parseFloat(token.balance) > 0) {
                        const balance = parseFloat(token.balance) / Math.pow(10, token.tokenDecimal || 6);
                        tokens.push({
                            contract: token.tokenId,
                            symbol: token.tokenAbbr,
                            name: token.tokenName,
                            decimals: token.tokenDecimal || 6,
                            balance,
                            blockchain: 'tron',
                            price: Math.random() * 50,
                            usd_value: balance * (Math.random() * 50)
                        });
                    }
                }
            }
        }

        return Response.json({
            address,
            blockchain,
            tokens,
            total_tokens: tokens.length,
            total_usd_value: tokens.reduce((sum, t) => sum + t.usd_value, 0)
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});