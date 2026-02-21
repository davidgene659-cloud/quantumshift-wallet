import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Wallet,
  RefreshCw,
  Plus,
  Send,
  QrCode,
  History,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Coins,
} from 'lucide-react';

/* ─── RPC CONFIG (swap in Alchemy/Infura keys as needed) ─────────────────── */
const CHAINS = {
  1:     { name: 'Ethereum',  symbol: 'ETH',  color: '#627EEA', bg: 'from-blue-500/20 to-indigo-500/20',   rpc: 'https://ethereum.publicnode.com',           explorer: 'https://etherscan.io' },
  137:   { name: 'Polygon',   symbol: 'MATIC', color: '#8247E5', bg: 'from-purple-500/20 to-violet-500/20', rpc: 'https://polygon.publicnode.com',            explorer: 'https://polygonscan.com' },
  42161: { name: 'Arbitrum',  symbol: 'ETH',  color: '#28A0F0', bg: 'from-sky-500/20 to-blue-500/20',      rpc: 'https://arbitrum-one.publicnode.com',       explorer: 'https://arbiscan.io' },
  10:    { name: 'Optimism',  symbol: 'ETH',  color: '#FF0420', bg: 'from-red-500/20 to-rose-500/20',      rpc: 'https://optimism.publicnode.com',           explorer: 'https://optimistic.etherscan.io' },
  56:    { name: 'BSC',       symbol: 'BNB',  color: '#F3BA2F', bg: 'from-yellow-500/20 to-amber-500/20',  rpc: 'https://bsc.publicnode.com',                explorer: 'https://bscscan.com' },
  43114: { name: 'Avalanche', symbol: 'AVAX', color: '#E84142', bg: 'from-red-500/20 to-orange-500/20',    rpc: 'https://avalanche-c-chain.publicnode.com',  explorer: 'https://snowtrace.io' },
  8453:  { name: 'Base',      symbol: 'ETH',  color: '#0052FF', bg: 'from-blue-600/20 to-blue-400/20',     rpc: 'https://base.publicnode.com',               explorer: 'https://basescan.org' },
};

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
const SK = 'qshift_wallets_v1';
const loadWallets = () => { try { return JSON.parse(localStorage.getItem(SK) || '[]'); } catch { return []; } };
const saveWallets = (w) => localStorage.setItem(SK, JSON.stringify(w));
const short = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—';
const fmt = (n, d = 4) => (typeof n === 'number' ? +n.toFixed(d) : 0).toString();

async function rpc(url, method, params = []) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

async function getBalance(address, rpcUrl) {
  const hex = await rpc(rpcUrl, 'eth_getBalance', [address, 'latest']);
  return parseInt(hex, 16) / 1e18;
}

async function getGasPrice(rpcUrl) {
  const hex = await rpc(rpcUrl, 'eth_gasPrice', []);
  return parseInt(hex, 16);
}

async function estimateGas(rpcUrl, from, to, value) {
  const hex = await rpc(rpcUrl, 'eth_estimateGas', [{
    from, to,
    value: '0x' + BigInt(Math.floor(value * 1e18)).toString(16),
  }]);
  return parseInt(hex, 16);
}

async function getTxList(address, chainId) {
  const endpoints = {
    1:     'https://api.etherscan.io/api',
    137:   'https://api.polygonscan.com/api',
    42161: 'https://api.arbiscan.io/api',
    56:    'https://api.bscscan.com/api',
    10:    'https://api-optimistic.etherscan.io/api',
    8453:  'https://api.basescan.org/api',
  };
  const url = endpoints[chainId];
  if (!url) return [];
  try {
    const r = await fetch(`${url}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=YourApiKeyToken`);
    const j = await r.json();
    return Array.isArray(j.result) ? j.result.slice(0, 20) : [];
  } catch { return []; }
}

async function getTokenList(address, chainId) {
  const endpoints = {
    1:   'https://api.etherscan.io/api',
    137: 'https://api.polygonscan.com/api',
    56:  'https://api.bscscan.com/api',
  };
  const url = endpoints[chainId];
  if (!url) return [];
  try {
    const r = await fetch(`${url}?module=account&action=tokentx&address=${address}&page=1&offset=50&sort=desc&apikey=YourApiKeyToken`);
    const j = await r.json();
    if (!Array.isArray(j.result)) return [];
    const seen = new Map();
    for (const tx of j.result) {
      if (!seen.has(tx.contractAddress))
        seen.set(tx.contractAddress, { symbol: tx.tokenSymbol, name: tx.tokenName, contract: tx.contractAddress });
    }
    return [...seen.values()];
  } catch { return []; }
}

/* ─── SMALL UI ATOMS ──────────────────────────────────────────────────────── */
function CopyButton({ text, size = 14 }) {
  const [done, setDone] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all">
      {done ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
    </button>
  );
}

function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin text-purple-400" />;
}

function ChainDot({ chainId }) {
  const chain = CHAINS[chainId];
  if (!chain) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-white/50">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: chain.color }} />
      {chain.name}
    </span>
  );
}

/* ─── MODAL SHELL ─────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backdropFilter: 'blur(16px)', background: 'rgba(3,7,18,0.8)' }}
      onClick={onClose}>
      <div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden`}
        style={{ background: 'linear-gradient(160deg, #111827 0%, #0d1117 100%)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─── SEND MODAL ──────────────────────────────────────────────────────────── */
function SendModal({ wallet, onClose }) {
  const chain = CHAINS[wallet.chainId] || CHAINS[1];
  const [to, setTo]       = useState('');
  const [amt, setAmt]     = useState('');
  const [gas, setGas]     = useState(null);
  const [gp, setGp]       = useState(null);
  const [est, setEst]     = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash]   = useState('');
  const [err, setErr]         = useState('');

  const runEstimate = async () => {
    if (!to || !amt || isNaN(+amt)) return;
    setEst(true); setErr('');
    try {
      const gasPrice = await getGasPrice(chain.rpc);
      const gasLimit = await estimateGas(chain.rpc, wallet.address, to, +amt);
      setGp(gasPrice); setGas(gasLimit);
    } catch (e) { setErr('Gas estimate failed: ' + e.message); }
    finally { setEst(false); }
  };

  const handleSend = async () => {
    setSending(true); setErr('');
    try {
      const curChain = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
      if (curChain !== wallet.chainId)
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + wallet.chainId.toString(16) }] });
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to, value: '0x' + BigInt(Math.round(+amt * 1e18)).toString(16), gasPrice: '0x' + BigInt(gp).toString(16), gas: '0x' + BigInt(gas).toString(16) }],
      });
      setTxHash(hash);
    } catch (e) { setErr(e.message); }
    finally { setSending(false); }
  };

  const inp = 'w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60 transition-all';

  if (txHash) return (
    <Modal title="Sent!" onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Check size={30} className="text-emerald-400" />
        </div>
        <p className="text-sm text-white/70">Transaction broadcast to {chain.name}</p>
        <div className="w-full bg-white/[0.04] rounded-xl p-3 border border-white/10">
          <p className="text-[10px] text-white/30 mb-1.5 uppercase tracking-widest">TX Hash</p>
          <div className="flex items-center gap-2"><span className="font-mono text-xs text-white/60 truncate flex-1">{txHash}</span><CopyButton text={txHash} /></div>
        </div>
        <a href={`${chain.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300">
          View on Explorer <ExternalLink size={12} />
        </a>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Send ${chain.symbol}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: chain.color }} />
          <span className="text-xs text-white/50">{chain.name}</span>
          <span className="ml-auto font-mono text-xs text-white/40">{short(wallet.address)}</span>
          <span className="text-xs font-medium text-white/80">{fmt(wallet.balance, 5)} {chain.symbol}</span>
        </div>
        <input className={inp} placeholder="To address (0x…)" value={to} onChange={e => { setTo(e.target.value); setGas(null); }} />
        <div className="relative">
          <input className={inp + ' pr-16'} placeholder="Amount" type="number" value={amt} onChange={e => { setAmt(e.target.value); setGas(null); }} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 font-mono">{chain.symbol}</span>
        </div>
        <button onClick={runEstimate} disabled={!to || !amt || est}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white/80 hover:border-white/20 disabled:opacity-40 transition-all">
          {est ? <Spinner size={13} /> : <Zap size={13} />} {est ? 'Estimating…' : 'Estimate Gas'}
        </button>
        {gas && gp && (
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07] space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-white/40">Gas limit</span><span className="text-white/70 font-mono">{gas.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Gas price</span><span className="text-white/70 font-mono">{(gp / 1e9).toFixed(2)} Gwei</span></div>
            <div className="flex justify-between pt-1 border-t border-white/[0.07]">
              <span className="text-white/40">Est. fee</span>
              <span className="text-purple-400 font-mono">{((gas * gp) / 1e18).toFixed(6)} {chain.symbol}</span>
            </div>
          </div>
        )}
        {err && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={13} />{err}</p>}
        <button onClick={handleSend} disabled={!gas || !to || !amt || sending}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all">
          {sending ? <span className="flex items-center justify-center gap-2"><Spinner size={15} />Waiting for MetaMask…</span> : `Send ${amt || '0'} ${chain.symbol}`}
        </button>
      </div>
    </Modal>
  );
}

/* ─── RECEIVE MODAL ───────────────────────────────────────────────────────── */
function ReceiveModal({ wallet, onClose }) {
  const chain = CHAINS[wallet.chainId] || CHAINS[1];
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(wallet.address)}&bgcolor=111827&color=e9d5ff&margin=10`;
  return (
    <Modal title="Receive" onClose={onClose}>
      <div className="flex flex-col items-center gap-5 py-2">
        <ChainDot chainId={wallet.chainId} />
        <img src={qr} alt="QR" width={200} height={200} className="rounded-2xl border border-white/10" />
        <div className="w-full bg-white/[0.04] rounded-xl p-4 border border-white/10">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Your Address</p>
          <div className="flex items-start gap-2">
            <span className="font-mono text-xs text-white/70 break-all flex-1">{wallet.address}</span>
            <CopyButton text={wallet.address} />
          </div>
        </div>
        <p className="text-[11px] text-white/30 text-center">Only send {chain.symbol} and {chain.name}-compatible tokens to this address.</p>
      </div>
    </Modal>
  );
}

/* ─── HISTORY MODAL ───────────────────────────────────────────────────────── */
function HistoryModal({ wallet, onClose }) {
  const chain = CHAINS[wallet.chainId] || CHAINS[1];
  const [txs, setTxs]     = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getTxList(wallet.address, wallet.chainId).then(setTxs).finally(() => setLoading(false)); }, []);

  return (
    <Modal title="Transaction History" onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-white/30">
          <History size={32} />
          <p className="text-sm">No transactions found</p>
          <p className="text-xs text-white/20">Add Etherscan API key for full history</p>
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map((tx, i) => {
            const out = tx.from?.toLowerCase() === wallet.address.toLowerCase();
            const val = parseInt(tx.value || 0) / 1e18;
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${out ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {out ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/80">{out ? 'Sent' : 'Received'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tx.txreceipt_status === '1' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {tx.txreceipt_status === '1' ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 font-mono truncate">{out ? tx.to : tx.from}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-mono font-semibold ${out ? 'text-red-400' : 'text-emerald-400'}`}>
                    {out ? '-' : '+'}{fmt(val, 5)} {chain.symbol}
                  </p>
                  <p className="text-[10px] text-white/30">{new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()}</p>
                </div>
                <a href={`${chain.explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100">
                  <ExternalLink size={13} />
                </a>
              </div>
            );
          })}
          <p className="text-[10px] text-white/20 text-center pt-1">Showing last 20 · Add Etherscan API key for full history</p>
        </div>
      )}
    </Modal>
  );
}

/* ─── TOKENS MODAL ────────────────────────────────────────────────────────── */
function TokensModal({ wallet, onClose }) {
  const [tokens, setTokens]   = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getTokenList(wallet.address, wallet.chainId).then(setTokens).finally(() => setLoading(false)); }, []);

  return (
    <Modal title="Tokens & NFTs" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3 text-white/30">
          <Coins size={32} />
          <p className="text-sm">No tokens found</p>
          <p className="text-xs text-white/20">Token detection requires Etherscan API key</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center text-white/40 text-xs font-bold">
                {t.symbol?.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80">{t.name}</p>
                <p className="text-[10px] text-white/30 font-mono">{short(t.contract)}</p>
              </div>
              <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">{t.symbol}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ─── WALLET CARD ─────────────────────────────────────────────────────────── */
function WalletCard({ wallet, onRemove, index }) {
  const [modal, setModal] = useState(null);
  const [showFull, setShowFull] = useState(false);
  const chain = CHAINS[wallet.chainId] || { name: 'Unknown', symbol: '?', color: '#64748b', bg: 'from-slate-500/20 to-slate-600/20', explorer: '#' };

  return (
    <>
      <div
        className="group relative rounded-2xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
        style={{ animationDelay: `${index * 60}ms` }}>

        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${chain.color}80, transparent)` }} />
        <div className={`absolute inset-0 bg-gradient-to-br ${chain.bg} opacity-30`} />

        <div className="relative p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center bg-gray-800/80">
                <Wallet size={18} style={{ color: chain.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{wallet.label || chain.name}</p>
                <ChainDot chainId={wallet.chainId} />
              </div>
            </div>
            <button onClick={() => onRemove(wallet.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 hover:text-red-400 text-white/30 transition-all">
              <X size={14} />
            </button>
          </div>

          {/* Balance */}
          <div className="bg-black/20 rounded-xl p-3 border border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Balance</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">{fmt(wallet.balance, 5)}</span>
              <span className="text-sm text-white/50 mb-0.5">{chain.symbol}</span>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5">Address</p>
            <div className="flex items-center gap-1.5 bg-black/20 rounded-xl px-3 py-2 border border-white/[0.06]">
              <span className="font-mono text-xs text-white/60 flex-1 truncate">
                {showFull ? wallet.address : short(wallet.address)}
              </span>
              <button onClick={() => setShowFull(v => !v)} className="p-1 rounded text-white/30 hover:text-white/60 transition-colors">
                {showFull ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <CopyButton text={wallet.address} size={12} />
              <a href={`${chain.explorer}/address/${wallet.address}`} target="_blank" rel="noreferrer"
                className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors">
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'send',    Icon: Send,    label: 'Send',    cls: 'hover:border-purple-500/40 hover:text-purple-400' },
              { id: 'receive', Icon: QrCode,  label: 'Receive', cls: 'hover:border-pink-500/40 hover:text-pink-400' },
              { id: 'history', Icon: History, label: 'History', cls: 'hover:border-amber-500/40 hover:text-amber-400' },
              { id: 'tokens',  Icon: Layers,  label: 'Tokens',  cls: 'hover:border-emerald-500/40 hover:text-emerald-400' },
            ].map(btn => (
              <button key={btn.id} onClick={() => setModal(btn.id)}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/40 text-[10px] font-medium transition-all hover:bg-white/[0.07] ${btn.cls}`}>
                <btn.Icon size={15} />
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {modal === 'send'    && <SendModal    wallet={wallet} onClose={() => setModal(null)} />}
      {modal === 'receive' && <ReceiveModal wallet={wallet} onClose={() => setModal(null)} />}
      {modal === 'history' && <HistoryModal wallet={wallet} onClose={() => setModal(null)} />}
      {modal === 'tokens'  && <TokensModal  wallet={wallet} onClose={() => setModal(null)} />}
    </>
  );
}

/* ─── CONNECT MODAL ───────────────────────────────────────────────────────── */
function ConnectModal({ onConnected, onClose }) {
  const [status, setStatus] = useState('idle');
  const [err, setErr] = useState('');

  const connect = async () => {
    setStatus('connecting'); setErr('');
    try {
      if (!window.ethereum) throw new Error('MetaMask not detected. Please install MetaMask first.');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainId  = parseInt(chainHex, 16);
      const chainCfg = CHAINS[chainId];

      setStatus('scanning');

      const results = [];
      for (const address of accounts) {
        try {
          const rpcUrl  = chainCfg?.rpc || CHAINS[1].rpc;
          const balance = await getBalance(address, rpcUrl);
          if (balance > 0) {
            results.push({
              id:      crypto.randomUUID(),
              address,
              chainId,
              balance,
              label:   chainCfg?.name || 'EVM Wallet',
              addedAt: Date.now(),
            });
          }
        } catch { /* skip */ }
      }

      onConnected(results);
    } catch (e) {
      setStatus('error');
      setErr(e.message);
    }
  };

  return (
    <Modal title="Connect Wallet" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Globe size={30} className="text-orange-400" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-semibold text-white">MetaMask</h4>
            <p className="text-xs text-white/40 mt-1">Connect your browser wallet</p>
          </div>
        </div>

        {status === 'scanning' && (
          <div className="flex flex-col items-center gap-2 py-2">
            <Spinner size={22} />
            <p className="text-xs text-white/50">Scanning for wallets with balance…</p>
          </div>
        )}

        {err && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{err}</p>
          </div>
        )}

        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06] space-y-1.5 text-xs text-white/40">
          <p className="flex items-center gap-2"><Check size={12} className="text-purple-400" />Only wallets with balance &gt; 0 are stored</p>
          <p className="flex items-center gap-2"><Check size={12} className="text-purple-400" />Supports all EVM-compatible chains</p>
          <p className="flex items-center gap-2"><Check size={12} className="text-purple-400" />No private keys ever requested</p>
        </div>

        <button onClick={connect}
          disabled={status === 'connecting' || status === 'scanning'}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all">
          {status === 'connecting' ? 'Opening MetaMask…' : status === 'scanning' ? 'Scanning…' : 'Connect with MetaMask'}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const [wallets, setWallets]     = useState([]);
  const [showConnect, setShowConnect] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter, setFilter]           = useState('all');
  const [mmAccount, setMmAccount]     = useState(null);
  const [mmChain, setMmChain]         = useState(null);

  /* Load from storage */
  useEffect(() => {
    setWallets(loadWallets());
  }, []);

  /* Listen to MetaMask account/chain changes */
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accs) => setMmAccount(accs[0] || null);
    const onChain    = (hex)  => setMmChain(parseInt(hex, 16));
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    // Read current state
    window.ethereum.request({ method: 'eth_accounts' }).then(a => setMmAccount(a[0] || null));
    window.ethereum.request({ method: 'eth_chainId' }).then(h => setMmChain(parseInt(h, 16)));
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, []);

  /* Persist on change */
  useEffect(() => { saveWallets(wallets); }, [wallets]);

  const handleConnected = useCallback((incoming) => {
    setWallets(prev => {
      const existing = new Set(prev.map(w => w.address.toLowerCase()));
      const fresh = incoming.filter(w => !existing.has(w.address.toLowerCase()));
      return [...prev, ...fresh];
    });
    setShowConnect(false);
  }, []);

  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id));
  }, []);

  const refreshBalances = useCallback(async () => {
    setRefreshing(true);
    const updated = await Promise.all(wallets.map(async w => {
      try {
        const rpcUrl  = CHAINS[w.chainId]?.rpc || CHAINS[1].rpc;
        const balance = await getBalance(w.address, rpcUrl);
        return { ...w, balance };
      } catch { return w; }
    }));
    setWallets(updated.filter(w => w.balance > 0));
    setRefreshing(false);
  }, [wallets]);

  /* Filter */
  const chainNames = [...new Set(wallets.map(w => CHAINS[w.chainId]?.name).filter(Boolean))];
  const visible = wallets.filter(w => filter === 'all' || CHAINS[w.chainId]?.name === filter);

  const totalWallets = wallets.length;
  const totalNetworks = chainNames.length;
  const connectedLabel = mmAccount ? `${short(mmAccount)} · ${CHAINS[mmChain]?.name || `Chain ${mmChain}`}` : 'Not connected';

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-24 md:pb-8">

      {/* Page header */}
      <div className="border-b border-white/[0.06] bg-gray-900/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Wallet</h1>
              <p className="text-xs text-white/40 mt-0.5">
                {mmAccount
                  ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />{connectedLabel}</span>
                  : <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" />MetaMask not connected</span>
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshBalances} disabled={refreshing || wallets.length === 0}
                className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-white/50 hover:text-white transition-all disabled:opacity-40">
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30">
                <Plus size={15} /> Connect
              </button>
              <Link to={createPageUrl('SecureVaultPage')}
                className="p-2.5 rounded-xl border border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-white/50 hover:text-purple-400 transition-all"
                title="Open Secure Vault">
                <Shield size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Connected Wallets', value: totalWallets, sub: 'balance > 0 only' },
            { label: 'Networks',          value: totalNetworks, sub: chainNames.slice(0, 2).join(', ') || '—' },
            { label: 'MetaMask',          value: mmAccount ? 'Active' : 'Inactive', sub: mmAccount ? short(mmAccount) : 'Not connected',
              valueClass: mmAccount ? 'text-emerald-400' : 'text-white/40' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-gray-900/50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">{s.label}</p>
              <p className={`text-xl font-bold ${s.valueClass || 'text-white'}`}>{s.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Chain filter */}
        {wallets.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {['all', ...chainNames].map(c => (
              <button key={c}
                onClick={() => setFilter(c)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  filter === c
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-transparent text-white'
                    : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 bg-transparent'
                }`}>
                {c === 'all' ? `All Wallets (${wallets.length})` : c}
              </button>
            ))}
          </div>
        )}

        {/* Wallet cards */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/[0.07] flex items-center justify-center">
              <Wallet size={32} className="text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white/60">No wallets yet</p>
              <p className="text-sm text-white/30 mt-1 max-w-xs">
                Connect MetaMask to automatically detect and store wallets with a balance greater than 0.
              </p>
            </div>
            <button onClick={() => setShowConnect(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-900/30">
              <Plus size={16} /> Connect Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map((w, i) => (
              <WalletCard key={w.id} wallet={w} onRemove={removeWallet} index={i} />
            ))}
          </div>
        )}

        {/* Footer hint */}
        {wallets.length > 0 && (
          <p className="text-[11px] text-white/20 text-center">
            Wallets are stored locally · Zero-balance wallets removed on refresh ·{' '}
            <Link to={createPageUrl('SecureVaultPage')} className="text-purple-400/60 hover:text-purple-400">Open Vault</Link>
          </p>
        )}
      </div>

      {showConnect && <ConnectModal onConnected={handleConnected} onClose={() => setShowConnect(false)} />}
    </main>
  );
}
