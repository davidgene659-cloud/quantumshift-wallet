import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const wallet_id = url.searchParams.get('wallet_id');
    if (!wallet_id) return Response.json({ error: 'wallet_id required' }, { status: 400 });

    // Try plaintext storage first
    const dataKey = `wallet_${user.id}_${wallet_id}_private_key`;
    let data = await base44.data.get(dataKey);
    if (data) {
      return Response.json({ private_key: data.private_key, key_type: data.key_type, wallet_id, source: 'plaintext' });
    }

    // Fallback to encrypted SecureVault
    const vaults = await base44.entities.SecureVault.findMany({ filter: { user_id: user.id, wallet_id } });
    if (!vaults || vaults.length === 0) {
      return Response.json({ error: 'Private key not found' }, { status: 404 });
    }
    const vault = vaults[0];

    // Decryption logic (use same secret as when encrypting)
    const appSecret = Deno.env.get('ENCRYPTION_SECRET') || 'default-secret-change-in-production';
    const keyMaterial = `${user.id}-${appSecret}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(keyMaterial);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const cryptoKey = await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, ['decrypt']);

    const iv = Uint8Array.from(atob(vault.encryption_iv), c => c.charCodeAt(0));
    const encryptedData = Uint8Array.from(atob(vault.encrypted_private_key), c => c.charCodeAt(0));
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedData);
    const privateKey = new TextDecoder().decode(decryptedBuffer);

    return Response.json({ private_key: privateKey, key_type: vault.key_type, wallet_id, source: 'encrypted-vault' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});