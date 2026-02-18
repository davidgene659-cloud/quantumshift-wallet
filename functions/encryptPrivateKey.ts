import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { encrypted_private_key, encryption_iv } = await req.json();

    if (!encrypted_private_key || !encryption_iv) {
      return Response.json({ error: 'encrypted_private_key and encryption_iv required' }, { status: 400 });
    }

    // Get the app secret from environment (must be the same as when encrypting)
    const appSecret = Deno.env.get('ENCRYPTION_SECRET') || 'default-secret-change-in-production';
    const keyMaterial = `${user.id}-${appSecret}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decode from base64
    const iv = Uint8Array.from(atob(encryption_iv), c => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(encrypted_private_key), c => c.charCodeAt(0));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );

    const privateKey = new TextDecoder().decode(decryptedBuffer);

    return Response.json({
      success: true,
      private_key: privateKey
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});