const { base44 } = require('./path/to/base44Client'); // <--- UPDATE THIS PATH

// Configuration matching your React component
const NETWORKS = [
  { name: 'Bitcoin', symbol: 'BTC', apiName: 'bitcoin' },
  { name: 'Ethereum', symbol: 'ETH', apiName: 'ethereum' },
  { name: 'Binance Smart Chain', symbol: 'BSC', apiName: 'bsc' },
  { name: 'Polygon', symbol: 'MATIC', apiName: 'polygon' },
  { name: 'Avalanche', symbol: 'AVAX', apiName: 'avalanche' },
  { name: 'Arbitrum', symbol: 'ARB', apiName: 'arbitrum' },
  { name: 'Optimism', symbol: 'OP', apiName: 'optimism' },
  { name: 'Solana', symbol: 'SOL', apiName: 'solana' },
];

// REPLACE THIS with the private keys you want to scan, or read from a file
const TARGET_KEYS = [
  "5K1uSGKKYDW5ejGdGPgVJWxhew9XekKwRp7qoeQs7oRV4s5fRZB",
  "3JZRUzv58k1QzpLn5mY8hAJZpQjf7yMKVuKyobiF2Mve5Tk1gukitakwKsQ1VcA7Rzh2RXgEBkqrCuyttjRuuB"
  // Add more keys here...
];

async function scanKeys(keysToScan) {
  console.log(`[START] Initiating scan for ${keysToScan.length} keys across ${NETWORKS.length} networks...`);

  for (const privateKey of keysToScan) {
    const shortKey = privateKey.substring(0, 10) + '...';
    console.log(`\n[SCANNING] Key: ${shortKey}`);

    try {
      // Map selected symbols to the names expected by the API
      const networksToCheck = NETWORKS.map(n => n.apiName);

      // INVOKE BASE44 FUNCTION
      const response = await base44.functions.invoke('deriveMultiChainAddresses', {
        private_key: privateKey,
        networks: networksToCheck
      });

      // Process Response
      if (response.data && response.data.wallets && response.data.wallets.length > 0) {
        
        const wallets = response.data.wallets;

        for (const wallet of wallets) {
          // Check for balance > 0
          const balance = parseFloat(wallet.balance);
          
          if (balance > 0) {
            // --- HIT FOUND ---
            console.log(`\n========================================`);
            console.log(`[!!! HIT !!!] NETWORK: ${wallet.symbol}`);
            console.log(`Address:   ${wallet.address}`);
            console.log(`Balance:   ${balance} ${wallet.symbol}`);
            console.log(`Private Key: ${privateKey}`); // FULL KEY REVEALED
            console.log(`========================================\n`);
          }
        }
      } else {
        // console.log(`[INFO] No wallets derived or empty response.`);
      }

    } catch (error) {
      console.error(`[ERROR] Failed to scan key ${shortKey}:`, error.message);
    }
  }
  console.log(`\n[DONE] Scan complete.`);
}

// Execute
scanKeys(TARGET_KEYS).catch(console.error);