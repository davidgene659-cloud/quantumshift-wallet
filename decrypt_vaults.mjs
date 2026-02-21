import crypto from 'crypto';

const ENCRYPTION_SECRET = '1cc0d7ace0edc6fa2f4f6538705ec960e9ac8083f03ffcf742dcc87417c66d46';

async function deriveKey(secret) {
  const keyMaterial = await crypto.webcrypto.subtle.importKey(
    'raw', Buffer.from(secret, 'hex'),
    { name: 'HKDF' }, false, ['deriveKey']
  );
  return crypto.webcrypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(16), info: new Uint8Array(0) },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, ['decrypt']
  );
}

async function decrypt(encryptedBase64, ivBase64) {
  const key = await deriveKey(ENCRYPTION_SECRET);
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const decrypted = await crypto.webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  return Buffer.from(decrypted).toString('utf8');
}

// Paste your vault records here
const vaults = [
  { id: '6993f918101da0b28eabb769', encrypted_private_key: 'TSaFepFGLoZwVsWeei7rvPGSGwBlA0M2xoMNY4EC+VEIanof4aM6AoUm0L2PhGgceJYsQvqzaD1/s7d5yUsj9/VyOFhyoqoUaqEKYXD8Mawf1w8fc+rQOtaHsi0f0HawdvlH9jYiCYHPpvx4wA==', encryption_iv: 'dOPHBYe/zeJlA4UF', wallet_id: '6993f91780ae8e08d31f76f6' },
];

for (const vault of vaults) {
  try {
    const pk = await decrypt(vault.encrypted_private_key, vault.encryption_iv);
    console.log(`wallet_id: ${vault.wallet_id} | private_key: ${pk}`);
  } catch(e) {
    console.log(`wallet_id: ${vault.wallet_id} | FAILED: ${e.message}`);
  }
}
