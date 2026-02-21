import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import fetch from 'node-fetch';
import * as fs from 'fs';

const results = [];

// Parse hex private keys and addresses from CSV
const keys = {};
const rl = createInterface({ input: createReadStream('/home/freegeek/Videos/quantumshift-wallet/omnikey_bulk_mainnet_1771640155422.csv') });

for await (const line of rl) {
  const cols = line.split('","').map(c => c.replace(/"/g,''));
  const [original, label, format, property, value, network, balance] = cols;
  if (property === 'Hex Private Key') {
    const id = `${original}_${label}`;
    if (!keys[id]) keys[id] = { privateKey: value, addresses: [] };
  }
  if (['Legacy Address (P2PKH)', 'Native SegWit (P2WPKH)', 'Nested SegWit (P2SH-P2WPKH)'].includes(property)) {
    const id = `${original}_${label}`;
    if (!keys[id]) keys[id] = { addresses: [] };
    keys[id].addresses.push({ type: property, address: value });
  }
}

console.log(`Found ${Object.keys(keys).length} key sets`);
console.log('Scanning balances via mempool.space...\n');

let found = 0;
const entries = Object.entries(keys);

for (let i = 0; i < entries.length; i++) {
  const [id, data] = entries[i];
  for (const { type, address } of (data.addresses || [])) {
    try {
      const res = await fetch(`https://mempool.space/api/address/${address}`);
      const info = await res.json();
      const funded = info.chain_stats.funded_txo_sum;
      const spent = info.chain_stats.spent_txo_sum;
      const balance = (funded - spent) / 1e8;
      if (balance > 0) {
        found++;
        console.log(`✅ BALANCE FOUND!`);
        console.log(`   Address: ${address} (${type})`);
        console.log(`   Balance: ${balance} BTC`);
        console.log(`   Private Key: ${data.privateKey}`);
        results.push({ address, type, balance_btc: balance, privateKey: data.privateKey });
      }
    } catch(e) {
      // skip errors
    }
    await new Promise(r => setTimeout(r, 100)); // rate limit
  }
  if (i % 50 === 0) console.log(`Progress: ${i}/${entries.length}...`);
}

console.log(`\nDone. Found ${found} addresses with balance.`);
fs.writeFileSync('btc_results.json', JSON.stringify(results, null, 2));
console.log('Results saved to btc_results.json');
