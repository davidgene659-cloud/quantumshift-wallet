import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const ALCHEMY_KEY = Deno.env.get("ALCHEMY_KEY") || "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EVM_RPC = {
  ethereum:  { rpc: "https://cloudflare-eth.com", symbol: "ETH",  price: 2280 },
  polygon:   { rpc: "https://polygon-rpc.com",    symbol: "MATIC", price: 0.8 },
  bsc:       { rpc: "https://bsc-dataseed.binance.org", symbol: "BNB", price: 310 },
  avalanche: { rpc: "https://api.avax.network/ext/bc/C/rpc", symbol: "AVAX", price: 35 },
  arbitrum:  { rpc: "https://arb1.arbitrum.io/rpc", symbol: "ETH", price: 2280 },
  optimism:  { rpc: "https://mainnet.optimism.io", symbol: "ETH", price: 2280 },
};

const ALCHEMY_BASE = {
  ethereum: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

const BTC_APIS = [
  {
    name: "blockstream",
    url: (a) => `https://blockstream.info/api/address/${a}`,
    parse: (d) =>
      (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8,
  },
  {
    name: "mempool",
    url: (a) => `https://mempool.space/api/address/${a}`,
    parse: (d) =>
      (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8,
  },
  {
    name: "blockcypher",
    url: (a) =>
      `https://api.blockcypher.com/v1/btc/main/addrs/${a}/balance`,
    parse: (d) => d.balance / 1e8,
  },
];

let btcIndex = 0;

const hexToBigInt = (hex) => BigInt(hex || "0x0");

const inferPrice = (symbol, nativePrice) => {
  const s = symbol.toUpperCase();
  if (["USDC", "USDT", "DAI", "BUSD"].includes(s)) return 1;
  if (["WETH", "WSTETH"].includes(s)) return nativePrice;
  return 0;
};

const shouldUpdateCached = (oldBal, newBal) =>
  oldBal === null || oldBal === undefined || oldBal !== newBal;

const tokenMetaCache = new Map();
const getMeta = (chain, addr) =>
  tokenMetaCache.get(`${chain}:${addr.toLowerCase()}`);
const setMeta = (chain, addr, meta) =>
  tokenMetaCache.set(`${chain}:${addr.toLowerCase()}`, meta);

async function fetchNative(wallet, index, total) {
  const out = [];
  let nativeBalance = 0;
  let nativePrice = 0;

  if (wallet.blockchain in EVM_RPC) {
    const cfg = EVM_RPC[wallet.blockchain];

    const res = await fetch(cfg.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [wallet.address, "latest"],
      }),
    });

    const data = await res.json();
    nativeBalance = Number(hexToBigInt(data.result)) / 1e18;
    nativePrice = cfg.price;

    if (nativeBalance > 0) {
      out.push({
        ...wallet,
        asset_type: "native",
        asset_symbol: cfg.symbol,
        balance: nativeBalance,
        price: nativePrice,
        usd_value: nativeBalance * nativePrice,
      });
    }

    return { out, nativeBalance, nativePrice };
  }

  if (wallet.blockchain === "solana") {
    const res = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet.address],
      }),
    });

    const data = await res.json();
    nativeBalance = (data.result?.value || 0) / 1e9;
    nativePrice = 130;

    if (nativeBalance > 0) {
      out.push({
        ...wallet,
        asset_type: "native",
        asset_symbol: "SOL",
        balance: nativeBalance,
        price: nativePrice,
        usd_value: nativeBalance * nativePrice,
      });
    }

    return { out, nativeBalance, nativePrice };
  }

  if (wallet.blockchain === "tron") {
    const res = await fetch(
      `https://apilist.tronscan.org/api/account?address=${wallet.address}`,
    );
    const data = await res.json();
    nativeBalance = (data.balance || 0) / 1e6;
    nativePrice = 0.12;

    if (nativeBalance > 0) {
      out.push({
        ...wallet,
        asset_type: "native",
        asset_symbol: "TRX",
        balance: nativeBalance,
        price: nativePrice,
        usd_value: nativeBalance * nativePrice,
      });
    }

    return { out, nativeBalance, nativePrice };
  }

  if (wallet.blockchain === "bitcoin") {
    let bal = 0;
    let ok = false;

    for (let i = 0; i < BTC_APIS.length && !ok; i++) {
      const api = BTC_APIS[btcIndex];
      btcIndex = (btcIndex + 1) % BTC_APIS.length;

      try {
        const res = await fetch(api.url(wallet.address), {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          bal = api.parse(data);
          ok = true;
        }
      } catch {}
    }

    if (!ok) bal = wallet.cached_balance || 0;

    nativeBalance = bal;
    nativePrice = 43250;

    if (nativeBalance > 0) {
      out.push({
        ...wallet,
        asset_type: "native",
        asset_symbol: "BTC",
        balance: nativeBalance,
        price: nativePrice,
        usd_value: nativeBalance * nativePrice,
      });
    }

    if (index < total - 1) await sleep(100);

    return { out, nativeBalance, nativePrice };
  }

  return { out, nativeBalance, nativePrice };
}

async function fetchEvmTokens(wallet, nativePrice) {
  const chain = wallet.blockchain;
  const base = ALCHEMY_BASE[chain];
  if (!base) return [];

  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenBalances",
      params: [wallet.address],
    }),
  });

  const data = await res.json();
  const balances = data?.result?.tokenBalances || [];
  if (!balances.length) return [];

  const tasks = balances.map(async (tb) => {
    if (!tb.tokenBalance || tb.tokenBalance === "0x0") return null;

    const contract = tb.contractAddress;
    let meta = getMeta(chain, contract);

    if (!meta) {
      const mRes = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getTokenMetadata",
          params: [contract],
        }),
      });

      const mData = await mRes.json();
      meta = {
        symbol: mData?.result?.symbol || "UNKNOWN",
        decimals:
          typeof mData?.result?.decimals === "number"
            ? mData.result.decimals
            : 18,
      };

      setMeta(chain, contract, meta);
    }

    const raw = hexToBigInt(tb.tokenBalance);
    const balance = Number(raw) / Math.pow(10, meta.decimals);
    if (balance <= 0) return null;

    const price = inferPrice(meta.symbol, nativePrice);

    return {
      ...wallet,
      asset_type: "token",
      asset_symbol: meta.symbol,
      token_address: contract,
      balance,
      price,
      usd_value: balance * price,
    };
  });

  const results = await Promise.all(tasks);
  return results.filter(Boolean);
}

async function fetchSolanaTokens(wallet) {
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getParsedTokenAccountsByOwner",
      params: [
        wallet.address,
        { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
        { encoding: "jsonParsed" },
      ],
    }),
  });

  const data = await res.json();
  const value = data?.result?.value || [];
  const out = [];

  for (const acc of value) {
    const info = acc?.account?.data?.parsed?.info;
    const amt = info?.tokenAmount;
    if (!amt) continue;

    const bal = amt.uiAmount || 0;
    if (bal <= 0) continue;

    out.push({
      ...wallet,
      asset_type: "token",
      asset_symbol: "SPL",
      token_address: info.mint,
      balance: bal,
      price: 0,
      usd_value: 0,
    });
  }

  return out;
}

async function fetchTronTokens(wallet) {
  const res = await fetch(
    `https://apilist.tronscan.org/api/token_trc20?address=${wallet.address}`,
  );
  const data = await res.json();
  const tokens = data?.trc20_tokens || [];
  const out = [];

  for (const t of tokens) {
    const raw = Number(t.balance || 0);
    const dec = Number(t.tokenDecimal || 0);
    if (!raw || dec < 0) continue;

    const bal = raw / Math.pow(10, dec);
    if (bal <= 0) continue;

    const symbol = t.tokenAbbr || "TRC20";
    const price = inferPrice(symbol, 0);

    out.push({
      ...wallet,
      asset_type: "token",
      asset_symbol: symbol,
      token_address: t.contract_address || t.tokenId || "",
      balance: bal,
      price,
      usd_value: bal * price,
    });
  }

  return out;
}

const aggregateAssets = (entries) => {
  const out = {};
  for (const e of entries) {
    const sym = e.asset_symbol.toUpperCase();
    if (!out[sym]) out[sym] = { total: 0, usd_value: 0 };
    out[sym].total += e.balance;
    out[sym].usd_value += e.usd_value;
  }
  return out;
};

const aggregateTotalUsd = (entries) =>
  entries.reduce((s, e) => s + e.usd_value, 0);

const buildAssetWalletIndex = (entries) => {
  const index = {};
  for (const e of entries) {
    const sym = e.asset_symbol.toUpperCase();
    if (!index[sym]) index[sym] = [];
    index[sym].push({
      wallet_id: e.id,
      address: e.address,
      blockchain: e.blockchain,
      label: e.label,
      asset_type: e.asset_type,
      token_address: e.token_address || null,
      balance: e.balance,
      usd_value: e.usd_value,
    });
  }
  return index;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const wallets = await base44.entities.ImportedWallet.filter({
      user_id: user.id,
      is_active: true,
    });

    if (!wallets.length) {
      return Response.json({
        total_balance_usd: 0,
        wallets: [],
        assets: {},
        asset_wallets: {},
        message: "No wallets imported yet",
      });
    }

    const all = [];

    for (let i = 0; i < wallets.length; i++) {
      const w = wallets[i];
      const wallet = {
        id: w.id,
        address: w.address,
        blockchain: w.blockchain,
        label: w.label ?? null,
        cached_balance: w.cached_balance ?? null,
      };

      try {
        const { out: nativeEntries, nativeBalance, nativePrice } =
          await fetchNative(wallet, i, wallets.length);

        let tokenEntries = [];

        if (wallet.blockchain in ALCHEMY_BASE) {
          tokenEntries = await fetchEvmTokens(wallet, nativePrice);
        } else if (wallet.blockchain === "solana") {
          tokenEntries = await fetchSolanaTokens(wallet);
        } else if (wallet.blockchain === "tron") {
          tokenEntries = await fetchTronTokens(wallet);
        }

        if (shouldUpdateCached(wallet.cached_balance, nativeBalance)) {
          await base44.asServiceRole.entities.ImportedWallet.update(wallet.id, {
            cached_balance: nativeBalance,
            last_balance_check: new Date().toISOString(),
          });
        }

        if (!nativeEntries.length && !tokenEntries.length) {
          all.push({
            ...wallet,
            asset_type: "native_cached",
            asset_symbol: wallet.blockchain.toUpperCase(),
            balance: wallet.cached_balance || 0,
            price: 0,
            usd_value: 0,
          });
        } else {
          all.push(...nativeEntries, ...tokenEntries);
        }
      } catch {
        all.push({
          id: w.id,
          address: w.address,
          blockchain: w.blockchain,
          label: w.label ?? null,
          asset_type: "error_cached",
          asset_symbol: w.blockchain.toUpperCase(),
          balance: w.cached_balance || 0,
          price: 0,
          usd_value: 0,
        });
      }
    }

    const total_balance_usd = aggregateTotalUsd(all);
    const assets = aggregateAssets(all);
    const asset_wallets = buildAssetWalletIndex(all);

    return Response.json({
      total_balance_usd,
      assets,
      asset_wallets,
      wallets: all,
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});

