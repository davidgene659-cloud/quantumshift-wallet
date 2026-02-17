Deno.serve(async (req) => {
    const body = await req.json();
    const { address } = body;

    if (!address) {
        return Response.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Fetch ETH balance from Ethereum mainnet using Cloudflare's public RPC
    const response = await fetch('https://cloudflare-eth.com', {
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
});