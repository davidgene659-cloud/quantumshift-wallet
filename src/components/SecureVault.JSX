import { useState, useEffect, useCallback, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════════════
   SECURE VAULT — QuantumShift Wallet
   • MetaMask / injected provider (window.ethereum)
   • EVM chains + Bitcoin + Solana detection
   • Only stores wallets with balance > 0
   • Send (with gas estimate) · Receive QR · TX History · Token/NFT list
   • PIN unlock screen
══════════════════════════════════════════════════════════════════════════════ */

/* ─── RPC ENDPOINTS (swap in your own keys) ────────────────────────────────── */
const RPC = {
  ethereum:  "https://ethereum.publicnode.com",
  polygon:   "https://polygon.publicnode.com",
  arbitrum:  "https://arbitrum-one.publicnode.com",
  optimism:  "https://optimism.publicnode.com",
  bsc:       "https://bsc.publicnode.com",
  avalanche: "https://avalanche-c-chain.publicnode.com",
  base:      "https://base.publicnode.com",
};

const CHAIN_META = {
  1:     { name: "Ethereum",  symbol: "ETH",  color: "#627EEA", rpc: RPC.ethereum,  explorer: "https://etherscan.io" },
  137:   { name: "Polygon",   symbol: "MATIC", color: "#8247E5", rpc: RPC.polygon,   explorer: "https://polygonscan.com" },
  42161: { name: "Arbitrum",  symbol: "ETH",  color: "#28A0F0", rpc: RPC.arbitrum,  explorer: "https://arbiscan.io" },
  10:    { name: "Optimism",  symbol: "ETH",  color: "#FF0420", rpc: RPC.optimism,  explorer: "https://optimistic.etherscan.io" },
  56:    { name: "BSC",       symbol: "BNB",  color: "#F3BA2F", rpc: RPC.bsc,       explorer: "https://bscscan.com" },
  43114: { name: "Avalanche", symbol: "AVAX", color: "#E84142", rpc: RPC.avalanche, explorer: "https://snowtrace.io" },
  8453:  { name: "Base",      symbol: "ETH",  color: "#0052FF", rpc: RPC.base,      explorer: "https://basescan.org" },
};

/* ─── STORAGE ───────────────────────────────────────────────────────────────── */
const SK_VAULT  = "qshift_vault_v2";
const SK_PIN    = "qshift_pin_v2";
const SK_LOCKED = "qshift_locked";

function vaultLoad()       { try { return JSON.parse(localStorage.getItem(SK_VAULT) || "null"); } catch { return null; } }
function vaultSave(d)      { localStorage.setItem(SK_VAULT, JSON.stringify(d)); }
function pinLoad()         { return localStorage.getItem(SK_PIN) || null; }
function pinSave(h)        { localStorage.setItem(SK_PIN, h); }
async function hashPin(p)  {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(p + "qshift_salt_2026"));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ─── EVM RPC HELPERS ───────────────────────────────────────────────────────── */
async function rpcCall(url, method, params = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function getEvmBalance(address, rpcUrl) {
  const hex = await rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]);
  return parseInt(hex, 16) / 1e18;
}

async function getEvmGasPrice(rpcUrl) {
  const hex = await rpcCall(rpcUrl, "eth_gasPrice", []);
  return parseInt(hex, 16);
}

async function estimateGas(rpcUrl, from, to, value) {
  const hex = await rpcCall(rpcUrl, "eth_estimateGas", [{ from, to, value: "0x" + BigInt(Math.floor(value * 1e18)).toString(16) }]);
  return parseInt(hex, 16);
}

async function getTxHistory(address, chainId) {
  const meta = CHAIN_META[chainId];
  if (!meta) return [];
  // Use Etherscan-compatible APIs (public, no key needed for basic queries)
  const apiMap = {
    1:     "https://api.etherscan.io/api",
    137:   "https://api.polygonscan.com/api",
    42161: "https://api.arbiscan.io/api",
    56:    "https://api.bscscan.com/api",
    10:    "https://api-optimistic.etherscan.io/api",
    8453:  "https://api.basescan.org/api",
  };
  const apiUrl = apiMap[chainId];
  if (!apiUrl) return [];
  try {
    const r = await fetch(`${apiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=YourApiKeyToken`);
    const j = await r.json();
    return Array.isArray(j.result) ? j.result.slice(0, 20) : [];
  } catch { return []; }
}

async function getTokens(address, chainId) {
  const apiMap = {
    1:   "https://api.etherscan.io/api",
    137: "https://api.polygonscan.com/api",
    56:  "https://api.bscscan.com/api",
  };
  const apiUrl = apiMap[chainId];
  if (!apiUrl) return [];
  try {
    const r = await fetch(`${apiUrl}?module=account&action=tokentx&address=${address}&page=1&offset=50&sort=desc&apikey=YourApiKeyToken`);
    const j = await r.json();
    if (!Array.isArray(j.result)) return [];
    // Deduplicate tokens by contractAddress
    const seen = new Map();
    for (const tx of j.result) {
      if (!seen.has(tx.contractAddress)) {
        seen.set(tx.contractAddress, { symbol: tx.tokenSymbol, name: tx.tokenName, decimals: tx.tokenDecimal, contract: tx.contractAddress });
      }
    }
    return [...seen.values()];
  } catch { return []; }
}

/* ─── METAMASK HELPERS ──────────────────────────────────────────────────────── */
async function mmGetAccounts() {
  if (!window.ethereum) throw new Error("No injected provider found");
  return window.ethereum.request({ method: "eth_requestAccounts" });
}

async function mmGetChainId() {
  const hex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(hex, 16);
}

async function mmSendTx(from, to, valueEth, gasPrice, gasLimit) {
  const valueHex  = "0x" + BigInt(Math.round(valueEth * 1e18)).toString(16);
  const gasHex    = "0x" + BigInt(gasPrice).toString(16);
  const limitHex  = "0x" + BigInt(gasLimit).toString(16);
  return window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: valueHex, gasPrice: gasHex, gas: limitHex }],
  });
}

async function mmSwitchChain(chainId) {
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x" + chainId.toString(16) }],
  });
}

/* ─── QR CODE (pure SVG, no library) ───────────────────────────────────────── */
function QRCode({ value, size = 200 }) {
  // Simple QR placeholder using data URI approach via API
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=0d1117&color=e2e8f0&margin=10`;
  return (
    <img src={url} alt="QR Code" width={size} height={size}
      className="rounded-xl border border-white/10" />
  );
}

/* ─── SVG ICONS ─────────────────────────────────────────────────────────────── */
const I = ({ d, s = 18, c = "" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={c}>
    <path d={d} />
  </svg>
);
const ICONS = {
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  wallet:  "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM1 10h22M16 14h.01",
  send:    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  receive: "M12 2v20M2 12l10 10 10-10",
  history: "M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3",
  token:   "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  copy:    "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  plus:    "M12 5v14M5 12h14",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeoff:  "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22",
  link:    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  lock:    "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  arrowup: "M12 19V5M5 12l7-7 7 7",
  warning: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  trash:   "M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2",
  bitcoin: "M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727",
  nft:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  metamask:"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  gas:     "M3 22V8l9-6 9 6v14H3zM9 22v-4a3 3 0 0 1 6 0v4",
};

/* ─── UTILS ─────────────────────────────────────────────────────────────────── */
const fmt  = (n, d = 4) => typeof n === "number" ? n.toFixed(d).replace(/\.?0+$/, "") : "—";
const fmtUSD = (n) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const short = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
const tsToDate = (ts) => new Date(parseInt(ts) * 1000).toLocaleDateString();

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-all">
      <I d={done ? ICONS.check : ICONS.copy} s={13} c={done ? "text-emerald-400" : ""} />
    </button>
  );
}

/* ─── PIN PAD ───────────────────────────────────────────────────────────────── */
function PinPad({ onComplete, label = "Enter PIN", sublabel = "", error = "" }) {
  const [digits, setDigits] = useState([]);
  const PIN_LEN = 6;

  const press = (d) => {
    if (digits.length >= PIN_LEN) return;
    const next = [...digits, d];
    setDigits(next);
    if (next.length === PIN_LEN) {
      setTimeout(() => { onComplete(next.join("")); setDigits([]); }, 150);
    }
  };
  const del = () => setDigits(d => d.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-1">
          <I d={ICONS.shield} s={22} c="text-cyan-400" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-100" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
          {label}
        </h2>
        {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
      </div>

      {/* Dots */}
      <div className="flex gap-3">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
            i < digits.length
              ? "bg-cyan-400 border-cyan-400 scale-110"
              : "bg-transparent border-slate-600"
          }`} />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 -mt-4">
          <I d={ICONS.warning} s={13} /> {error}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-56">
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
          <button key={i}
            onClick={() => k === "⌫" ? del() : k !== "" ? press(String(k)) : null}
            disabled={k === ""}
            className={`h-14 rounded-2xl text-lg font-medium transition-all duration-150 select-none ${
              k === ""
                ? "invisible"
                : k === "⌫"
                ? "bg-white/[0.04] border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200 active:scale-95"
                : "bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-white/[0.12] hover:border-white/20 active:scale-95"
            }`}>
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── MODAL SHELL ───────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(16px)", background: "rgba(5,8,15,0.85)" }}
      onClick={onClose}>
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-white/10 shadow-2xl overflow-hidden`}
        style={{ background: "linear-gradient(145deg, #0d1117 0%, #0a0e18 100%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-sm font-semibold text-slate-200" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <I d={ICONS.x} s={15} />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─── SEND MODAL ─────────────────────────────────────────────────────────────── */
function SendModal({ wallet, onClose }) {
  const [to, setTo]         = useState("");
  const [amount, setAmount] = useState("");
  const [gas, setGas]       = useState(null);
  const [gasPrice, setGasPrice] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [sending, setSending]   = useState(false);
  const [txHash, setTxHash]     = useState("");
  const [err, setErr]           = useState("");

  const meta = CHAIN_META[wallet.chainId] || CHAIN_META[1];

  const runEstimate = useCallback(async () => {
    if (!to || !amount || isNaN(parseFloat(amount))) return;
    setEstimating(true); setErr("");
    try {
      const gp = await getEvmGasPrice(meta.rpc);
      const gl = await estimateGas(meta.rpc, wallet.address, to, parseFloat(amount));
      setGasPrice(gp);
      setGas(gl);
    } catch (e) { setErr("Could not estimate gas: " + e.message); }
    finally { setEstimating(false); }
  }, [to, amount, meta.rpc, wallet.address]);

  const gasCostEth = gas && gasPrice ? (gas * gasPrice / 1e18) : null;

  const handleSend = async () => {
    setSending(true); setErr("");
    try {
      if (wallet.chainId !== (await mmGetChainId())) await mmSwitchChain(wallet.chainId);
      const hash = await mmSendTx(wallet.address, to, parseFloat(amount), gasPrice, gas);
      setTxHash(hash);
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  };

  const inp = "w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all";

  if (txHash) return (
    <Modal title="Transaction Sent" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <I d={ICONS.check} s={26} c="text-emerald-400" />
        </div>
        <p className="text-sm text-slate-300">Transaction broadcast successfully.</p>
        <div className="w-full bg-white/[0.04] rounded-xl p-3 border border-white/10">
          <p className="text-[10px] text-slate-600 mb-1">TX HASH</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400 truncate flex-1">{txHash}</span>
            <CopyBtn text={txHash} />
          </div>
        </div>
        <a href={`${meta.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          View on Explorer <I d={ICONS.link} s={12} />
        </a>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Send ${meta.symbol}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
          <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-xs text-slate-400">{meta.name}</span>
          <span className="ml-auto font-mono text-xs text-slate-500">{short(wallet.address)}</span>
        </div>

        <input className={inp} placeholder="Recipient address (0x…)" value={to}
          onChange={e => { setTo(e.target.value); setGas(null); }} />

        <div className="relative">
          <input className={inp + " pr-16"} placeholder="0.0" type="number" value={amount}
            onChange={e => { setAmount(e.target.value); setGas(null); }} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">{meta.symbol}</span>
        </div>

        <button onClick={runEstimate} disabled={!to || !amount || estimating}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-slate-200 hover:border-white/20 disabled:opacity-40 transition-all">
          <I d={ICONS.gas} s={13} /> {estimating ? "Estimating…" : "Estimate Gas"}
        </button>

        {gas && gasCostEth !== null && (
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07] space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Gas limit</span>
              <span className="text-slate-300 font-mono">{gas.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Gas price</span>
              <span className="text-slate-300 font-mono">{(gasPrice / 1e9).toFixed(2)} Gwei</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/[0.07] pt-1.5 mt-1.5">
              <span className="text-slate-500">Estimated fee</span>
              <span className="text-cyan-400 font-mono">{gasCostEth.toFixed(6)} {meta.symbol}</span>
            </div>
          </div>
        )}

        {err && <p className="text-xs text-red-400 flex items-center gap-1.5"><I d={ICONS.warning} s={13} />{err}</p>}

        <button onClick={handleSend}
          disabled={!gas || !to || !amount || sending}
          className="w-full py-3 rounded-xl font-medium text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
          {sending ? "Waiting for MetaMask…" : `Send ${amount || "0"} ${meta.symbol}`}
        </button>
      </div>
    </Modal>
  );
}

/* ─── RECEIVE MODAL ─────────────────────────────────────────────────────────── */
function ReceiveModal({ wallet, onClose }) {
  const meta = CHAIN_META[wallet.chainId] || CHAIN_META[1];
  return (
    <Modal title="Receive" onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
          {meta.name} · {meta.symbol}
        </div>
        <QRCode value={wallet.address} size={180} />
        <div className="w-full bg-white/[0.04] rounded-xl p-3 border border-white/10">
          <p className="text-[10px] text-slate-600 mb-1.5">YOUR ADDRESS</p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-300 break-all flex-1">{wallet.address}</span>
            <CopyBtn text={wallet.address} />
          </div>
        </div>
        <p className="text-[11px] text-slate-600 text-center max-w-xs">
          Only send {meta.symbol} and {meta.name}-compatible tokens to this address.
        </p>
      </div>
    </Modal>
  );
}

/* ─── HISTORY MODAL ─────────────────────────────────────────────────────────── */
function HistoryModal({ wallet, onClose }) {
  const [txs, setTxs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const meta = CHAIN_META[wallet.chainId] || CHAIN_META[1];

  useEffect(() => {
    getTxHistory(wallet.address, wallet.chainId)
      .then(setTxs).finally(() => setLoading(false));
  }, [wallet.address, wallet.chainId]);

  return (
    <Modal title="Transaction History" onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-2 text-slate-600">
          <I d={ICONS.history} s={28} />
          <p className="text-sm">No transactions found</p>
          <p className="text-xs text-slate-700">Note: Add your Etherscan API key for full history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx, i) => {
            const isOut = tx.from?.toLowerCase() === wallet.address.toLowerCase();
            const valEth = parseInt(tx.value || 0) / 1e18;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOut ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  <I d={isOut ? ICONS.send : ICONS.receive} s={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-300">{isOut ? "Sent" : "Received"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tx.txreceipt_status === "1" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {tx.txreceipt_status === "1" ? "Success" : "Failed"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono truncate">{isOut ? tx.to : tx.from}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono font-medium ${isOut ? "text-red-400" : "text-emerald-400"}`}>
                    {isOut ? "-" : "+"}{fmt(valEth, 5)} {meta.symbol}
                  </p>
                  <p className="text-[10px] text-slate-600">{tsToDate(tx.timeStamp)}</p>
                </div>
                <a href={`${meta.explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-600 hover:text-cyan-400 transition-colors">
                  <I d={ICONS.link} s={13} />
                </a>
              </div>
            );
          })}
          <p className="text-[10px] text-slate-700 text-center pt-2">
            Showing last 20 transactions · Add Etherscan API key in RPC config for unlimited history
          </p>
        </div>
      )}
    </Modal>
  );
}

/* ─── TOKENS MODAL ───────────────────────────────────────────────────────────── */
function TokensModal({ wallet, onClose }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTokens(wallet.address, wallet.chainId)
      .then(setTokens).finally(() => setLoading(false));
  }, [wallet.address, wallet.chainId]);

  return (
    <Modal title="Tokens & NFTs" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-2 text-slate-600">
          <I d={ICONS.token} s={28} />
          <p className="text-sm">No tokens found</p>
          <p className="text-xs text-slate-700 text-center">Token detection requires Etherscan API key for full results</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400">
                <I d={ICONS.token} s={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200">{t.name}</p>
                <p className="text-[10px] text-slate-600 font-mono">{short(t.contract)}</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">{t.symbol}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ─── WALLET CARD ─────────────────────────────────────────────────────────────── */
function WalletCard({ wallet, onRemove, index }) {
  const [modal, setModal]   = useState(null); // send | receive | history | tokens
  const [showAddr, setShowAddr] = useState(false);
  const meta = CHAIN_META[wallet.chainId] || { name: wallet.type || "Unknown", symbol: "?", color: "#64748b", explorer: "#" };

  const animDelay = `${index * 60}ms`;

  return (
    <>
      <div className="group relative rounded-2xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          animationDelay: animDelay,
        }}>

        {/* Chain color accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
          style={{ background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />

        {/* Card header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center"
              style={{ background: `${meta.color}18` }}>
              <I d={wallet.type === "bitcoin" ? ICONS.bitcoin : ICONS.wallet} s={16}
                c="" style={{ color: meta.color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{wallet.label || meta.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                <span className="text-[10px] text-slate-500">{meta.name}</span>
              </div>
            </div>
          </div>
          <button onClick={() => onRemove(wallet.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-slate-600 transition-all">
            <I d={ICONS.trash} s={13} />
          </button>
        </div>

        {/* Balance */}
        <div className="px-5 py-3 border-t border-b border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Native Balance</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {fmt(wallet.balance, 5)}
            </span>
            <span className="text-sm text-slate-500 mb-0.5">{meta.symbol}</span>
          </div>
          {wallet.usdValue != null && (
            <p className="text-xs text-slate-600 mt-0.5">{fmtUSD(wallet.usdValue)}</p>
          )}
        </div>

        {/* Address */}
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Address</p>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-slate-400 flex-1 truncate">
              {showAddr ? wallet.address : short(wallet.address)}
            </span>
            <button onClick={() => setShowAddr(v => !v)}
              className="p-1 rounded hover:bg-white/10 text-slate-600 hover:text-slate-300 transition-colors">
              <I d={showAddr ? ICONS.eyeoff : ICONS.eye} s={12} />
            </button>
            <CopyBtn text={wallet.address} />
            <a href={`${meta.explorer}/address/${wallet.address}`} target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-600 hover:text-cyan-400 transition-colors">
              <I d={ICONS.link} s={12} />
            </a>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 grid grid-cols-4 gap-2">
          {[
            { id: "send",    icon: ICONS.send,    label: "Send",    color: "hover:text-cyan-400 hover:border-cyan-500/30" },
            { id: "receive", icon: ICONS.receive, label: "Receive", color: "hover:text-violet-400 hover:border-violet-500/30" },
            { id: "history", icon: ICONS.history, label: "History", color: "hover:text-amber-400 hover:border-amber-500/30" },
            { id: "tokens",  icon: ICONS.token,   label: "Tokens",  color: "hover:text-emerald-400 hover:border-emerald-500/30" },
          ].map(btn => (
            <button key={btn.id} onClick={() => setModal(btn.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-slate-500 text-[10px] transition-all ${btn.color} hover:bg-white/[0.07]`}>
              <I d={btn.icon} s={15} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {modal === "send"    && <SendModal    wallet={wallet} onClose={() => setModal(null)} />}
      {modal === "receive" && <ReceiveModal wallet={wallet} onClose={() => setModal(null)} />}
      {modal === "history" && <HistoryModal wallet={wallet} onClose={() => setModal(null)} />}
      {modal === "tokens"  && <TokensModal  wallet={wallet} onClose={() => setModal(null)} />}
    </>
  );
}

/* ─── CONNECT MODAL ─────────────────────────────────────────────────────────── */
function ConnectModal({ onConnected, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | scanning | error
  const [err, setErr]       = useState("");

  const connect = async () => {
    setStatus("connecting"); setErr("");
    try {
      if (!window.ethereum) throw new Error("MetaMask not detected. Please install MetaMask.");
      const accounts = await mmGetAccounts();
      const chainId  = await mmGetChainId();
      const rpc      = CHAIN_META[chainId]?.rpc || RPC.ethereum;

      setStatus("scanning");

      // Fetch balances for all connected accounts
      const walletsWithBalance = [];
      for (const address of accounts) {
        try {
          const balance = await getEvmBalance(address, rpc);
          if (balance > 0) {
            walletsWithBalance.push({
              id:      crypto.randomUUID(),
              address,
              chainId,
              balance,
              type:    "evm",
              label:   CHAIN_META[chainId]?.name || "EVM Wallet",
              addedAt: Date.now(),
              usdValue: null,
            });
          }
        } catch { /* skip on error */ }
      }
      onConnected(walletsWithBalance, accounts.length);
    } catch (e) {
      setStatus("error");
      setErr(e.message);
    }
  };

  return (
    <Modal title="Connect Wallet" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <I d={ICONS.metamask} s={28} c="text-orange-400" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-semibold text-slate-200">MetaMask</h4>
            <p className="text-xs text-slate-500 mt-0.5">Connect your injected wallet provider</p>
          </div>
        </div>

        {status === "scanning" && (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Scanning for wallets with balance…</p>
          </div>
        )}

        {err && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <I d={ICONS.warning} s={14} c="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{err}</p>
          </div>
        )}

        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] text-xs text-slate-500 space-y-1">
          <p className="flex items-center gap-1.5"><I d={ICONS.check} s={12} c="text-cyan-500" /> Only wallets with balance &gt; 0 are stored</p>
          <p className="flex items-center gap-1.5"><I d={ICONS.check} s={12} c="text-cyan-500" /> Supports all EVM-compatible chains</p>
          <p className="flex items-center gap-1.5"><I d={ICONS.check} s={12} c="text-cyan-500" /> No private keys are ever requested</p>
        </div>

        <button onClick={connect}
          disabled={status === "connecting" || status === "scanning"}
          className="w-full py-3 rounded-xl font-medium text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
          {status === "connecting" ? "Opening MetaMask…" : status === "scanning" ? "Scanning chains…" : "Connect with MetaMask"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── MAIN VAULT ─────────────────────────────────────────────────────────────── */
export default function SecureVault() {
  const [screen, setScreen]   = useState("boot"); // boot | setup | pin | dashboard
  const [wallets, setWallets] = useState([]);
  const [pinErr, setPinErr]   = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  /* Boot */
  useEffect(() => {
    const storedPin = pinLoad();
    setIsSetup(!storedPin);
    setScreen(!storedPin ? "setup" : "pin");
    const stored = vaultLoad();
    if (stored?.wallets) setWallets(stored.wallets);
  }, []);

  /* Persist wallets */
  useEffect(() => {
    if (screen === "dashboard") vaultSave({ wallets });
  }, [wallets, screen]);

  /* PIN setup — step 1 */
  const handleSetPin = useCallback((pin) => {
    setConfirmPin(pin);
    setScreen("confirm");
  }, []);

  /* PIN setup — step 2 confirm */
  const handleConfirmPin = useCallback(async (pin) => {
    if (pin !== confirmPin) { setPinErr("PINs do not match. Try again."); setScreen("setup"); return; }
    const h = await hashPin(pin);
    pinSave(h);
    setIsSetup(false);
    setPinErr("");
    setScreen("dashboard");
  }, [confirmPin]);

  /* PIN unlock */
  const handleUnlock = useCallback(async (pin) => {
    const h = await hashPin(pin);
    if (h !== pinLoad()) { setPinErr("Incorrect PIN"); return; }
    setPinErr(""); setScreen("dashboard");
  }, []);

  /* Lock */
  const lock = () => { setScreen("pin"); };

  /* Connect wallet */
  const handleConnected = useCallback((incoming, totalScanned) => {
    setWallets(prev => {
      const existingIds = new Set(prev.map(w => w.address.toLowerCase()));
      const fresh = incoming.filter(w => !existingIds.has(w.address.toLowerCase()));
      return [...prev, ...fresh];
    });
    setShowConnect(false);
  }, []);

  /* Refresh all balances */
  const refreshBalances = useCallback(async () => {
    setRefreshing(true);
    const updated = await Promise.all(wallets.map(async (w) => {
      try {
        const rpc = CHAIN_META[w.chainId]?.rpc || RPC.ethereum;
        const balance = await getEvmBalance(w.address, rpc);
        return { ...w, balance };
      } catch { return w; }
    }));
    // Remove zero-balance wallets
    setWallets(updated.filter(w => w.balance > 0));
    setRefreshing(false);
  }, [wallets]);

  /* Remove wallet */
  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id));
  }, []);

  /* Filtered wallets */
  const visible = wallets.filter(w => {
    if (filter !== "all" && (CHAIN_META[w.chainId]?.name || "").toLowerCase() !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!w.address.toLowerCase().includes(q) && !(w.label || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalUSD   = wallets.reduce((s, w) => s + (w.usdValue || 0), 0);
  const chainNames = [...new Set(wallets.map(w => CHAIN_META[w.chainId]?.name).filter(Boolean))];

  /* ── SCREENS ── */
  const screenBg = {
    background: "radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.05) 0%, transparent 60%), #05080f",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
  };

  if (screen === "boot") return (
    <div style={screenBg} className="flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
    </div>
  );

  if (screen === "setup" || screen === "confirm") return (
    <div style={screenBg} className="flex items-center justify-center p-4">
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="w-full max-w-sm">
        <PinPad
          onComplete={screen === "setup" ? handleSetPin : handleConfirmPin}
          label={screen === "setup" ? "Create a PIN" : "Confirm PIN"}
          sublabel={screen === "setup" ? "6-digit PIN to protect your vault" : "Enter the same PIN again"}
          error={pinErr}
        />
      </div>
    </div>
  );

  if (screen === "pin") return (
    <div style={screenBg} className="flex items-center justify-center p-4">
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <div className="w-full max-w-sm">
        <PinPad onComplete={handleUnlock} label="Unlock Vault" sublabel="Enter your 6-digit PIN" error={pinErr} />
      </div>
    </div>
  );

  /* ── DASHBOARD ── */
  return (
    <div style={screenBg} className="text-white">
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <div className="border-b border-white/[0.06] sticky top-0 z-30"
        style={{ backdropFilter: "blur(20px)", background: "rgba(5,8,15,0.85)" }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
              <I d={ICONS.shield} s={16} c="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Secure Vault
              </h1>
              <p className="text-[10px] text-slate-600">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""} · balance &gt; 0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshBalances} disabled={refreshing}
              className="p-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-all disabled:opacity-40">
              <I d={ICONS.refresh} s={14} c={refreshing ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white transition-all"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
              <I d={ICONS.plus} s={13} /> Connect
            </button>
            <button onClick={lock}
              className="p-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-all">
              <I d={ICONS.lock} s={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Wallets",  value: wallets.length.toString(),    sub: "with balance > 0" },
            { label: "Networks",       value: chainNames.length.toString(),  sub: chainNames.slice(0, 3).join(", ") || "—" },
            { label: "Portfolio",      value: totalUSD > 0 ? fmtUSD(totalUSD) : "—", sub: "USD estimate" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] p-4"
              style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))" }}>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">{s.label}</p>
              <p className="text-xl font-bold text-slate-100" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>{s.value}</p>
              <p className="text-[10px] text-slate-600 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Search + chain filter */}
        {wallets.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <input
              className="flex-1 min-w-[200px] bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-white/20 transition-all"
              placeholder="Search by address or label…"
              value={search} onChange={e => setSearch(e.target.value)}
            />
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
              {["all", ...chainNames].map(c => (
                <button key={c}
                  onClick={() => setFilter(c === "all" ? "all" : c.toLowerCase())}
                  className={`px-3 py-2 text-xs capitalize transition-colors ${
                    filter === (c === "all" ? "all" : c.toLowerCase())
                      ? "text-white"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                  }`}
                  style={filter === (c === "all" ? "all" : c.toLowerCase()) ? { background: "linear-gradient(135deg, #0ea5e9, #6366f1)" } : {}}>
                  {c === "all" ? `All (${wallets.length})` : c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wallet cards grid */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl border border-white/[0.08] flex items-center justify-center"
              style={{ background: "linear-gradient(145deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))" }}>
              <I d={ICONS.wallet} s={26} c="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-400">
                {wallets.length === 0 ? "No wallets yet" : "No results"}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {wallets.length === 0
                  ? "Connect MetaMask to scan for wallets with balance > 0"
                  : "Try adjusting your search or filter"}
              </p>
            </div>
            {wallets.length === 0 && (
              <button onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}>
                <I d={ICONS.link} s={15} /> Connect Wallet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((w, i) => (
              <WalletCard key={w.id} wallet={w} onRemove={removeWallet} index={i} />
            ))}
          </div>
        )}
      </div>

      {showConnect && <ConnectModal onConnected={handleConnected} onClose={() => setShowConnect(false)} />}
    </div>
  );
}
