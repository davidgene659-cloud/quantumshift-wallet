Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const address = body?.address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

        // Validate address format (checksummed addresses have mixed case)
        if (!address.match(/^0x[a-fA-F0-9]{39,40}$/i)) {
            return Response.json({ error: 'Invalid Ethereum address format' }, { status: 400 });
        }

        // Use Etherscan API to get balance
        const etherscanResponse = await fetch(
            `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`
        );

        const etherscanData = await etherscanResponse.json();

        if (etherscanData.status !== '1') {
            return Response.json({ error: 'Failed to fetch balance from Etherscan' }, { status: 400 });
        }

        // Convert from Wei to ETH
        const balanceWei = BigInt(etherscanData.result);
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