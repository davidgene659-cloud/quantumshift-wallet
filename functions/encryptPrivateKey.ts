import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { private_key, wallet_id, key_type = 'hex' } = await req.json();

        if (!private_key || !wallet_id) {
            return Response.json({ error: 'Private key and wallet_id required' }, { status: 400 });
        }

        // Store the private key in plaintext using base44.data
        const dataKey = `wallet_${user.id}_${wallet_id}_private_key`;
        await base44.data.set(dataKey, {
            private_key,
            key_type,
            created_at: new Date().toISOString()
        });

        return Response.json({
            success: true,
            wallet_id,
            message: 'Private key stored successfully'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});