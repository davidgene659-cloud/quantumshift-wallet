import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all imported wallets for user
        const wallets = await base44.asServiceRole.entities.ImportedWallet.filter({ 
            user_id: user.id 
        });

        // Check which wallets have encrypted keys (spendable)
        const vaults = await base44.asServiceRole.entities.SecureVault.filter({ 
            user_id: user.id 
        });

        const spendableWalletIds = new Set(vaults.map(v => v.wallet_id));
        
        // Find non-spendable wallets
        const nonSpendable = wallets.filter(w => !spendableWalletIds.has(w.id));
        
        // Delete non-spendable wallets
        let deletedCount = 0;
        for (const wallet of nonSpendable) {
            try {
                await base44.asServiceRole.entities.ImportedWallet.delete(wallet.id);
                deletedCount++;
            } catch (error) {
                console.error('Failed to delete wallet:', wallet.id, error);
            }
        }

        return Response.json({
            success: true,
            total_wallets: wallets.length,
            spendable_wallets: wallets.length - nonSpendable.length,
            deleted_wallets: deletedCount,
            remaining_wallets: wallets.length - deletedCount
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});