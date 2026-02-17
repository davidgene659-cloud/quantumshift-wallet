import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { private_key, networks } = await req.json();

        if (!private_key || !networks || !Array.isArray(networks)) {
            return Response.json({ error: 'Private key and networks array required' }, { status: 400 });
        }

        // Use InvokeLLM to derive addresses from private key for multiple blockchains
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Given this private key (WIF or hex format): ${private_key}

Derive cryptocurrency addresses for these networks: ${networks.join(', ')}

For each network, derive the proper address format:
- Bitcoin: P2PKH (1...), P2SH (3...), or Bech32 (bc1...)
- Ethereum/BSC/Polygon/Avalanche/Arbitrum/Optimism: 0x... (same address for all EVM chains)
- Solana: Base58 encoded address

Return the results as a JSON array with this exact structure:
[
  {
    "network": "bitcoin",
    "address": "1ABC...",
    "derivable": true
  },
  {
    "network": "ethereum", 
    "address": "0xABC...",
    "derivable": true
  }
]

If a network cannot be derived from this private key format, set derivable to false and use empty string for address.
Return ONLY the JSON array, no explanation.`,
            response_json_schema: {
                type: "object",
                properties: {
                    addresses: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                network: { type: "string" },
                                address: { type: "string" },
                                derivable: { type: "boolean" }
                            }
                        }
                    }
                }
            }
        });

        const derivedAddresses = response.addresses || [];
        
        // Check balances for each derived address
        const walletsWithBalances = [];
        
        for (const derived of derivedAddresses) {
            if (!derived.derivable || !derived.address) continue;
            
            try {
                let balance = 0;
                let symbol = derived.network.toUpperCase();
                
                // Check balance based on network
                if (derived.network === 'bitcoin') {
                    try {
                        const btcResponse = await fetch(`https://blockchain.info/q/addressbalance/${derived.address}`);
                        if (btcResponse.ok) {
                            const satoshis = await btcResponse.text();
                            balance = parseInt(satoshis) / 100000000;
                            symbol = 'BTC';
                        }
                    } catch (e) {
                        console.error('Bitcoin balance check failed:', e);
                    }
                } else if (['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum', 'optimism'].includes(derived.network)) {
                    // Use existing function for EVM chains
                    try {
                        const balanceResponse = await base44.functions.invoke('getEthBalance', {
                            address: derived.address,
                            network: derived.network
                        });
                        balance = balanceResponse.data.balance || 0;
                        symbol = derived.network === 'ethereum' ? 'ETH' :
                                derived.network === 'bsc' ? 'BNB' :
                                derived.network === 'polygon' ? 'MATIC' :
                                derived.network === 'avalanche' ? 'AVAX' :
                                derived.network === 'arbitrum' ? 'ARB' : 'OP';
                    } catch (e) {
                        console.error(`${derived.network} balance check failed:`, e);
                    }
                } else if (derived.network === 'solana') {
                    try {
                        const solResponse = await fetch('https://api.mainnet-beta.solana.com', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getBalance',
                                params: [derived.address]
                            })
                        });
                        const solData = await solResponse.json();
                        if (solData.result) {
                            balance = (solData.result.value || 0) / 1000000000;
                            symbol = 'SOL';
                        }
                    } catch (e) {
                        console.error('Solana balance check failed:', e);
                    }
                }
                
                // Only include wallets with balance > 0
                if (balance > 0) {
                    walletsWithBalances.push({
                        network: derived.network,
                        address: derived.address,
                        balance: balance,
                        symbol: symbol
                    });
                }
            } catch (error) {
                console.error(`Balance check failed for ${derived.network}:`, error);
            }
        }

        return Response.json({ 
            wallets: walletsWithBalances,
            total_found: walletsWithBalances.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});