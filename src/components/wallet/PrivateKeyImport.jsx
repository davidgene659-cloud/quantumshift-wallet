const fs = require('fs');
// Assuming base44Client is available in your project structure
const { base44 } = require('./path/to/base44Client'); 

// Configuration
const NETWORKS = [
  { name: 'Bitcoin', symbol: 'BTC' },
  { name: 'Ethereum', symbol: 'ETH' },
  { name: 'Binance Smart Chain', symbol: 'BSC' },
  { name: 'Polygon', symbol: 'MATIC' },
  { name: 'Avalanche', symbol: 'AVAX' },
  { name: 'Arbitrum', symbol: 'ARB' },
  { name: 'Optimism', symbol: 'OP' },
  { name: 'Solana', symbol: 'SOL' },
];

// Load private keys from a .txt file
function loadPrivateKeys(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    // Split by newline, remove empty lines and whitespace
    return data.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  } catch (err) {
    console.error('Error reading file:', err);
    return [];
  }
}

// Main Scanner Function
async function scanKeys() {
  console.log('Starting Base44 Bulk Scanner...');
  
  // 1. Load Keys
  const keys = loadPrivateKeys('keys.txt');
  if (keys.length === 0) {
    console.log('No keys found in keys.txt. Exiting.');
    return;
  }
  console.log(`Loaded ${keys.length} private keys from keys.txt.`);

  // 2. Authenticate (Assuming base44 handles auth internally or you need to set it up)
  // If base44 requires explicit auth, you might need:
  // await base44.auth.login({ email: '...', password: '...' });
  
  const results = [];
  let processedCount = 0;

  // 3. Iterate and Scan
  for (const privateKey of keys) {
    processedCount++;
    console.log(`Scanning key ${processedCount}/${keys.length}...`);

    // Loop through each supported network
    for (const network of NETWORKS) {
      try {
        // We invoke the 'deriveMultiChainAddresses' function 
        // (based on your original React code logic)
        const response = await base44.functions.invoke('deriveMultiChainAddresses', {
          private_key: privateKey,
          networks: [network.symbol.toLowerCase()] // Check one at a time for clarity, or batch them
        });

        if (response.data && response.data.wallets && response.data.wallets.length > 0) {
          const walletData = response.data.wallets[0];
          
          // Check if balance exists (base44 usually returns formatted balance)
          if (walletData.balance && parseFloat(walletData.balance) > 0) {
            results.push({
              private_key: privateKey,
              network: network.name,
              address: walletData.address,
              balance: walletData.balance,
              symbol: network.symbol
            });
            
            console.log(`\n[!!! HIT FOUND !!!]`);
            console.log(`Network: ${network.name}`);
            console.log(`Address: ${walletData.address}`);
            console.log(`Balance: ${walletData.balance} ${network.symbol}`);
            console.log(`Private Key: ${privateKey}`);
            console.log(`--------------------------\n`);
          }
        }
      } catch (error) {
        // Silent fail to keep loop moving, or log verbose error
        // console.error(`Error scanning ${network.symbol}:`, error.message);
      }
    }
  }

  // 4. Final Report
  console.log('\n=== SCAN COMPLETE ===');
  if (results.length === 0) {
    console.log('No balances found.');
  } else {
    console.log(`Found ${results.length} wallets with positive balances:`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.network} (${r.symbol}): ${r.balance} - ${r.address}`);
      console.log(`   Key: ${r.private_key}`);
    });
  }
}

// Execute
scanKeys().catch(console.error);