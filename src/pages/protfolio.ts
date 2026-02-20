import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// EVM RPC endpoints (public, no API key required)
const EVM_RPC = {
  ethereum: "https://eth.llamarpc.com",
  polygon: "https://polygon.llamarpc.com",
  bsc: "https://bsc.llamarpc.com",
  avalanche: "https://avalanche.llamarpc.com",
  arbitrum: "https://arbitrum.llamarpc.com",
  optimism: "https://optimism.llamarpc.com"
};

// Native token metadata
const NATIVE_TOKENS = {
  ethereum: { symbol: "ETH", decimals: 18 },
  polygon: { symbol: "MATIC", decimals: 18 },
  bsc: { symbol: "BNB", decimals: 18 },
  avalanche: { symbol: "AVAX", decimals: 18 },
  arbitrum: { symbol: "ETH", decimals: 18 },
  optimism: { symbol: "ETH", decimals: 18 },
  solana: { symbol: "SOL", decimals: 9 },
  tron: { symbol: "TRX", decimals: 6 },
  bitcoin: { symbol: "BTC", decimals: 8 }
};

// Bitcoin API rotation
const BTC_APIS = [
  {
    name: "blockstream",
    url: (addr) => `https://blockstream.info/api/address/${addr}`,
    parse: (d) =>
      (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8
  },
  {
    name: "mempool",
    url: (addr) => `https://mempool.space/api/address/${addr}`,
    parse: (d) =>
      (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8
  },
  {
    name: "blockcypher",
    url: (addr) =>
      `https://api.blockcypher.com/v1/btc/main/addrs/${addr}/balance`,
    parse: (d) => d.balance / 1e8
  }
];

let btcIndex = 0;

// Fetch token balances from your token module
async function fetchTokenBalances(address, blockchain) {
  const res = await fetch("https://your-domain.com/getTokenBalances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, blockchain })
  });

  const data = await res.json();
  return data.tokens || [];
}

// Fetch prices from your price module
async function fetchPrices(symbols) {
  const res = await fetch("https://your-domain.com/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols })
  });

  const data = await res.json();
  return data.prices || {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all imported wallets
    const wallets = await base44.entities.ImportedWallet.filter({
      user_id: user.id,
      is_active: true
    });

    if (wallets.length === 0) {
      return Response.json({
        total_balance_usd: 0,
        wallets: [],
        message: "No wallets imported yet"
      });
    }

    const portfolio = [];

    for (const wallet of wallets) {
      let nativeBalance = 0;
      let symbol = NATIVE_TOKENS[wallet.blockchain]?.symbol || "UNKNOWN";

      // EVM native balance
      if (wallet.blockchain in EVM_RPC) {
        try {
          const rpc = EVM_RPC[wallet.blockchain];
          const response = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_getBalance",
              params: [wallet.address, "latest"]
            })
          });

          const data = await response.json();
          nativeBalance = Number(BigInt(data.result)) / 1e18;
        } catch {
          nativeBalance = wallet.cached_balance || 0;
        }
      }

      // Solana native balance
      else if (wallet.blockchain === "solana") {
        try {
          const response = await fetch("https://api.mainnet-beta.solana.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getBalance",
              params: [wallet.address]
            })
          });

          const data = await response.json();
          nativeBalance = data.result.value / 1e9;
        } catch {
          nativeBalance = wallet.cached_balance || 0;
        }
      }

      // Tron native balance
      else if (wallet.blockchain === "tron") {
        try {
          const response = await fetch(
            `https://apilist.tronscan.org/api/account?address=${wallet.address}`
          );
          const data = await response.json();
          nativeBalance = data.balance / 1e6;
        } catch {
          nativeBalance = wallet.cached_balance || 0;
        }
      }

      // Bitcoin native balance
      else if (wallet.blockchain === "bitcoin") {
        let success = false;

        for (let i = 0; i < BTC_APIS.length && !success; i++) {
          const api = BTC_APIS[btcIndex];
          btcIndex = (btcIndex + 1) % BTC_APIS.length;

          try {
            const response = await fetch(api.url(wallet.address), {
              signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
              const data = await response.json();
              nativeBalance = api.parse(data);
              success = true;
            }
          } catch {}
        }

        if (!success) {
          nativeBalance = wallet.cached_balance || 0;
        }
      }

      // Update cached balance
      if (wallet.cached_balance !== nativeBalance) {
        await base44.asServiceRole.entities.ImportedWallet.update(wallet.id, {
          cached_balance: nativeBalance,
          last_balance_check: new Date().toISOString()
        });
      }

      // Fetch token balances
      const tokens = await fetchTokenBalances(wallet.address, wallet.blockchain);

      // Collect all symbols for price lookup
      const symbols = [
        symbol,
        ...tokens.map((t) => t.symbol)
      ];

      const prices = await fetchPrices(symbols);

      const nativeUsd = nativeBalance * (prices[symbol] || 0);

      portfolio.push({
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        native: {
          symbol,
          balance: nativeBalance,
          price: prices[symbol] || 0,
          usd_value: nativeUsd
        },
        tokens,
        total_usd: nativeUsd + tokens.reduce((s, t) => s + t.usd_value, 0)
      });
    }

    const total = portfolio.reduce((s, w) => s + w.total_usd, 0);

    return Response.json({
      total_balance_usd: total,
      wallets: portfolio,
      checked_at: new Date().toISOString()
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
