import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { ethers } from 'npm:ethers@6.11.1';
import * as bitcoin from 'npm:bitcoinjs-lib@6.1.5';
import * as ecc from 'npm:tiny-secp256k1@2.2.3';
import { ECPairFactory } from 'npm:ecpair@2.1.0';
import { Keypair } from 'npm:@solana/web3.js@1.91.7';
import bs58 from 'npm:bs58@5.0.0';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

function deriveEvmAddress(privateKey) {
  try {
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    return new ethers.Wallet(key).address;
  } catch { return null; }
}

function deriveBitcoinAddresses(privateKey) {
  try {
    let keyPair;
    try { keyPair = ECPair.fromWIF(privateKey); }
    catch { keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey.replace('0x',''), 'hex')); }
    const pubkey = Buffer.from(keyPair.publicKey);
    return {
      legacy: bitcoin.payments.p2pkh({ pubkey }).address || null,
      bech32: bitcoin.payments.p2wpkh({ pubkey }).address || null,
    };
  } catch { return { legacy: null, bech32: null }; }
}

function deriveSolanaAddress(privateKey) {
  try {
    let kp;
    try { kp = Keypair.fromSecretKey(bs58.decode(privateKey)); }
    catch { kp = Keypair.fromSeed(Buffer.from(privateKey.replace('0x',''), 'hex').slice(0, 32)); }
    return kp.publicKey.toBase58();
  } catch { return null; }
}

async function checkBalance(address, network) {
  try {
    const evmApis = {
      ethereum:  'https://api.etherscan.io/api',
      polygon:   'https://api.polygonscan.com/api',
      bsc:       'https://api.bscscan.com/api',
      avalanche: 'https://api.snowtrace.io/api',
      arbitrum:  'https://api.arbiscan.io/api',
      optimism:  'https://api-optimistic.etherscan.io/api',
    };
    if (network in evmApis) {
      const res = await fetch(`${evmApis[network]}?module=account&action=balance&address=${address}&tag=latest`);
      const d = await res.json();
      return d.status === '1' ? Number(BigInt(d.result)) / 1e18 : 0;
    }
    if (network === 'bitcoin') {
      for (const url of [
        `https://blockstream.info/api/address/${address}`,
        `https://mempool.space/api/address/${address}`
      ]) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (res.ok) { const d = await res.json(); return (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8; }
        } catch {}
      }
    }
    if (network === 'solana') {
      const res = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] })
      });
      const d = await res.json();
      return (d.result?.value || 0) / 1e9;
    }
  } catch (e) { console.error(`Balance check failed ${network}:${address}`, e); }
  return 0;
}

const SYMBOLS = {
  ethereum: 'ETH', polygon: 'MATIC', bsc: 'BNB',
  avalanche: 'AVAX', arbitrum: 'ETH', optimism: 'ETH',
  bitcoin: 'BTC', solana: 'SOL',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { private_key, networks } = await req.json();
    if (!private_key || !networks || !Array.isArray(networks)) {
      return Response.json({ error: 'private_key and networks array required' }, { status: 400 });
    }

    const derived = [];
    const evmAddress = deriveEvmAddress(private_key);

    for (const network of networks) {
      if (['ethereum','polygon','bsc','avalanche','arbitrum','optimism'].includes(network)) {
        if (evmAddress) derived.push({ network, address: evmAddress });
      } else if (network === 'bitcoin') {
        const btc = deriveBitcoinAddresses(private_key);
        if (btc.legacy) derived.push({ network: 'bitcoin', address: btc.legacy });
        if (btc.bech32 && btc.bech32 !== btc.legacy) derived.push({ network: 'bitcoin', address: btc.bech32 });
      } else if (network === 'solana') {
        const sol = deriveSolanaAddress(private_key);
        if (sol) derived.push({ network, address: sol });
      }
    }

    // Check all balances in parallel
    const wallets = await Promise.all(
      derived.map(async (d) => ({
        network: d.network,
        address: d.address,
        balance: await checkBalance(d.address, d.network),
        symbol: SYMBOLS[d.network] || d.network.toUpperCase(),
      }))
    );

    // Return ALL wallets (not just balance > 0) so import always works
    return Response.json({ wallets, total_found: wallets.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});