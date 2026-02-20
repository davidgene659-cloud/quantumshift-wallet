export const action = async (input = {}) => {
  const { btc = [], eth = [], bnb = [], secrets = {} } = input;
  const ALCHEMY_KEY = secrets.Alchamy_Key;

  if (!ALCHEMY_KEY) {
    throw new Error("Missing secret: Alchamy_Key");
  }

  // RPC endpoints
  const ETH_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
  const BNB_RPC = "https://bsc-dataseed.binance.org";
  const ALCHEMY_PRICE_URL = `https://api.g.alchemy.com/prices/v1/${ALCHEMY_KEY}`;
  const COINGECKO_URL =
    "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=bitcoin,ethereum,binancecoin,usd-coin,wrapped-ether";

  // Token config
  const TOKENS = {
    USDC: {
      symbol: "USDC",
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
    },
    WETH: {
      symbol: "WETH",
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
    },
  };

  // Utility helpers
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const fetchJson = async (url, opts = {}, retries = 3) => {
    let last;
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        last = e;
        await sleep(200 * (i + 1));
      }
    }
    throw last;
  };

  const hexToBigInt = (hex) => BigInt(hex || "0x0");
  const formatUnits = (value, decimals) => {
    const neg = value < 0n;
    const v = neg ? -value : value;
    const base = 10n ** BigInt(decimals);
    const int = v / base;
    const frac = v % base;
    const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
    return (neg ? "-" : "") + int.toString() + (fracStr ? "." + fracStr : "");
  };

  const encodeBalanceOf = (addr) => {
    const selector = "70a08231";
    const clean = addr.toLowerCase().replace("0x", "");
    return "0x" + selector + clean.padStart(64, "0");
  };

  // Price system (Alchemy primary → Coingecko fallback)
  const getPrices = async () => {
    const out = {};

    try {
      const body = {
        tokens: [
          { symbol: "BTC" },
          { symbol: "ETH" },
          { symbol: "BNB" },
          { symbol: "USDC" },
          { symbol: "WETH" },
        ],
      };

      const res = await fetch(ALCHEMY_PRICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.prices) {
          for (const p of data.prices) {
            if (p.symbol && p.price) {
              out[p.symbol.toUpperCase()] = Number(p.price);
            }
          }
        }
      }
    } catch (_) {}

    const missing = ["BTC", "ETH", "BNB", "USDC", "WETH"].filter(
      (s) => out[s] == null
    );

    if (missing.length > 0) {
      const cg = await fetchJson(COINGECKO_URL);
      if (cg.bitcoin) out.BTC = cg.bitcoin.usd;
      if (cg.ethereum) out.ETH = cg.ethereum.usd;
      if (cg.binancecoin) out.BNB = cg.binancecoin.usd;
      if (cg["usd-coin"]) out.USDC = cg["usd-coin"].usd;
      if (cg["wrapped-ether"]) out.WETH = cg["wrapped-ether"].usd;
    }

    return out;
  };

  // Bitcoin providers
  const btc_blockstream = async (addr) => {
    const d = await fetchJson(`https://blockstream.info/api/address/${addr}`);
    const funded = BigInt(d.chain_stats.funded_txo_sum || 0);
    const spent = BigInt(d.chain_stats.spent_txo_sum || 0);
    const mf = BigInt(d.mempool_stats?.funded_txo_sum || 0);
    const ms = BigInt(d.mempool_stats?.spent_txo_sum || 0);
    return funded - spent + (mf - ms);
  };

  const btc_mempool = async (addr) => {
    const d = await fetchJson(`https://mempool.space/api/address/${addr}`);
    const funded = BigInt(d.chain_stats.funded_txo_sum || 0);
    const spent = BigInt(d.chain_stats.spent_txo_sum || 0);
    const mf = BigInt(d.mempool_stats?.funded_txo_sum || 0);
    const ms = BigInt(d.mempool_stats?.spent_txo_sum || 0);
    return funded - spent + (mf - ms);
  };

  const btc_blockchair = async (addr) => {
    const d = await fetchJson(
      `https://api.blockchair.com/bitcoin/dashboards/address/${addr}`
    );
    return BigInt(d.data[addr].address.balance || 0);
  };

  const getBtcBalance = async (addr) => {
    const providers = [btc_mempool, btc_blockstream, btc_blockchair];
    let last;
    for (const p of providers) {
      try {
        return await p(addr);
      } catch (e) {
        last = e;
      }
    }
    throw last;
  };

  const getBitcoin = async (addresses, prices) => {
    const out = [];
    let total = 0;

    for (const a of addresses) {
      try {
        const sats = await getBtcBalance(a);
        const btc = Number(sats) / 1e8;
        const usd = btc * (prices.BTC || 0);
        total += usd;
        out.push({ address: a, sats: sats.toString(), btc, usd });
      } catch (e) {
        out.push({ address: a, error: e.message });
      }
    }

    return { addresses: out, totalUsd: total };
  };

  // RPC helpers
  const rpc = async (url, method, params) => {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  };

  const getNative = async (rpcUrl, addr) =>
    hexToBigInt(await rpc(rpcUrl, "eth_getBalance", [addr, "latest"]));

  const getToken = async (rpcUrl, token, holder) => {
    const data = encodeBalanceOf(holder);
    return hexToBigInt(
      await rpc(rpcUrl, "eth_call", [{ to: token.address, data }, "latest"])
    );
  };

  const getEthereum = async (addresses, prices) => {
    const out = [];
    let total = 0;

    for (const a of addresses) {
      const entry = { address: a, native: null, tokens: [], totalUsd: 0 };

      try {
        const ethBal = await getNative(ETH_RPC, a);
        const ethFmt = formatUnits(ethBal, 18);
        const ethUsd = Number(ethFmt) * (prices.ETH || 0);
        entry.native = {
          symbol: "ETH",
          raw: ethBal.toString(),
          formatted: ethFmt,
          usd: ethUsd,
        };
        entry.totalUsd += ethUsd;

        for (const key in TOKENS) {
          const t = TOKENS[key];
          try {
            const bal = await getToken(ETH_RPC, t, a);
            const fmt = formatUnits(bal, t.decimals);
            const usd = Number(fmt) * (prices[t.symbol] || 0);
            entry.tokens.push({
              symbol: t.symbol,
              raw: bal.toString(),
              formatted: fmt,
              usd,
            });
            entry.totalUsd += usd;
          } catch (e) {
            entry.tokens.push({ symbol: t.symbol, error: e.message });
          }
        }

        total += entry.totalUsd;
        out.push(entry);
      } catch (e) {
        out.push({ address: a, error: e.message });
      }
    }

    return { addresses: out, totalUsd: total };
  };

  const getBNB = async (addresses, prices) => {
    const out = [];
    let total = 0;

    for (const a of addresses) {
      try {
        const bal = await getNative(BNB_RPC, a);
        const fmt = formatUnits(bal, 18);
        const usd = Number(fmt) * (prices.BNB || 0);
        total += usd;
        out.push({
          address: a,
          native: {
            symbol: "BNB",
            raw: bal.toString(),
            formatted: fmt,
            usd,
          },
          totalUsd: usd,
        });
      } catch (e) {
        out.push({ address: a, error: e.message });
      }
    }

    return { addresses: out, totalUsd: total };
  };

  // Execute
  const prices = await getPrices();

  const [btcRes, ethRes, bnbRes] = await Promise.all([
    btc.length ? getBitcoin(btc, prices) : { addresses: [], totalUsd: 0 },
    eth.length ? getEthereum(eth, prices) : { addresses: [], totalUsd: 0 },
    bnb.length ? getBNB(bnb, prices) : { addresses: [], totalUsd: 0 },
  ]);

  const totalUsd = btcRes.totalUsd + ethRes.totalUsd + bnbRes.totalUsd;

  return {
    summary: {
      totalUsd,
      byChain: {
        BTC: btcRes.totalUsd,
        ETH: ethRes.totalUsd,
        BNB: bnbRes.totalUsd,
      },
      prices,
    },
    detail: {
      bitcoin: btcRes.addresses,
      ethereum: ethRes.addresses,
      bnb: bnbRes.addresses,
    },
  };
};
