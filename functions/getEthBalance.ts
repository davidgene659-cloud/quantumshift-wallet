Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const address = body?.address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

        // Use public RPC endpoint
        const response = await fetch('https://eth.llamarpc.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1
            })
        });

        const data = await response.json();

        if (data.error) {
            return Response.json({ error: data.error.message }, { status: 400 });
        }

        // Convert from Wei to ETH
        const balanceWei = BigInt(data.result);
        const balanceEth = Number(balanceWei) / 1e18;

        return Response.json({ 
            address,
            balance: balanceEth,
            symbol: 'ETH'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});