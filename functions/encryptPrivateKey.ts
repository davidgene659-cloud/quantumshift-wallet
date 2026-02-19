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

        // Generate encryption key from user's unique ID + app secret
        const appSecret = Deno.env.get('ENCRYPTION_SECRET') || 'default-secret-change-in-production';
        const keyMaterial = `${user.id}-${appSecret}`;
        
        // Create encryption key using Web Crypto API
        const encoder = new TextEncoder();
        const keyData = encoder.encode(keyMaterial);
        const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );

        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the private key
        const privateKeyData = encoder.encode(private_key);
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            privateKeyData
        );

        // Convert to base64 for storage
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
        const ivBase64 = btoa(String.fromCharCode(...iv));

        // Store in SecureVault
        const vault = await base44.entities.SecureVault.create({
            user_id: user.id,
            wallet_id,
            encrypted_private_key: encryptedBase64,
            encryption_iv: ivBase64,
            key_type,
            spending_enabled: true
        });

        return Response.json({
            success: true,
            vault_id: vault.id,
            message: 'Private key encrypted and stored securely'
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});