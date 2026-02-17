import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Allow service role calls (no user check needed for service role)
        const isServiceRole = req.headers.get('x-service-role') === 'true';
        if (!isServiceRole) {
            const user = await base44.auth.me();
            if (!user) {
                return Response.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { encrypted_key, iv } = await req.json();

        if (!encrypted_key || !iv) {
            return Response.json({ error: 'Encrypted key and IV required' }, { status: 400 });
        }

        // Decrypt using AES-256-GCM
        const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || 'default-32-char-encryption-key!!';
        
        // Convert hex strings to Uint8Array
        const ivArray = new Uint8Array(iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const encryptedArray = new Uint8Array(encrypted_key.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        
        // Import key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(ENCRYPTION_KEY.slice(0, 32)),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            keyMaterial,
            encryptedArray
        );
        
        const privateKey = new TextDecoder().decode(decrypted);

        return Response.json({ private_key: privateKey });
    } catch (error) {
        return Response.json({ error: 'Decryption failed: ' + error.message }, { status: 500 });
    }
});