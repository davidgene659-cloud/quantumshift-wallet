import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all user's imported wallets
        const wallets = await base44.entities.ImportedWallet.filter({ 
            user_id: user.id,
            is_active: true 
        });

        // Fetch all secure vaults (encrypted private keys)
        const vaults = await base44.entities.SecureVault.filter({ 
            user_id: user.id 
        });

        // Create a map of wallet_id to vault for quick lookup
        const vaultMap = {};
        for (const vault of vaults) {
            vaultMap[vault.wallet_id] = vault;
        }

        // Get current balances
        const balanceResponse = await base44.functions.invoke('checkAllBalances', {});
        const balanceData = balanceResponse.data;

        // Create a map of addresses to balance info
        const balanceMap = {};
        if (balanceData.wallets) {
            for (const wallet of balanceData.wallets) {
                balanceMap[wallet.address] = {
                    balance: wallet.balance,
                    usd_value: wallet.usd_value,
                    symbol: wallet.symbol
                };
            }
        }

        // Build export data
        const exportData = [];
        for (const wallet of wallets) {
            const vault = vaultMap[wallet.id];
            const balanceInfo = balanceMap[wallet.address] || { balance: 0, usd_value: 0, symbol: wallet.blockchain.toUpperCase() };

            let decryptedKey = 'NO_PRIVATE_KEY_STORED';
            if (vault) {
                try {
                    // Decrypt the private key using service role
                    const decryptResponse = await base44.asServiceRole.functions.invoke('decryptPrivateKey', {
                        encrypted_key: vault.encrypted_private_key,
                        iv: vault.encryption_iv
                    });
                    decryptedKey = decryptResponse.data.private_key;
                } catch (error) {
                    console.error('Decryption error for wallet:', wallet.address, error);
                    decryptedKey = `ERROR: ${error.message}`;
                }
            }

            exportData.push({
                address: wallet.address,
                private_key: decryptedKey,
                balance: balanceInfo.balance || 0,
                token: balanceInfo.symbol || wallet.blockchain.toUpperCase()
            });
        }

        // Create CSV format
        const csvHeaders = 'Address,Private Key,Balance,Token\n';
        const csvRows = exportData.map(row => 
            `"${row.address}","${row.private_key}",${row.balance},"${row.token}"`
        ).join('\n');
        const csv = csvHeaders + csvRows;

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="wallet-export-${Date.now()}.csv"`
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});