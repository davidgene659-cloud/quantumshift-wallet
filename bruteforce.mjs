import crypto from 'crypto';

const WALLET_ID = '6993f91780ae8e08d31f76f6';
const ENC_KEY = 'TSaFepFGLoZwVsWeei7rvPGSGwBlA0M2xoMNY4EC+VEIanof4aM6AoUm0L2PhGgceJYsQvqzaD1/s7d5yUsj9/VyOFhyoqoUaqEKYXD8Mawf1w8fc+rQOtaHsi0f0HawdvlH9jYiCYHPpvx4wA==';
const ENC_IV = 'dOPHBYe/zeJlA4UF';

// Add your guesses here
const passwords = ["6993fef1bcb49306b74879d9","0xbc7addfe2e7a3e7b63b40df3666d789468449c56a88710a0804d4fd518ff219c","0x346878ec72ce0e26ebf3213dd705f8b35d67186c8b77be38f3d8187192020255","Jackbnimbl3", "23b183c3-40a3-459d-8039-916070def8d1", "https://app.base44.com",
  '7IC1N9PTUBRFFPCKMIEW1MKRBSKXI8G42Y',
  '1cc0d7ace0edc6fa2f4f6538705ec960e9ac8083f03ffcf742dcc87417c66d46',
  'password', '123456', 'quantumshift', 'QuantumShift',
  'davidgene695', 'davidgene',
];

async function tryDecrypt(password) {
  const enc = new TextEncoder();
  const km = await crypto.webcrypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.webcrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(WALLET_ID), iterations: 100000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const encBytes = Uint8Array.from(atob(ENC_KEY), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ENC_IV), c => c.charCodeAt(0));
  const dec = await crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encBytes);
  return Buffer.from(dec).toString('utf8');
}

for (const pw of passwords) {
  try {
    const result = await tryDecrypt(pw);
    console.log(`✅ SUCCESS! Password: "${pw}"`);
    console.log(`Private key: ${result}`);
    process.exit(0);
  } catch(e) {
    console.log(`❌ Failed: "${pw}"`);
  }
}
console.log('\nNone worked. Add more guesses to the passwords array.');
