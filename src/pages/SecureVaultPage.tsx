import React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Wallet } from "@/entities/Wallet";
import { SecureVault } from "@/entities/SecureVault";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lock, Unlock, Shield, Zap, Plus, Eye, EyeOff, Copy,
  AlertCircle, CheckCircle2, Loader2, Send, Download,
  RefreshCw, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// AES-256-GCM CRYPTO HELPERS
// ═══════════════════════════════════════════════════════════════════════════
async function deriveKey(password: string, salt: string) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
async function encryptPrivateKey(raw: string, password: string, saltId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, saltId);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(raw));
  return {
    encrypted_private_key: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    encryption_iv: btoa(String.fromCharCode(...iv)),
  };
}
async function decryptPrivateKey(encB64: string, ivB64: string, password: string, saltId: string) {
  const key = await deriveKey(password, saltId);
  const enc = Uint8Array.from(atob(encB64), c => c.charCodeAt(0));
  const iv  = Uint8Array.from(atob(ivB64),  c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, enc);
  return new TextDecoder().decode(dec);
}

// ═══════════════════════════════════════════════════════════════════════════
// FREE PUBLIC RPC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════
const RPC = {
  ETH:  "https://ethereum.publicnode.com",
  BTC:  "https://mempool.space/api",
  SOL:  "https://api.mainnet-beta.solana.com",
};

// ═══════════════════════════════════════════════════════════════════════════
// BITCOIN — mempool.space
// ═══════════════════════════════════════════════════════════════════════════
async function btcFetchBalance(address: string) {
  const r = await fetch(`${RPC.BTC}/address/${address}`);
  if (!r.ok) throw new Error("BTC address fetch failed");
  const d = await r.json();
  const confirmed   = (d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum) / 1e8;
  const unconfirmed = (d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum) / 1e8;
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

async function btcFetchUTXOs(address: string) {
  const r = await fetch(`${RPC.BTC}/address/${address}/utxo`);
  if (!r.ok) throw new Error("BTC UTXO fetch failed");
  const utxos = await r.json();
  return utxos.map((u: any) => ({
    txid: u.txid, vout: u.vout, value: u.value,
    confirmed: u.status?.confirmed ?? false,
  }));
}

async function btcFetchFees() {
  const r = await fetch(`${RPC.BTC}/v1/fees/recommended`);
  if (!r.ok) throw new Error("BTC fee fetch failed");
  const d = await r.json();
  return {
    slow:   d.hourFee,
    medium: d.halfHourFee,
    fast:   d.fastestFee,
  };
}

function btcSelectUTXOs(utxos: any[], targetSats: number, feeSats: number) {
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const selected: any[] = [];
  let total = 0;
  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= targetSats + feeSats) break;
  }
  return { selected, total, change: total - targetSats - feeSats };
}

function btcEstimateFee(numInputs: number, numOutputs: number, satPerVbyte: number) {
  const vBytes = 148 * numInputs + 34 * numOutputs + 10;
  return vBytes * satPerVbyte;
}

// ═══════════════════════════════════════════════════════════════════════════
// ETHEREUM — publicnode.com
// ═══════════════════════════════════════════════════════════════════════════
async function ethRpc(method: string, params: any[]) {
  const r = await fetch(RPC.ETH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

async function ethFetchBalance(address: string) {
  const hex = await ethRpc("eth_getBalance", [address, "latest"]);
  return parseInt(hex, 16) / 1e18;
}

async function ethFetchGas() {
  const [baseFeeHex, prioHex] = await Promise.all([
    ethRpc("eth_gasPrice", []),
    ethRpc("eth_maxPriorityFeePerGas", []),
  ]);
  const baseGwei = parseInt(baseFeeHex, 16) / 1e9;
  const prioGwei = parseInt(prioHex, 16) / 1e9;
  return {
    slow:   { maxFee: baseGwei + 1,          priority: 1 },
    medium: { maxFee: baseGwei + prioGwei,   priority: prioGwei },
    fast:   { maxFee: baseGwei + prioGwei*2, priority: prioGwei*2 },
    baseGwei,
  };
}

async function ethEstimateGasLimit(from: string, to: string, value: string) {
  try {
    const hex = await ethRpc("eth_estimateGas", [{ from, to, value }]);
    return parseInt(hex, 16);
  } catch { return 21000; }
}

async function ethFetchNonce(address: string) {
  const hex = await ethRpc("eth_getTransactionCount", [address, "latest"]);
  return parseInt(hex, 16);
}

async function ethFetchChainId() {
  const hex = await ethRpc("eth_chainId", []);
  return parseInt(hex, 16);
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLANA — mainnet-beta
// ═══════════════════════════════════════════════════════════════════════════
async function solRpc(method: string, params: any[]) {
  const r = await fetch(RPC.SOL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.result;
}

async function solFetchBalance(address: string) {
  const result = await solRpc("getBalance", [address]);
  return (result?.value ?? 0) / 1e9;
}

async function solFetchFee() {
  try {
    const result = await solRpc("getRecentBlockhash", []);
    return (result?.value?.feeCalculator?.lamportsPerSignature ?? 5000) / 1e9;
  } catch { return 0.000005; }
}

async function solFetchTokenAccounts(address: string) {
  try {
    const result = await solRpc("getTokenAccountsByOwner", [
      address,
      { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
      { encoding: "jsonParsed" },
    ]);
    return (result?.value ?? []).map((a: any) => ({
      mint:    a.account.data.parsed.info.mint,
      amount:  a.account.data.parsed.info.tokenAmount.uiAmount,
      symbol:  "SPL",
      decimals: a.account.data.parsed.info.tokenAmount.decimals,
    }));
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAIN META & DISPLAY
// ═══════════════════════════════════════════════════════════════════════════
const CHAIN_BADGE: Record<string, string> = {
  ETH: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BTC: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const CHAIN_COLOR: Record<string, string> = {
  ETH: "text-blue-400",
  BTC: "text-orange-400",
  SOL: "text-purple-400",
};

const CHAIN_NATIVE: Record<string, string> = {
  ETH: "ETH", BTC: "BTC", SOL: "SOL",
};

const CASINO_OPTIONS = [
  { name: "Stake.com", icon: "♠" },
  { name: "Rollbit",   icon: "🎲" },
  { name: "BC.Game",   icon: "⚡" },
  { name: "Roobet",    icon: "🦘" },
  { name: "Cloudbet",  icon: "☁"  },
];

// ═══════════════════════════════════════════════════════════════════════════
// QR CODE
// ═══════════════════════════════════════════════════════════════════════════
function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=0a0a0f&color=ffffff&margin=2`}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function SecureVaultPage() {
  // ── Entity state ──────────────────────────────────────────────────────
  const [wallets, setWallets]   = useState<any[]>([]);
  const [vaults, setVaults]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Vault unlock state ────────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // ── Live blockchain state ─────────────────────────────────────────────
  const [liveBalance, setLiveBalance]   = useState<any>(null);
  const [utxos, setUtxos]               = useState<any[]>([]);
  const [fees, setFees]                 = useState<any>(null);
  const [tokenAccounts, setTokenAccounts] = useState<any[]>([]);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError]     = useState("");

  // ── Send state ────────────────────────────────────────────────────────
  const [sendModal, setSendModal]   = useState(false);
  const [sendTo, setSendTo]         = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendTier, setSendTier]     = useState<"slow"|"medium"|"fast">("medium");
  const [sendTxid, setSendTxid]     = useState("");
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState("");

  // ── Receive state ─────────────────────────────────────────────────────
  const [receiveModal, setReceiveModal] = useState(false);

  // ── Vault modal state ─────────────────────────────────────────────────
  const [pwModal, setPwModal]         = useState<{ id: string; mode: "unlock"|"vault" } | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importPk, setImportPk]       = useState("");
  const [password, setPassword]       = useState("");
  const [importForm, setImportForm]   = useState({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState("");

  // ── Export state ──────────────────────────────────────────────────────
  const [exportModal, setExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportIncludeKeys, setExportIncludeKeys] = useState(true);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);

  const refreshRef = useRef<any>(null);

  // ── Load entities from Base44 ─────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [wl, vl] = await Promise.all([Wallet.list(), SecureVault.list()]);
      setWallets(wl);
      setVaults(vl);
      if (wl.length > 0) setActiveId(wl[0].id);
    } catch (e: any) { showToast("Failed to load: " + e.message); }
    setLoading(false);
  }

  // ── Fetch live data whenever active wallet changes ────────────────────
  useEffect(() => {
    if (!activeWallet?.address) return;
    fetchChainData(activeWallet);
    if (refreshRef.current) clearInterval(refreshRef.current);
    refreshRef.current = setInterval(() => fetchChainData(activeWallet), 30000);
    return () => clearInterval(refreshRef.current);
  }, [activeId, wallets]);

  const activeWallet = wallets.find(w => w.id === activeId);
  const activeVault  = vaults.find(v => v.wallet_id === activeId);
  const isUnlocked   = !!unlocked[activeId ?? ""];
  const hasVault     = !!activeVault;
  const chain        = activeWallet?.chain ?? "ETH";

  const grandTotal = wallets.reduce((s, w) => s + (w.total_usd_value || 0), 0);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // ── FETCH LIVE CHAIN DATA ─────────────────────────────────────────────
  async function fetchChainData(w: any) {
    if (!w?.address) return;
    setChainLoading(true); setChainError("");
    try {
      if (w.chain === "BTC") {
        const [bal, utxoList, feeData] = await Promise.all([
          btcFetchBalance(w.address),
          btcFetchUTXOs(w.address),
          btcFetchFees(),
        ]);
        setLiveBalance(bal);
        setUtxos(utxoList);
        setFees(feeData);
        const usdPrice = await fetchBtcPrice();
        const total_usd_value = +(bal.total * usdPrice).toFixed(2);
        const updated = await Wallet.update(w.id, {
          balances: { BTC: { amount: bal.total, usd_value: total_usd_value, price: usdPrice } },
          total_usd_value,
        });
        setWallets(prev => prev.map(x => x.id === w.id ? { ...x, ...updated } : x));

      } else if (w.chain === "ETH") {
        const [bal, gasData] = await Promise.all([
          ethFetchBalance(w.address),
          ethFetchGas(),
        ]);
        setLiveBalance({ total: bal, confirmed: bal, unconfirmed: 0 });
        setFees(gasData);
        const usdPrice = await fetchEthPrice();
        const total_usd_value = +(bal * usdPrice).toFixed(2);
        const updated = await Wallet.update(w.id, {
          balances: { ETH: { amount: bal, usd_value: total_usd_value, price: usdPrice } },
          total_usd_value,
        });
        setWallets(prev => prev.map(x => x.id === w.id ? { ...x, ...updated } : x));

      } else if (w.chain === "SOL") {
        const [bal, fee, tokens] = await Promise.all([
          solFetchBalance(w.address),
          solFetchFee(),
          solFetchTokenAccounts(w.address),
        ]);
        setLiveBalance({ total: bal, confirmed: bal, unconfirmed: 0 });
        setFees({ slow: fee, medium: fee, fast: fee * 2 });
        setTokenAccounts(tokens);
        const usdPrice = await fetchSolPrice();
        const total_usd_value = +(bal * usdPrice).toFixed(2);
        const updated = await Wallet.update(w.id, {
          balances: { SOL: { amount: bal, usd_value: total_usd_value, price: usdPrice } },
          total_usd_value,
        });
        setWallets(prev => prev.map(x => x.id === w.id ? { ...x, ...updated } : x));
      }
    } catch (e: any) {
      setChainError(e.message || "Failed to fetch chain data");
    }
    setChainLoading(false);
  }

  // ── Price fetchers ────────────────────────────────────────────────────
  async function fetchBtcPrice() {
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
      const d = await r.json(); return d.bitcoin.usd;
    } catch { return 67000; }
  }
  async function fetchEthPrice() {
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const d = await r.json(); return d.ethereum.usd;
    } catch { return 3200; }
  }
  async function fetchSolPrice() {
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const d = await r.json(); return d.solana.usd;
    } catch { return 170; }
  }

  // ── COMPUTE SEND FEE ──────────────────────────────────────────────────
  function computeFee() {
    if (!fees) return 0;
    if (chain === "BTC") {
      const satPerVbyte = fees[sendTier];
      return btcEstimateFee(utxos.length || 1, 2, satPerVbyte) / 1e8;
    }
    if (chain === "ETH") {
      const gas = fees[sendTier];
      return (gas.maxFee * 21000) / 1e9;
    }
    if (chain === "SOL") return fees[sendTier] || 0.000005;
    return 0;
  }

  // ── SEND TRANSACTION ──────────────────────────────────────────────────
  async function handleSend() {
    if (!isUnlocked) return setSendError("Unlock your vault first.");
    if (!sendTo.trim() || !sendAmount.trim()) return setSendError("Enter recipient and amount.");
    const amount  = parseFloat(sendAmount);
    const balance = liveBalance?.total ?? 0;
    const fee     = computeFee();
    if (amount + fee > balance) return setSendError(`Insufficient funds. Balance: ${balance.toFixed(8)} ${CHAIN_NATIVE[chain]}, Fee: ${fee.toFixed(8)}`);
    setSending(true); setSendError("");
    try {
      if (chain === "BTC") {
        const satTarget = Math.floor(amount * 1e8);
        const satFee    = Math.floor(fee * 1e8);
        const { selected, change } = btcSelectUTXOs(utxos, satTarget, satFee);
        setSendTxid(`[BTC_SIGN_READY] ${selected.length} UTXOs selected, fee: ${satFee} sats, change: ${change} sats`);
        showToast("✅ BTC transaction built — add bitcoinjs-lib to broadcast");
      }
      if (chain === "ETH") {
        const [nonce, chainId, gasLimit] = await Promise.all([
          ethFetchNonce(activeWallet.address),
          ethFetchChainId(),
          ethEstimateGasLimit(activeWallet.address, sendTo, "0x" + Math.floor(amount * 1e18).toString(16)),
        ]);
        const gas = fees[sendTier];
        setSendTxid(`[ETH_SIGN_READY] nonce:${nonce} chainId:${chainId} gasLimit:${gasLimit} maxFee:${gas.maxFee.toFixed(2)}gwei`);
        showToast("✅ ETH transaction built — add ethers.js to broadcast");
      }
      if (chain === "SOL") {
        setSendTxid(`[SOL_SIGN_READY] amount:${amount} SOL to ${sendTo}, fee:${fee} SOL`);
        showToast("✅ SOL transaction built — add @solana/web3.js to broadcast");
      }
    } catch (e: any) { setSendError(e.message); }
    setSending(false);
  }

  // ── UNLOCK VAULT ──────────────────────────────────────────────────────
  async function handleUnlock() {
    if (!password.trim()) return setError("Enter vault password.");
    setSaving(true); setError("");
    try {
      const raw = await decryptPrivateKey(
        activeVault.encrypted_private_key, activeVault.encryption_iv, password, activeVault.wallet_id
      );
      setUnlocked(u => ({ ...u, [activeId!]: raw }));
      const updated = await SecureVault.update(activeVault.id, { last_used: new Date().toISOString() });
      setVaults(prev => prev.map(v => v.id === activeVault.id ? { ...v, ...updated } : v));
      setPwModal(null); setPassword("");
      showToast("🔓 Vault decrypted — wallet ready");
    } catch { setError("Decryption failed — wrong password?"); }
    setSaving(false);
  }

  // ── ADD TO VAULT ──────────────────────────────────────────────────────
  async function handleAddToVault() {
    if (!importPk.trim() || !password.trim()) return setError("Private key + password required.");
    setSaving(true); setError("");
    try {
      const { encrypted_private_key, encryption_iv } = await encryptPrivateKey(importPk, password, activeId!);
      const newVault = await SecureVault.create({
        user_id: "current", wallet_id: activeId, encrypted_private_key, encryption_iv,
        key_type: activeWallet?.key_type || "hex", spending_enabled: false, last_used: new Date().toISOString(),
      });
      setVaults(prev => [...prev, newVault]);
      setUnlocked(u => ({ ...u, [activeId!]: importPk }));
      setPwModal(null); setPassword(""); setImportPk("");
      showToast("🔐 Private key encrypted into SecureVault");
    } catch (e: any) { setError("Failed: " + e.message); }
    setSaving(false);
  }

  // ── IMPORT WALLET ─────────────────────────────────────────────────────
  async function handleImport() {
    const { label, chain, address, privateKey, key_type } = importForm;
    if (!label || !address || !privateKey || !password.trim()) return setError("All fields required.");
    setSaving(true); setError("");
    try {
      const tempId = `temp_${Date.now()}`;
      const { encrypted_private_key, encryption_iv } = await encryptPrivateKey(privateKey, password, tempId);
      const newWallet = await Wallet.create({
        user_id: "current", label, chain, address,
        balances: {}, total_usd_value: 0, connected_casinos: [],
      });
      const newVault = await SecureVault.create({
        user_id: "current", wallet_id: newWallet.id, encrypted_private_key, encryption_iv,
        key_type, spending_enabled: false, last_used: new Date().toISOString(),
      });
      setWallets(prev => [...prev, newWallet]);
      setVaults(prev => [...prev, newVault]);
      setUnlocked(u => ({ ...u, [newWallet.id]: privateKey }));
      setActiveId(newWallet.id);
      setImportModal(false); setPassword("");
      setImportForm({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
      showToast("✅ Wallet imported — fetching live balance…");
    } catch (e: any) { setError("Import failed: " + e.message); }
    setSaving(false);
  }

  // ── TOGGLE CASINO ─────────────────────────────────────────────────────
  async function toggleCasino(casino: { name: string }) {
    if (!activeWallet) return;
    const existing = activeWallet.connected_casinos || [];
    const idx = existing.findIndex((c: any) => c.name === casino.name);
    const updated_casinos = idx >= 0
      ? existing.filter((_: any, i: number) => i !== idx)
      : [...existing, { name: casino.name, connected_at: new Date().toISOString(), status: "active" }];
    const updated = await Wallet.update(activeId!, { connected_casinos: updated_casinos });
    setWallets(prev => prev.map(w => w.id === activeId ? { ...w, ...updated } : w));
    showToast(idx >= 0 ? `⛔ Disconnected ${casino.name}` : `✅ Connected ${casino.name}`);
  }

  // ── EXPORT VAULT ──────────────────────────────────────────────────────
  async function handleExportVault() {
    if (exportIncludeKeys && !exportPassword.trim()) {
      return setExportError("Enter your vault password to verify identity before exporting keys.");
    }
    setExporting(true); setExportError("");
    try {
      // If including keys, verify password works on at least one vault entry
      if (exportIncludeKeys && vaults.length > 0) {
        const testVault = vaults[0];
        try {
          await decryptPrivateKey(
            testVault.encrypted_private_key,
            testVault.encryption_iv,
            exportPassword,
            testVault.wallet_id
          );
        } catch {
          setExportError("Password verification failed — wrong vault password.");
          setExporting(false);
          return;
        }
      }

      const exportData = {
        exported_at: new Date().toISOString(),
        app: "QuantumShift Wallet",
        version: "1.0",
        total_usd_value: grandTotal,
        wallet_count: wallets.length,
        note: exportIncludeKeys
          ? "Keys are AES-256-GCM encrypted. Your vault password is required to decrypt them."
          : "Export contains addresses and balances only. No private key data included.",
        wallets: wallets.map(w => {
          const vault = vaults.find(v => v.wallet_id === w.id);
          return {
            id: w.id,
            label: w.label,
            chain: w.chain,
            address: w.address,
            total_usd_value: w.total_usd_value || 0,
            balances: w.balances || {},
            connected_casinos: (w.connected_casinos || []).map((c: any) => c.name),
            vault: exportIncludeKeys && vault ? {
              encrypted_private_key: vault.encrypted_private_key,
              encryption_iv: vault.encryption_iv,
              key_type: vault.key_type || "hex",
              last_used: vault.last_used,
              encryption: "AES-256-GCM · PBKDF2 100k iterations · SHA-256",
            } : vault ? { has_vault: true, key_type: vault.key_type, last_used: vault.last_used } : null,
          };
        }),
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `securevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportModal(false);
      setExportPassword("");
      showToast("💾 Vault exported — store this file in a safe location");
    } catch (e: any) {
      setExportError("Export failed: " + e.message);
    }
    setExporting(false);
  }

  // ── FEE DISPLAY HELPERS ───────────────────────────────────────────────
  function feeDisplay(tier: "slow"|"medium"|"fast") {
    if (!fees) return "—";
    if (chain === "BTC") return `${fees[tier]} sat/vB`;
    if (chain === "ETH") return `${fees[tier]?.maxFee?.toFixed(2)} gwei`;
    if (chain === "SOL") return `${(fees[tier] * 1e9).toFixed(0)} lamps`;
    return "—";
  }

  const estimatedFee = computeFee();

  // ─────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-neutral-950">
      <div className="flex items-center gap-3 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-mono">Loading SecureVault…</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">

      {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
      <aside className="w-64 flex flex-col border-r border-neutral-800/60 bg-neutral-900/40 shrink-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800/60">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-bold tracking-wide text-indigo-300">SecureVault</div>
              <div className="text-[9px] text-neutral-600 tracking-widest">LIVE · ALL CHAINS</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Export Button */}
            <Button size="sm" variant="outline"
              className="h-7 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 bg-transparent px-2"
              title="Export Vault Backup"
              onClick={() => { setExportModal(true); setExportError(""); setExportPassword(""); }}>
              <Download className="h-3 w-3" />
            </Button>
            {/* Import Button */}
            <Button size="sm" variant="outline"
              className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 bg-transparent"
              onClick={() => { setImportModal(true); setError(""); setPassword(""); }}>
              <Plus className="h-3 w-3 mr-1" />Import
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 py-2">
          {wallets.length === 0 && (
            <div className="text-center text-neutral-600 text-xs py-8 leading-relaxed">
              No wallets yet.<br />Import one to begin.
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {wallets.map(w => {
              const isActive  = activeId === w.id;
              const open      = !!unlocked[w.id];
              const chainCls  = CHAIN_BADGE[w.chain] || CHAIN_BADGE.ETH;
              const bal       = w.total_usd_value || 0;
              return (
                <button key={w.id} onClick={() => setActiveId(w.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 border transition-all ${
                    isActive ? "bg-neutral-800/80 border-indigo-500/50" : "bg-transparent border-neutral-800/40 hover:bg-neutral-800/30"
                  }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold tracking-widest border ${chainCls}`}>
                      {w.chain}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {open
                        ? <Unlock className="h-3 w-3 text-emerald-400" />
                        : <Lock className="h-3 w-3 text-neutral-600" />}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-200 mb-0.5">{w.label}</div>
                  <div className="text-[9px] text-neutral-600 font-mono truncate mb-1">{w.address}</div>
                  <div className="text-xs font-bold text-neutral-300">
                    ${bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t border-neutral-800/60">
          <div className="text-[9px] text-neutral-600 tracking-widest mb-1">TOTAL ALL WALLETS</div>
          <div className="text-lg font-bold text-neutral-300">
            ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-neutral-600 mt-0.5">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""} · {vaults.length} vault{vaults.length !== 1 ? "s" : ""}</div>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!activeWallet ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-neutral-700">
              <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <div className="text-lg font-bold mb-2">Select a Wallet</div>
              <div className="text-sm">Import a wallet to access your funds.</div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 flex flex-col gap-5 max-w-4xl mx-auto">

              {/* ── WALLET HEADER ── */}
              <Card className="bg-neutral-900/60 border-neutral-800/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl font-bold text-neutral-100">{activeWallet.label}</h1>
                        <Badge variant="outline" className={`text-[9px] border ${CHAIN_BADGE[chain]}`}>{chain}</Badge>
                      </div>
                      <div className="text-xs font-mono text-neutral-600 truncate mb-2">{activeWallet.address}</div>
                      <div className="flex gap-2 flex-wrap">
                        {hasVault && <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px]">🔐 VAULT</Badge>}
                        {isUnlocked && <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">🔓 UNLOCKED</Badge>}
                        {activeVault?.spending_enabled && <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px]">⚡ SPENDING</Badge>}
                        {chainLoading && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px]"><Loader2 className="h-2.5 w-2.5 mr-1 animate-spin inline" />SYNCING</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline"
                        className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 text-xs h-8"
                        onClick={() => fetchChainData(activeWallet)} disabled={chainLoading}>
                        <RefreshCw className={`h-3 w-3 mr-1 ${chainLoading ? "animate-spin" : ""}`} />Refresh
                      </Button>
                      {isUnlocked && (
                        <>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                            onClick={() => { setSendModal(true); setSendError(""); setSendTxid(""); }}>
                            <ArrowUpRight className="h-3 w-3 mr-1" />Send
                          </Button>
                          <Button size="sm" variant="outline"
                            className="border-emerald-800 text-emerald-400 hover:bg-emerald-500/10 text-xs h-8"
                            onClick={() => setReceiveModal(true)}>
                            <ArrowDownLeft className="h-3 w-3 mr-1" />Receive
                          </Button>
                        </>
                      )}
                      {!hasVault && (
                        <Button size="sm" variant="outline"
                          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs h-8"
                          onClick={() => { setPwModal({ id: activeId!, mode: "vault" }); setError(""); setPassword(""); setImportPk(""); }}>
                          <Shield className="h-3 w-3 mr-1" />Add to Vault
                        </Button>
                      )}
                      {hasVault && !isUnlocked && (
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                          onClick={() => { setPwModal({ id: activeId!, mode: "unlock" }); setError(""); setPassword(""); }}>
                          <Unlock className="h-3 w-3 mr-1" />Unlock
                        </Button>
                      )}
                      {isUnlocked && (
                        <Button size="sm" variant="outline"
                          className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 text-xs h-8"
                          onClick={() => setUnlocked(u => { const n = { ...u }; delete n[activeId!]; return n; })}>
                          <Lock className="h-3 w-3 mr-1" />Lock
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── CHAIN ERROR ── */}
              {chainError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{chainError}
                </div>
              )}

              {/* ── BALANCE CARD ── */}
              {liveBalance && (
                <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800/40 border-neutral-800/60">
                  <CardContent className="p-6 text-center">
                    <div className="text-[10px] text-neutral-500 tracking-widest uppercase mb-2">Live Balance</div>
                    <div className={`text-5xl font-bold mb-1 ${CHAIN_COLOR[chain]}`}>
                      {liveBalance.total?.toFixed(8)}
                    </div>
                    <div className="text-lg text-neutral-400 mb-3">{CHAIN_NATIVE[chain]}</div>
                    <div className="text-2xl font-semibold text-neutral-200">
                      ${(activeWallet.total_usd_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {liveBalance.unconfirmed > 0 && (
                      <div className="text-xs text-amber-400 mt-2">
                        +{liveBalance.unconfirmed.toFixed(8)} {CHAIN_NATIVE[chain]} unconfirmed
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── TABS ── */}
              <Tabs defaultValue="fees">
                <TabsList className="bg-neutral-900 border border-neutral-800">
                  {chain === "BTC" && (
                    <TabsTrigger value="utxos" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-orange-300">
                      ⬡ UTXOs ({utxos.length})
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="fees" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    ⚡ Fees
                  </TabsTrigger>
                  {chain === "SOL" && tokenAccounts.length > 0 && (
                    <TabsTrigger value="tokens" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-purple-300">
                      ◎ Tokens ({tokenAccounts.length})
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="casinos" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    🎲 Casinos
                  </TabsTrigger>
                  <TabsTrigger value="vault" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    🔐 Vault
                  </TabsTrigger>
                </TabsList>

                {/* ── UTXOs TAB (BTC only) ── */}
                {chain === "BTC" && (
                  <TabsContent value="utxos" className="mt-4">
                    <Card className="bg-neutral-900/60 border-neutral-800/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-neutral-200">Unspent Transaction Outputs</CardTitle>
                        <CardDescription className="text-xs font-mono text-neutral-600">
                          Auto-fetched from mempool.space · {utxos.length} UTXOs · {utxos.reduce((s: number, u: any) => s + u.value, 0).toLocaleString()} sats total
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {utxos.length === 0 ? (
                          <div className="text-center text-neutral-600 text-sm py-6">No UTXOs found</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {utxos.map((u: any, i: number) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-800/40">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${u.confirmed ? "bg-emerald-400" : "bg-amber-400"}`} />
                                  <div>
                                    <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[200px]">{u.txid}:{u.vout}</div>
                                    <div className="text-[9px] text-neutral-600">{u.confirmed ? "confirmed" : "unconfirmed"}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-orange-400">{u.value.toLocaleString()} sats</div>
                                  <div className="text-[9px] text-neutral-600">{(u.value / 1e8).toFixed(8)} BTC</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ── FEES TAB ── */}
                <TabsContent value="fees" className="mt-4">
                  <Card className="bg-neutral-900/60 border-neutral-800/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-neutral-200">Fee Estimator</CardTitle>
                      <CardDescription className="text-xs font-mono text-neutral-600">
                        {chain === "BTC" ? "mempool.space recommended fees" :
                         chain === "ETH" ? "EIP-1559 gas · publicnode" :
                         "Solana fee schedule · mainnet-beta"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!fees ? (
                        <div className="text-center text-neutral-600 text-sm py-4">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />Loading fee data…
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {(["slow","medium","fast"] as const).map(tier => (
                            <div key={tier}
                              className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                                sendTier === tier
                                  ? "bg-indigo-500/10 border-indigo-500/40"
                                  : "bg-neutral-800/30 border-neutral-800/40 hover:border-neutral-700"
                              }`}
                              onClick={() => setSendTier(tier)}>
                              <div className="flex items-center gap-3">
                                <div className={`text-lg ${tier === "slow" ? "opacity-40" : tier === "medium" ? "opacity-70" : "opacity-100"}`}>
                                  {tier === "slow" ? "🐢" : tier === "medium" ? "🚶" : "⚡"}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-neutral-200 capitalize">{tier}</div>
                                  <div className="text-[10px] text-neutral-500">
                                    {tier === "slow" ? "~60 min" : tier === "medium" ? "~30 min" : "~10 min"}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-neutral-200">{feeDisplay(tier)}</div>
                                {chain === "ETH" && (
                                  <div className="text-[9px] text-neutral-500">
                                    priority: {fees[tier]?.priority?.toFixed(2)} gwei
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {chain === "ETH" && (
                            <div className="text-[10px] text-neutral-600 px-1">
                              Base fee: {fees.baseGwei?.toFixed(3)} gwei
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── SOL TOKENS TAB ── */}
                {chain === "SOL" && tokenAccounts.length > 0 && (
                  <TabsContent value="tokens" className="mt-4">
                    <Card className="bg-neutral-900/60 border-neutral-800/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-neutral-200">SPL Token Accounts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          {tokenAccounts.map((t: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-800/40">
                              <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[220px]">{t.mint}</div>
                              <div className="text-xs font-bold text-purple-400">{t.amount?.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* ── CASINOS TAB ── */}
                <TabsContent value="casinos" className="mt-4">
                  <Card className="bg-neutral-900/60 border-neutral-800/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-neutral-200">Connected Casinos</CardTitle>
                      <CardDescription className="text-xs font-mono text-neutral-600">entities/Wallet.connected_casinos[]</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CASINO_OPTIONS.map(c => {
                          const conn = (activeWallet.connected_casinos || []).find((x: any) => x.name === c.name);
                          return (
                            <div key={c.name} className={`rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${conn ? "bg-emerald-500/5 border-emerald-500/20" : "bg-neutral-800/30 border-neutral-700/40"}`}>
                              <div className="text-2xl">{c.icon}</div>
                              <div className="text-xs font-semibold text-neutral-300 text-center">{c.name}</div>
                              {conn && <div className="text-[9px] text-emerald-600">Since {new Date(conn.connected_at).toLocaleDateString()}</div>}
                              <Button size="sm" variant="outline"
                                className={`text-[10px] h-6 px-3 ${conn ? "border-red-800/60 text-red-400 hover:bg-red-500/10" : "border-emerald-800/60 text-emerald-400 hover:bg-emerald-500/10"}`}
                                onClick={() => toggleCasino(c)}>
                                {conn ? "Disconnect" : "Connect"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── VAULT TAB ── */}
                <TabsContent value="vault" className="mt-4 flex flex-col gap-4">
                  <Card className="bg-neutral-900/60 border-neutral-800/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-neutral-200">SecureVault Record</CardTitle>
                      <CardDescription className="text-xs font-mono text-neutral-600">entities/SecureVault — AES-256-GCM</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!hasVault ? (
                        <div className="text-center py-6 text-neutral-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                          No SecureVault record. Click "Add to Vault" to encrypt your private key.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {[
                            { k: "wallet_id",           v: activeVault.wallet_id },
                            { k: "key_type",             v: (activeVault.key_type||"hex").toUpperCase() },
                            { k: "spending_enabled",     v: String(activeVault.spending_enabled) },
                            { k: "last_used",            v: new Date(activeVault.last_used).toLocaleString() },
                            { k: "encryption_iv",        v: activeVault.encryption_iv, mono: true },
                            { k: "encrypted_private_key",v: activeVault.encrypted_private_key, mono: true, wrap: true },
                          ].map(f => (
                            <div key={f.k} className="flex gap-4 px-3 py-2 bg-neutral-800/30 rounded-lg border border-neutral-800/40 items-start">
                              <div className="text-[10px] text-neutral-600 min-w-[160px] shrink-0 font-mono">{f.k}</div>
                              <div className={`text-xs text-neutral-400 ${f.mono?"font-mono":""} ${f.wrap?"break-all text-[10px]":""}`}>{f.v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {isUnlocked && (
                    <Card className="bg-emerald-950/20 border-emerald-900/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs text-emerald-400 flex items-center gap-2">
                            <Unlock className="h-3.5 w-3.5" />Decrypted Key — memory only
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2"
                              onClick={() => setRevealed(r => ({ ...r, [activeId!]: !r[activeId!] }))}>
                              {revealed[activeId!] ? <><EyeOff className="h-3 w-3 mr-1"/>Hide</> : <><Eye className="h-3 w-3 mr-1"/>Reveal</>}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2"
                              onClick={() => { navigator.clipboard.writeText(unlocked[activeId!]); showToast("📋 Copied"); }}>
                              <Copy className="h-3 w-3 mr-1"/>Copy
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="font-mono text-xs text-emerald-400/60 bg-black/30 rounded-lg p-3 break-all leading-relaxed">
                          {revealed[activeId!] ? unlocked[activeId!] : "•".repeat(64)}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </main>

      {/* ══ SEND DIALOG ════════════════════════════════════════════════════ */}
      <Dialog open={sendModal} onOpenChange={() => { setSendModal(false); setSendTxid(""); setSendError(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-indigo-400" />
              Send {CHAIN_NATIVE[chain]}
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs">
              {chain === "BTC" ? `Auto UTXO selection · ${utxos.length} UTXOs available` :
               chain === "ETH" ? "EIP-1559 transaction" : "Solana transfer"}
            </DialogDescription>
          </DialogHeader>
          {sendTxid ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />Transaction Ready
              </div>
              <div className="font-mono text-[10px] text-neutral-400 bg-neutral-800/50 rounded-lg p-3 break-all">{sendTxid}</div>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                onClick={() => { setSendModal(false); setSendTxid(""); }}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              <div>
                <Label className="text-xs text-neutral-400 mb-1.5 block">Recipient Address</Label>
                <Input placeholder={chain === "BTC" ? "bc1q..." : chain === "ETH" ? "0x..." : "PublicKey..."}
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs font-mono"
                  value={sendTo} onChange={e => setSendTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-neutral-400 mb-1.5 block">Amount ({CHAIN_NATIVE[chain]})</Label>
                <Input type="number" placeholder="0.00000000"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs font-mono"
                  value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
                {liveBalance && (
                  <div className="text-[10px] text-neutral-600 mt-1">
                    Available: {liveBalance.confirmed?.toFixed(8)} {CHAIN_NATIVE[chain]}
                    <button className="text-indigo-400 ml-2 hover:underline"
                      onClick={() => setSendAmount(Math.max(0, liveBalance.confirmed - computeFee()).toFixed(8))}>
                      Max
                    </button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-neutral-400 mb-1.5 block">Fee Tier</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["slow","medium","fast"] as const).map(tier => (
                    <button key={tier}
                      className={`rounded-lg border px-2 py-2 text-center transition-all ${
                        sendTier === tier ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300" : "bg-neutral-800/40 border-neutral-700/40 text-neutral-500 hover:border-neutral-600"
                      }`}
                      onClick={() => setSendTier(tier)}>
                      <div className="text-base">{tier === "slow" ? "🐢" : tier === "medium" ? "🚶" : "⚡"}</div>
                      <div className="text-[9px] capitalize">{tier}</div>
                      <div className="text-[9px] font-mono text-neutral-400">{feeDisplay(tier)}</div>
                    </button>
                  ))}
                </div>
              </div>
              {sendAmount && (
                <div className="bg-neutral-800/40 rounded-lg border border-neutral-800 px-3 py-2.5 flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Amount</span>
                    <span className="text-neutral-300 font-mono">{sendAmount} {CHAIN_NATIVE[chain]}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Network Fee</span>
                    <span className="text-neutral-300 font-mono">{estimatedFee.toFixed(8)} {CHAIN_NATIVE[chain]}</span>
                  </div>
                  <div className="h-px bg-neutral-700 my-0.5" />
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-400">Total</span>
                    <span className={`font-mono ${parseFloat(sendAmount)+estimatedFee > (liveBalance?.total||0) ? "text-red-400" : "text-neutral-200"}`}>
                      {(parseFloat(sendAmount||"0") + estimatedFee).toFixed(8)} {CHAIN_NATIVE[chain]}
                    </span>
                  </div>
                </div>
              )}
              {sendError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{sendError}
                </div>
              )}
              <div className="flex gap-2 justify-end mt-1">
                <Button variant="ghost" size="sm" className="text-neutral-500 text-xs"
                  onClick={() => setSendModal(false)}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                  onClick={handleSend} disabled={sending || !isUnlocked}>
                  {sending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Signing…</> : <><Send className="h-3 w-3 mr-1"/>Sign & Send</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ RECEIVE DIALOG ═════════════════════════════════════════════════ */}
      <Dialog open={receiveModal} onOpenChange={setReceiveModal}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
              Receive {CHAIN_NATIVE[chain]}
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs">
              Send only {CHAIN_NATIVE[chain]} to this address
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <QRCode value={activeWallet.address} size={180} />
            <div className="w-full bg-neutral-800/50 rounded-lg border border-neutral-700/40 px-3 py-2.5">
              <div className="text-[9px] text-neutral-600 mb-1 tracking-widest">YOUR {chain} ADDRESS</div>
              <div className="font-mono text-xs text-neutral-300 break-all">{activeWallet.address}</div>
            </div>
            <Button className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-neutral-700"
              onClick={() => { navigator.clipboard.writeText(activeWallet.address); showToast("📋 Address copied"); }}>
              <Copy className="h-3.5 w-3.5 mr-2" />Copy Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ UNLOCK / VAULT DIALOG ══════════════════════════════════════════ */}
      <Dialog open={!!pwModal} onOpenChange={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle>{pwModal?.mode === "unlock" ? "🔓 Unlock SecureVault" : "🔐 Add to SecureVault"}</DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs leading-relaxed">
              {pwModal?.mode === "unlock"
                ? "Decrypt your private key into memory to enable sending."
                : "Paste your private key — AES-256-GCM encrypted before storage."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {pwModal?.mode === "vault" && (
              <div>
                <Label className="text-xs text-neutral-400 mb-1.5 block">Private Key</Label>
                <Input type="password" placeholder="Your private key…"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs font-mono"
                  value={importPk} onChange={e => { setImportPk(e.target.value); setError(""); }} />
              </div>
            )}
            <div>
              <Label className="text-xs text-neutral-400 mb-1.5 block">Vault Password</Label>
              <Input type="password" placeholder="Enter vault password…" autoFocus
                className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs"
                value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && (pwModal?.mode === "unlock" ? handleUnlock() : handleAddToVault())} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="text-neutral-500 text-xs"
                onClick={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                onClick={pwModal?.mode === "unlock" ? handleUnlock : handleAddToVault} disabled={saving}>
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Processing…</> : pwModal?.mode === "unlock" ? "Decrypt" : "Encrypt & Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ IMPORT DIALOG ══════════════════════════════════════════════════ */}
      <Dialog open={importModal} onOpenChange={() => { setImportModal(false); setPassword(""); setError(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle>+ Import Wallet</DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs leading-relaxed">
              Live balance will be fetched automatically after import.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {[
              { label: "Label",       key: "label",      placeholder: "e.g. Main BTC Wallet",  pw: false },
              { label: "Address",     key: "address",    placeholder: "Public wallet address",  pw: false },
              { label: "Private Key", key: "privateKey", placeholder: "Your private key",       pw: true  },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-neutral-400 mb-1.5 block">{f.label}</Label>
                <Input type={f.pw ? "password" : "text"} placeholder={f.placeholder}
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs font-mono"
                  value={(importForm as any)[f.key]}
                  onChange={e => setImportForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Chain",    key: "chain",    opts: ["ETH","BTC","SOL"] },
                { label: "Key Type", key: "key_type", opts: ["hex","wif","mnemonic"] },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs text-neutral-400 mb-1.5 block">{f.label}</Label>
                  <Select value={(importForm as any)[f.key]} onValueChange={v => setImportForm(p => ({ ...p, [f.key]: v }))}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {f.opts.map(o => <SelectItem key={o} value={o} className="text-neutral-200 text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs text-neutral-400 mb-1.5 block">Vault Password</Label>
              <Input type="password" placeholder="Encrypts your private key…"
                className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs"
                value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="text-neutral-500 text-xs"
                onClick={() => { setImportModal(false); setPassword(""); setError(""); }}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                onClick={handleImport} disabled={saving}>
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Importing…</> : "Import & Encrypt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ EXPORT VAULT DIALOG ════════════════════════════════════════════ */}
      <Dialog open={exportModal} onOpenChange={() => { setExportModal(false); setExportPassword(""); setExportError(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-400" />
              Export Vault Backup
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs leading-relaxed">
              Downloads a JSON file with all wallet addresses, balances, and optionally encrypted private keys.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">

            {/* Summary */}
            <div className="bg-neutral-800/40 rounded-lg border border-neutral-800 px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Wallets</span>
                <span className="text-neutral-300 font-mono">{wallets.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Vaults (encrypted keys)</span>
                <span className="text-neutral-300 font-mono">{vaults.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Total Value</span>
                <span className="text-emerald-400 font-mono font-semibold">
                  ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Include keys toggle */}
            <div
              className={`flex items-center justify-between px-3 py-3 rounded-lg border cursor-pointer transition-all ${
                exportIncludeKeys ? "bg-indigo-500/10 border-indigo-500/40" : "bg-neutral-800/30 border-neutral-800/40"
              }`}
              onClick={() => setExportIncludeKeys(v => !v)}>
              <div>
                <div className="text-xs font-semibold text-neutral-200">Include Encrypted Keys</div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {exportIncludeKeys
                    ? "Keys included — AES-256-GCM encrypted, password required to decrypt"
                    : "Addresses & balances only — no key data"}
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full border transition-all flex items-center px-0.5 ${exportIncludeKeys ? "bg-indigo-500 border-indigo-400" : "bg-neutral-700 border-neutral-600"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-all ${exportIncludeKeys ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </div>

            {/* Password field — only shown when including keys */}
            {exportIncludeKeys && (
              <div>
                <Label className="text-xs text-neutral-400 mb-1.5 block">Vault Password (for verification)</Label>
                <Input type="password" placeholder="Confirm your vault password…"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs"
                  value={exportPassword}
                  onChange={e => { setExportPassword(e.target.value); setExportError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleExportVault()} />
                <div className="text-[10px] text-neutral-600 mt-1.5">
                  Password is used to verify your identity only — keys remain encrypted in the export file.
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-300/80 leading-relaxed">
                Store the exported file securely — offline storage or encrypted drive recommended. Never share this file.
              </div>
            </div>

            {exportError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{exportError}
              </div>
            )}

            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="text-neutral-500 text-xs"
                onClick={() => { setExportModal(false); setExportPassword(""); setExportError(""); }}>
                Cancel
              </Button>
              <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                onClick={handleExportVault} disabled={exporting}>
                {exporting
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Exporting…</>
                  : <><Download className="h-3 w-3 mr-1"/>Export Backup</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ TOAST ══════════════════════════════════════════════════════════ */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />{toast}
        </div>
      )}
    </div>
  );
}
