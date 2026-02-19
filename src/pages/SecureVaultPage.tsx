import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Unlock, Wallet as WalletIcon, Shield, Zap, Plus, Eye, EyeOff, Copy, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// ── AES-256-GCM via Web Crypto API ────────────────────────────────────────────
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
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(raw)
  );
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

// ── Static token data (replace with live API when ready) ──────────────────────
const TOKEN_DISPLAY: Record<string, any[]> = {
  ETH: [
    { symbol: "ETH",  name: "Ethereum",  balance: 2.4817,  price: 3241.50, icon: "Ξ",  color: "text-blue-400",  bg: "bg-blue-400/10 border-blue-400/20" },
    { symbol: "USDC", name: "USD Coin",  balance: 1480.00, price: 1.00,   icon: "$",  color: "text-cyan-400",  bg: "bg-cyan-400/10 border-cyan-400/20" },
    { symbol: "LINK", name: "Chainlink", balance: 34.5,    price: 14.82,  icon: "⬡",  color: "text-blue-500",  bg: "bg-blue-500/10 border-blue-500/20" },
    { symbol: "UNI",  name: "Uniswap",   balance: 12.0,    price: 9.43,   icon: "🦄", color: "text-pink-400",  bg: "bg-pink-400/10 border-pink-400/20" },
  ],
  BTC: [
    { symbol: "BTC",  name: "Bitcoin",   balance: 0.08124, price: 67120.00, icon: "₿", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
    { symbol: "RUNE", name: "THORChain", balance: 200.0,   price: 5.12,   icon: "ᚱ",  color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  ],
  SOL: [
    { symbol: "SOL",  name: "Solana",    balance: 18.32,   price: 172.40, icon: "◎",  color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
    { symbol: "BONK", name: "Bonk",      balance: 1200000, price: 0.000028, icon: "🐶", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
    { symbol: "JUP",  name: "Jupiter",   balance: 450.0,   price: 0.91,   icon: "♃",  color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20" },
  ],
};

const CHAIN_BADGE: Record<string, string> = {
  ETH: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BTC: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const CASINO_OPTIONS = [
  { name: "Stake.com", icon: "♠" },
  { name: "Rollbit",   icon: "🎲" },
  { name: "BC.Game",   icon: "⚡" },
  { name: "Roobet",    icon: "🦘" },
  { name: "Cloudbet",  icon: "☁"  },
];

function buildBalances(chain: string) {
  const tokens = TOKEN_DISPLAY[chain] || [];
  const balances: Record<string, any> = {};
  let total = 0;
  tokens.forEach(t => {
    balances[t.symbol] = { amount: t.balance, usd_value: +(t.balance * t.price).toFixed(2), price: t.price };
    total += t.balance * t.price;
  });
  return { balances, total_usd_value: +total.toFixed(2) };
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SecureVaultPage() {
  const [wallets, setWallets]     = useState<any[]>([]);
  const [vaults, setVaults]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [unlocked, setUnlocked]   = useState<Record<string, string>>({});
  const [revealed, setRevealed]   = useState<Record<string, boolean>>({});

  // Modal state
  const [pwModal, setPwModal]         = useState<{ id: string; mode: "unlock" | "vault" } | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importPk, setImportPk]       = useState("");
  const [password, setPassword]       = useState("");
  const [importForm, setImportForm]   = useState({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState("");

  // ── Load from Base44 entities ─────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [walletRecords, vaultRecords] = await Promise.all([
        Wallet.list(),
        SecureVault.list(),
      ]);
      setWallets(walletRecords);
      setVaults(vaultRecords);
      if (walletRecords.length > 0) setActiveId(walletRecords[0].id);
    } catch (e: any) {
      showToast("Failed to load: " + e.message);
    }
    setLoading(false);
  }

  const activeWallet = wallets.find(w => w.id === activeId);
  const activeVault  = vaults.find(v => v.wallet_id === activeId);
  const isActivated  = activeWallet?.balances && Object.keys(activeWallet.balances).length > 0;
  const isUnlocked   = !!unlocked[activeId ?? ""];
  const hasVault     = !!activeVault;
  const activeChain  = activeWallet?.chain || "ETH";

  const activeTokens = isActivated
    ? Object.entries(activeWallet.balances).map(([sym, b]: [string, any]) => ({
        symbol: sym, ...b,
        ...(TOKEN_DISPLAY[activeChain]?.find((t: any) => t.symbol === sym) || {}),
      }))
    : [];

  const grandTotal = wallets.reduce((s, w) => s + (w.total_usd_value || 0), 0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Activate wallet — writes balances to entities/Wallet ──────────────────
  async function activateWallet(w: any) {
    try {
      const { balances, total_usd_value } = buildBalances(w.chain);
      const updated = await Wallet.update(w.id, { balances, total_usd_value });
      setWallets(prev => prev.map(x => x.id === w.id ? { ...x, ...updated } : x));
      showToast("✅ Wallet activated — balances loaded");
    } catch (e: any) {
      showToast("Activation failed: " + e.message);
    }
  }

  const selectWallet = useCallback(async (w: any) => {
    setActiveId(w.id);
    setError("");
    if (!w.balances || Object.keys(w.balances).length === 0) await activateWallet(w);
  }, [wallets]);

  // ── Unlock SecureVault ────────────────────────────────────────────────────
  async function handleUnlock() {
    if (!password.trim()) return setError("Enter vault password.");
    setSaving(true); setError("");
    try {
      const raw = await decryptPrivateKey(
        activeVault.encrypted_private_key,
        activeVault.encryption_iv,
        password,
        activeVault.wallet_id
      );
      setUnlocked(u => ({ ...u, [activeId!]: raw }));
      const updated = await SecureVault.update(activeVault.id, { last_used: new Date().toISOString() });
      setVaults(prev => prev.map(v => v.id === activeVault.id ? { ...v, ...updated } : v));
      setPwModal(null); setPassword("");
      showToast("🔓 Vault decrypted successfully");
    } catch {
      setError("Decryption failed — wrong password?");
    }
    setSaving(false);
  }

  // ── Add to SecureVault ────────────────────────────────────────────────────
  async function handleAddToVault() {
    if (!importPk.trim() || !password.trim()) return setError("Private key + password required.");
    setSaving(true); setError("");
    try {
      const { encrypted_private_key, encryption_iv } = await encryptPrivateKey(importPk, password, activeId!);
      const newVault = await SecureVault.create({
        user_id: "current",
        wallet_id: activeId,
        encrypted_private_key,
        encryption_iv,
        key_type: activeWallet?.key_type || "hex",
        spending_enabled: false,
        last_used: new Date().toISOString(),
      });
      setVaults(prev => [...prev, newVault]);
      setUnlocked(u => ({ ...u, [activeId!]: importPk }));
      setPwModal(null); setPassword(""); setImportPk("");
      showToast("🔐 Private key encrypted into SecureVault");
    } catch (e: any) {
      setError("Failed: " + e.message);
    }
    setSaving(false);
  }

  // ── Import new wallet ─────────────────────────────────────────────────────
  async function handleImport() {
    const { label, chain, address, privateKey, key_type } = importForm;
    if (!label || !address || !privateKey || !password.trim())
      return setError("All fields + vault password required.");
    setSaving(true); setError("");
    try {
      const tempId = `temp_${Date.now()}`;
      const { encrypted_private_key, encryption_iv } = await encryptPrivateKey(privateKey, password, tempId);
      const { balances, total_usd_value } = buildBalances(chain);

      const newWallet = await Wallet.create({
        user_id: "current",
        label, chain, address, balances, total_usd_value, connected_casinos: [],
      });
      const newVault = await SecureVault.create({
        user_id: "current",
        wallet_id: newWallet.id,
        encrypted_private_key, encryption_iv, key_type,
        spending_enabled: false,
        last_used: new Date().toISOString(),
      });

      setWallets(prev => [...prev, newWallet]);
      setVaults(prev => [...prev, newVault]);
      setUnlocked(u => ({ ...u, [newWallet.id]: privateKey }));
      setActiveId(newWallet.id);
      setImportModal(false);
      setPassword("");
      setImportForm({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
      showToast("✅ Wallet imported, encrypted & activated");
    } catch (e: any) {
      setError("Import failed: " + e.message);
    }
    setSaving(false);
  }

  // ── Toggle spending ───────────────────────────────────────────────────────
  async function toggleSpending() {
    if (!activeVault) return;
    try {
      const updated = await SecureVault.update(activeVault.id, {
        spending_enabled: !activeVault.spending_enabled
      });
      setVaults(prev => prev.map(v => v.id === activeVault.id ? { ...v, ...updated } : v));
      showToast(updated.spending_enabled ? "⚡ Spending enabled" : "🔒 Spending disabled");
    } catch (e: any) { showToast("Failed: " + e.message); }
  }

  // ── Toggle casino ─────────────────────────────────────────────────────────
  async function toggleCasino(casino: { name: string; icon: string }) {
    if (!activeWallet) return;
    const existing = activeWallet.connected_casinos || [];
    const idx = existing.findIndex((c: any) => c.name === casino.name);
    const updated_casinos = idx >= 0
      ? existing.filter((_: any, i: number) => i !== idx)
      : [...existing, { name: casino.name, connected_at: new Date().toISOString(), status: "active" }];
    try {
      const updated = await Wallet.update(activeId!, { connected_casinos: updated_casinos });
      setWallets(prev => prev.map(w => w.id === activeId ? { ...w, ...updated } : w));
      showToast(idx >= 0 ? `⛔ Disconnected ${casino.name}` : `✅ Connected ${casino.name}`);
    } catch (e: any) { showToast("Failed: " + e.message); }
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-mono">Loading wallets from Base44…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-64 flex flex-col border-r border-neutral-800/60 bg-neutral-900/50 shrink-0">
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800/60">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <div>
              <div className="text-sm font-bold tracking-wide text-indigo-300">SecureVault</div>
              <div className="text-[9px] text-neutral-600 tracking-widest">entities/Wallet</div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 bg-transparent"
            onClick={() => { setImportModal(true); setError(""); setPassword(""); }}
          >
            <Plus className="h-3 w-3 mr-1" /> Import
          </Button>
        </div>

        {/* Wallet list */}
        <ScrollArea className="flex-1 px-2 py-2">
          {wallets.length === 0 && (
            <div className="text-center text-neutral-600 text-xs py-8 leading-relaxed px-4">
              No wallets yet.<br />Import one to begin.
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {wallets.map(w => {
              const isActive   = activeId === w.id;
              const activated  = w.balances && Object.keys(w.balances).length > 0;
              const open       = !!unlocked[w.id];
              const chainClass = CHAIN_BADGE[w.chain] || CHAIN_BADGE.ETH;
              return (
                <button
                  key={w.id}
                  onClick={() => selectWallet(w)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 border transition-all duration-150 ${
                    isActive
                      ? "bg-neutral-800/80 border-indigo-500/50"
                      : "bg-transparent border-neutral-800/40 hover:bg-neutral-800/30 hover:border-neutral-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-bold tracking-widest border ${chainClass}`}>
                      {w.chain}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {activated
                        ? <span className="text-[8px] text-emerald-400 tracking-widest">● LIVE</span>
                        : <span className="text-[8px] text-neutral-600 tracking-widest">○ IDLE</span>}
                      {open
                        ? <Unlock className="h-3 w-3 text-emerald-400" />
                        : <Lock className="h-3 w-3 text-neutral-600" />}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-neutral-200 mb-0.5">{w.label}</div>
                  <div className="text-[9px] text-neutral-600 font-mono truncate">{w.address}</div>
                  {activated && (
                    <div className="text-xs text-neutral-400 font-semibold mt-1.5">
                      ${(w.total_usd_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Grand total */}
        <div className="px-4 py-3 border-t border-neutral-800/60">
          <div className="text-[9px] text-neutral-600 tracking-widest mb-1">ALL WALLETS</div>
          <div className="text-lg font-bold text-neutral-300">
            ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!activeWallet ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-neutral-700">
              <WalletIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <div className="text-lg font-bold mb-2">Select a Wallet</div>
              <div className="text-sm">Choose from the sidebar or import a new one.</div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 flex flex-col gap-5 max-w-4xl">

              {/* Wallet header */}
              <Card className="bg-neutral-900/60 border-neutral-800/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="text-xl font-bold text-neutral-100 mb-1">
                        {activeWallet.label || activeWallet.address}
                      </h1>
                      <div className="text-xs font-mono text-neutral-600 mb-3">{activeWallet.address}</div>
                      <div className="flex gap-2 flex-wrap">
                        {isActivated
                          ? <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] tracking-widest">● ACTIVATED</Badge>
                          : <Badge className="bg-neutral-800 text-neutral-500 border border-neutral-700 text-[9px] tracking-widest">○ NOT ACTIVATED</Badge>}
                        {hasVault && <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px]">🔐 VAULT</Badge>}
                        {activeVault?.spending_enabled && <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px]">⚡ SPENDING ON</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!isActivated && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                          onClick={() => activateWallet(activeWallet)}>
                          ▶ Activate Wallet
                        </Button>
                      )}
                      {!hasVault && (
                        <Button size="sm" variant="outline"
                          className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs"
                          onClick={() => { setPwModal({ id: activeId!, mode: "vault" }); setError(""); setPassword(""); setImportPk(""); }}>
                          <Shield className="h-3 w-3 mr-1" /> Add to Vault
                        </Button>
                      )}
                      {hasVault && !isUnlocked && (
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                          onClick={() => { setPwModal({ id: activeId!, mode: "unlock" }); setError(""); setPassword(""); }}>
                          <Unlock className="h-3 w-3 mr-1" /> Unlock
                        </Button>
                      )}
                      {hasVault && isUnlocked && (
                        <>
                          <Button size="sm" variant="outline"
                            className="border-emerald-800 text-emerald-400 hover:bg-emerald-500/10 text-xs"
                            onClick={() => setUnlocked(u => { const n = { ...u }; delete n[activeId!]; return n; })}>
                            <Lock className="h-3 w-3 mr-1" /> Lock
                          </Button>
                          <Button size="sm" variant="outline"
                            className="border-amber-800 text-amber-400 hover:bg-amber-500/10 text-xs"
                            onClick={toggleSpending}>
                            <Zap className="h-3 w-3 mr-1" />
                            {activeVault?.spending_enabled ? "Disable Spend" : "Enable Spend"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="balances">
                <TabsList className="bg-neutral-900 border border-neutral-800">
                  <TabsTrigger value="balances" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    💰 Balances
                  </TabsTrigger>
                  <TabsTrigger value="casinos" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    🎲 Casinos
                  </TabsTrigger>
                  <TabsTrigger value="vault" className="text-xs data-[state=active]:bg-neutral-800 data-[state=active]:text-indigo-300">
                    🔐 Vault
                  </TabsTrigger>
                </TabsList>

                {/* ── BALANCES TAB ── */}
                <TabsContent value="balances" className="mt-4 flex flex-col gap-4">
                  {!isActivated ? (
                    <Card className="bg-neutral-900/60 border-dashed border-neutral-700">
                      <CardContent className="py-12 flex flex-col items-center text-center gap-4">
                        <div className="text-3xl text-emerald-400">▶</div>
                        <div>
                          <div className="text-base font-bold text-neutral-200 mb-2">Wallet Not Activated</div>
                          <div className="text-sm text-neutral-500 max-w-md leading-relaxed">
                            The <code className="text-indigo-400">entities/Wallet</code> record exists but balances
                            haven't been written yet. This is why your portfolio page was empty —
                            the wallet was imported but never activated.
                          </div>
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => activateWallet(activeWallet)}>
                          ▶ Activate & Load Balances
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Portfolio total */}
                      <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800/50 border-neutral-800/60">
                        <CardContent className="py-6 text-center">
                          <div className="text-[10px] text-neutral-500 tracking-widest uppercase mb-2">Portfolio Value</div>
                          <div className="text-4xl font-bold text-neutral-100 mb-1">
                            ${(activeWallet.total_usd_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {Object.keys(activeWallet.balances).length} assets · {activeWallet.chain}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Token rows */}
                      <div className="flex flex-col gap-2">
                        {activeTokens.map((t: any) => {
                          const total = activeWallet.total_usd_value || 1;
                          const pct   = (t.usd_value / total * 100);
                          return (
                            <Card key={t.symbol} className="bg-neutral-900/60 border-neutral-800/40 hover:border-neutral-700/60 transition-colors">
                              <CardContent className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base font-bold ${t.bg || "bg-neutral-800 border-neutral-700"} ${t.color || "text-neutral-300"}`}>
                                      {t.icon || t.symbol[0]}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-neutral-200">{t.symbol}</div>
                                      <div className="text-xs text-neutral-500">{t.name || t.symbol}</div>
                                    </div>
                                  </div>
                                  <div className="text-right min-w-[130px]">
                                    <div className="text-sm font-semibold text-neutral-200">
                                      ${(t.usd_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-xs text-neutral-600 mb-1.5">
                                      {t.amount?.toLocaleString()} {t.symbol}
                                    </div>
                                    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ── CASINOS TAB ── */}
                <TabsContent value="casinos" className="mt-4">
                  <Card className="bg-neutral-900/60 border-neutral-800/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-neutral-200">Connected Casinos</CardTitle>
                      <CardDescription className="text-xs font-mono text-neutral-600">
                        entities/Wallet.connected_casinos[]
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CASINO_OPTIONS.map(c => {
                          const conn = (activeWallet.connected_casinos || []).find((x: any) => x.name === c.name);
                          return (
                            <div key={c.name}
                              className={`rounded-lg border p-4 flex flex-col items-center gap-2 transition-all ${
                                conn
                                  ? "bg-emerald-500/5 border-emerald-500/20"
                                  : "bg-neutral-800/30 border-neutral-700/40"
                              }`}>
                              <div className="text-2xl">{c.icon}</div>
                              <div className="text-xs font-semibold text-neutral-300 text-center">{c.name}</div>
                              {conn && (
                                <div className="text-[9px] text-emerald-600">
                                  Since {new Date(conn.connected_at).toLocaleDateString()}
                                </div>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className={`text-[10px] h-6 px-3 ${
                                  conn
                                    ? "border-red-800/60 text-red-400 hover:bg-red-500/10"
                                    : "border-emerald-800/60 text-emerald-400 hover:bg-emerald-500/10"
                                }`}
                                onClick={() => toggleCasino(c)}
                              >
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
                      <CardDescription className="text-xs font-mono text-neutral-600">
                        entities/SecureVault — AES-256-GCM encrypted private key
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!hasVault ? (
                        <div className="text-center py-8 text-neutral-600 text-sm border border-dashed border-neutral-800 rounded-lg">
                          No SecureVault record yet.<br />
                          Click "Add to Vault" above to encrypt a private key.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {[
                            { k: "wallet_id",            v: activeVault.wallet_id },
                            { k: "key_type",              v: (activeVault.key_type || "hex").toUpperCase() },
                            { k: "spending_enabled",      v: String(activeVault.spending_enabled) },
                            { k: "last_used",             v: new Date(activeVault.last_used).toLocaleString() },
                            { k: "encryption_iv",         v: activeVault.encryption_iv, mono: true },
                            { k: "encrypted_private_key", v: activeVault.encrypted_private_key, mono: true, wrap: true },
                          ].map(f => (
                            <div key={f.k} className="flex gap-4 px-3 py-2.5 bg-neutral-800/30 rounded-lg border border-neutral-800/40 items-start">
                              <div className="text-[10px] text-neutral-600 min-w-[160px] shrink-0 pt-0.5 font-mono">{f.k}</div>
                              <div className={`text-xs text-neutral-400 ${f.mono ? "font-mono" : ""} ${f.wrap ? "break-all text-[10px]" : ""}`}>
                                {f.v}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Decrypted key panel */}
                  {isUnlocked && (
                    <Card className="bg-emerald-950/20 border-emerald-900/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs text-emerald-400 flex items-center gap-2">
                            <Unlock className="h-3.5 w-3.5" />
                            Decrypted Key — memory only, never persisted
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost"
                              className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2"
                              onClick={() => setRevealed(r => ({ ...r, [activeId!]: !r[activeId!] }))}>
                              {revealed[activeId!]
                                ? <><EyeOff className="h-3 w-3 mr-1" />Hide</>
                                : <><Eye className="h-3 w-3 mr-1" />Reveal</>}
                            </Button>
                            <Button size="sm" variant="ghost"
                              className="h-6 text-[10px] text-emerald-400 hover:bg-emerald-500/10 px-2"
                              onClick={() => { navigator.clipboard.writeText(unlocked[activeId!]); showToast("📋 Copied"); }}>
                              <Copy className="h-3 w-3 mr-1" />Copy
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

      {/* ── Unlock / Add-to-Vault Dialog ─────────────────────────────────── */}
      <Dialog open={!!pwModal} onOpenChange={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">
              {pwModal?.mode === "unlock" ? "🔓 Unlock SecureVault" : "🔐 Add to SecureVault"}
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs leading-relaxed">
              {pwModal?.mode === "unlock"
                ? "Enter your vault password to decrypt the private key into memory."
                : "Paste your private key — it will be AES-256 encrypted and stored as an entities/SecureVault record."}
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
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && (pwModal?.mode === "unlock" ? handleUnlock() : handleAddToVault())} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-300 text-xs"
                onClick={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>
                Cancel
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                onClick={pwModal?.mode === "unlock" ? handleUnlock : handleAddToVault}
                disabled={saving}>
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing…</> : pwModal?.mode === "unlock" ? "Decrypt" : "Encrypt & Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={importModal} onOpenChange={() => { setImportModal(false); setPassword(""); setError(""); }}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">+ Import & Activate Wallet</DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs leading-relaxed">
              Creates <span className="text-indigo-400 font-mono">entities/Wallet</span> (with balances) +{" "}
              <span className="text-indigo-400 font-mono">entities/SecureVault</span> (encrypted key) in Base44.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-2">
            {[
              { label: "Wallet Label", key: "label",      placeholder: "e.g. DeFi Vault",        pw: false },
              { label: "Address",      key: "address",    placeholder: "Public wallet address",   pw: false },
              { label: "Private Key",  key: "privateKey", placeholder: "Your private key",        pw: true  },
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
                  <Select value={(importForm as any)[f.key]}
                    onValueChange={v => setImportForm(p => ({ ...p, [f.key]: v }))}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {f.opts.map(o => (
                        <SelectItem key={o} value={o} className="text-neutral-200 text-xs">{o}</SelectItem>
                      ))}
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
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-300 text-xs"
                onClick={() => { setImportModal(false); setPassword(""); setError(""); }}>
                Cancel
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                onClick={handleImport} disabled={saving}>
                {saving
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Encrypting…</>
                  : "Import, Encrypt & Activate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs px-4 py-2.5 rounded-xl shadow-2xl">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
}
