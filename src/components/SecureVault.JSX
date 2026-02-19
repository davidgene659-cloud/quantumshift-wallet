import { useState, useEffect, useCallback } from "react";

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ENTITY SCHEMAS                                                         ║
// ║  entities/SecureVault  →  encrypted key storage                        ║
// ║  entities/Wallet       →  ACTIVATED wallet with balances & casinos      ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ── AES-256-GCM helpers (Web Crypto API) ─────────────────────────────────────
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
async function encryptKey(raw, password, userId) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, userId);
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(raw));
  return {
    encrypted_private_key: btoa(String.fromCharCode(...new Uint8Array(enc))),
    encryption_iv: btoa(String.fromCharCode(...iv)),
  };
}
async function decryptKey(encB64, ivB64, password, userId) {
  const key = await deriveKey(password, userId);
  const enc = Uint8Array.from(atob(encB64), c => c.charCodeAt(0));
  const iv  = Uint8Array.from(atob(ivB64),  c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, enc);
  return new TextDecoder().decode(dec);
}

// ── Storage layer (Puter KV → localStorage fallback) ─────────────────────────
const store = {
  async get(k) {
    try { if (window.puter?.kv) { const r = await window.puter.kv.get(k); return r ? JSON.parse(r) : null; } } catch {}
    const v = localStorage.getItem(k); return v ? JSON.parse(v) : null;
  },
  async set(k, v) {
    try { if (window.puter?.kv) { await window.puter.kv.set(k, JSON.stringify(v)); return; } } catch {}
    localStorage.setItem(k, JSON.stringify(v));
  },
};

// ── entities/Wallet factory ───────────────────────────────────────────────────
function createWalletEntity(userId, walletId, chain, tokens) {
  const balances = {};
  let total_usd_value = 0;
  tokens.forEach(t => {
    balances[t.symbol] = { amount: t.balance, usd_value: +(t.balance * t.price).toFixed(2), price: t.price };
    total_usd_value += t.balance * t.price;
  });
  return {
    user_id: userId,
    wallet_id: walletId,
    chain,
    balances,
    total_usd_value: +total_usd_value.toFixed(2),
    connected_casinos: [],
    activated_at: new Date().toISOString(),
    is_active: true,
  };
}

// ── entities/SecureVault factory ──────────────────────────────────────────────
function createVaultEntity(userId, walletId, encryptedPrivateKey, encryptionIv, keyType) {
  return {
    user_id: userId,
    wallet_id: walletId,
    encrypted_private_key: encryptedPrivateKey,
    encryption_iv: encryptionIv,
    key_type: keyType,
    spending_enabled: false,
    last_used: new Date().toISOString(),
  };
}

// ── Seed / static data ────────────────────────────────────────────────────────
const TOKEN_DATA = {
  ETH: [
    { symbol: "ETH",  name: "Ethereum",  balance: 2.4817,   price: 3241.50, icon: "Ξ",  color: "#627EEA" },
    { symbol: "USDC", name: "USD Coin",  balance: 1480.00,  price: 1.00,   icon: "$",  color: "#2775CA" },
    { symbol: "LINK", name: "Chainlink", balance: 34.5,     price: 14.82,  icon: "⬡",  color: "#375BD2" },
    { symbol: "UNI",  name: "Uniswap",   balance: 12.0,     price: 9.43,   icon: "🦄", color: "#FF007A" },
  ],
  BTC: [
    { symbol: "BTC",  name: "Bitcoin",   balance: 0.08124,  price: 67120.00, icon: "₿", color: "#F7931A" },
    { symbol: "RUNE", name: "THORChain", balance: 200.0,    price: 5.12,   icon: "ᚱ",  color: "#33FF99" },
  ],
  SOL: [
    { symbol: "SOL",  name: "Solana",    balance: 18.32,    price: 172.40, icon: "◎",  color: "#9945FF" },
    { symbol: "BONK", name: "Bonk",      balance: 1200000,  price: 0.000028, icon: "🐶", color: "#F5A623" },
    { symbol: "JUP",  name: "Jupiter",   balance: 450.0,    price: 0.91,   icon: "♃",  color: "#C4A44D" },
  ],
};

const SEED_WALLETS = [
  { wallet_id: "wlt_eth_01", label: "DeFi Vault",     chain: "ETH", address: "0x4a3b...f8c2", key_type: "hex" },
  { wallet_id: "wlt_btc_01", label: "Cold Storage",   chain: "BTC", address: "bc1q...7yx9",   key_type: "wif" },
  { wallet_id: "wlt_sol_01", label: "Solana Trading", chain: "SOL", address: "8mFq...rT2n",   key_type: "mnemonic" },
];

const CHAIN_META = {
  ETH: { bg: "#627EEA18", border: "#627EEA", text: "#8FAEF7" },
  BTC: { bg: "#F7931A18", border: "#F7931A", text: "#F7B84B" },
  SOL: { bg: "#9945FF18", border: "#9945FF", text: "#BB86FC" },
};

const CASINO_OPTIONS = [
  { name: "Stake.com", icon: "♠" },
  { name: "Rollbit",   icon: "🎲" },
  { name: "BC.Game",   icon: "⚡" },
  { name: "Roobet",    icon: "🦘" },
  { name: "Cloudbet",  icon: "☁" },
];

// ═════════════════════════════════════════════════════════════════════════════
export default function SecureVault() {
  const [userId] = useState(() => {
    const c = localStorage.getItem("sv_uid");
    if (c) return c;
    const id = "user_" + Math.random().toString(36).slice(2);
    localStorage.setItem("sv_uid", id);
    return id;
  });

  // entities/SecureVault  keyed by wallet_id
  const [vaults, setVaults]             = useState({});
  // entities/Wallet       keyed by wallet_id  ← the missing activation layer
  const [walletEntities, setWalletEntities] = useState({});
  // ImportedWallet metadata (sidebar list)
  const [importedWallets, setImportedWallets] = useState([]);

  const [activeId, setActiveId]   = useState(null);
  const [unlocked, setUnlocked]   = useState({});  // wallet_id → plain private key
  const [revealed, setRevealed]   = useState({});
  const [view, setView]           = useState("balances");

  const [pwModal, setPwModal]         = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importPk, setImportPk]       = useState("");

  const [password, setPassword]   = useState("");
  const [importForm, setImportForm] = useState({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [toast, setToast]         = useState("");

  // ── Bootstrap: load all entity collections ────────────────────────────────
  useEffect(() => {
    (async () => {
      const savedVaults    = await store.get(`sv:vaults:${userId}`)   || {};
      const savedEntities  = await store.get(`sv:wallets:${userId}`)  || {};
      const savedImported  = await store.get(`sv:imported:${userId}`) || [];

      if (savedImported.length === 0) {
        // First run — seed demo wallets AND activate their Wallet entities immediately
        const seedEntities = {};
        SEED_WALLETS.forEach(w => {
          seedEntities[w.wallet_id] = createWalletEntity(userId, w.wallet_id, w.chain, TOKEN_DATA[w.chain] || []);
        });
        await store.set(`sv:imported:${userId}`, SEED_WALLETS);
        await store.set(`sv:wallets:${userId}`, seedEntities);
        setImportedWallets(SEED_WALLETS);
        setWalletEntities(seedEntities);
        setActiveId(SEED_WALLETS[0].wallet_id);
      } else {
        setImportedWallets(savedImported);
        setWalletEntities(savedEntities);
        setVaults(savedVaults);
        if (savedImported.length > 0) setActiveId(savedImported[0].wallet_id);
      }
    })();
  }, [userId]);

  const activeImport = importedWallets.find(w => w.wallet_id === activeId);
  const activeWallet = walletEntities[activeId];   // entities/Wallet
  const activeVault  = vaults[activeId];            // entities/SecureVault
  const activeTokens = activeWallet
    ? Object.entries(activeWallet.balances).map(([sym, b]) => ({
        symbol: sym, ...b,
        ...(TOKEN_DATA[activeImport?.chain]?.find(t => t.symbol === sym) || {}),
      }))
    : [];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── ACTIVATE: create entities/Wallet record ───────────────────────────────
  const activateWallet = useCallback(async (w) => {
    if (walletEntities[w.wallet_id]) return;
    const entity = createWalletEntity(userId, w.wallet_id, w.chain, TOKEN_DATA[w.chain] || []);
    const updated = { ...walletEntities, [w.wallet_id]: entity };
    setWalletEntities(updated);
    await store.set(`sv:wallets:${userId}`, updated);
    showToast("✅ Wallet activated — balances now live");
  }, [walletEntities, userId]);

  // ── Select wallet from sidebar ────────────────────────────────────────────
  const selectWallet = useCallback(async (w) => {
    setActiveId(w.wallet_id);
    setView("balances");
    setError("");
    if (!walletEntities[w.wallet_id]) await activateWallet(w);
  }, [walletEntities, activateWallet]);

  // ── Unlock SecureVault (decrypt private key) ──────────────────────────────
  const handleUnlock = async () => {
    if (!password.trim()) return setError("Enter vault password.");
    setLoading(true); setError("");
    try {
      if (!activeVault) throw new Error("No SecureVault record for this wallet.");
      const raw = await decryptKey(activeVault.encrypted_private_key, activeVault.encryption_iv, password, userId);
      setUnlocked(u => ({ ...u, [activeId]: raw }));
      const uv = { ...vaults, [activeId]: { ...activeVault, last_used: new Date().toISOString() } };
      setVaults(uv);
      await store.set(`sv:vaults:${userId}`, uv);
      setPwModal(null); setPassword("");
      showToast("🔓 SecureVault decrypted");
    } catch { setError("Decryption failed — wrong password?"); }
    setLoading(false);
  };

  // ── Encrypt existing wallet into SecureVault ──────────────────────────────
  const handleAddToVault = async () => {
    if (!importPk.trim() || !password.trim()) return setError("Private key + password required.");
    setLoading(true); setError("");
    try {
      const { encrypted_private_key, encryption_iv } = await encryptKey(importPk, password, userId);
      const vaultEntity = createVaultEntity(userId, activeId, encrypted_private_key, encryption_iv, activeImport?.key_type || "hex");
      const uv = { ...vaults, [activeId]: vaultEntity };
      setVaults(uv);
      setUnlocked(u => ({ ...u, [activeId]: importPk }));
      await store.set(`sv:vaults:${userId}`, uv);
      setPwModal(null); setPassword(""); setImportPk("");
      showToast("🔐 Private key encrypted into SecureVault");
    } catch (e) { setError("Encrypt failed: " + e.message); }
    setLoading(false);
  };

  // ── Import brand-new wallet ───────────────────────────────────────────────
  const handleImport = async () => {
    const { label, chain, address, privateKey, key_type } = importForm;
    if (!label || !address || !privateKey || !password.trim())
      return setError("All fields + vault password required.");
    setLoading(true); setError("");
    try {
      const wallet_id = `wlt_${chain.toLowerCase()}_${Date.now()}`;
      const { encrypted_private_key, encryption_iv } = await encryptKey(privateKey, password, userId);
      const vaultEntity  = createVaultEntity(userId, wallet_id, encrypted_private_key, encryption_iv, key_type);
      const walletEntity = createWalletEntity(userId, wallet_id, chain, TOKEN_DATA[chain] || []);
      const importMeta   = { wallet_id, label, chain, address, key_type, imported_at: new Date().toISOString() };

      const uv  = { ...vaults,         [wallet_id]: vaultEntity };
      const ue  = { ...walletEntities, [wallet_id]: walletEntity };
      const ui  = [...importedWallets, importMeta];

      setVaults(uv); setWalletEntities(ue); setImportedWallets(ui);
      setUnlocked(u => ({ ...u, [wallet_id]: privateKey }));
      setActiveId(wallet_id);

      await store.set(`sv:vaults:${userId}`,   uv);
      await store.set(`sv:wallets:${userId}`,  ue);
      await store.set(`sv:imported:${userId}`, ui);

      setImportModal(false); setPassword("");
      setImportForm({ label: "", chain: "ETH", address: "", privateKey: "", key_type: "hex" });
      showToast("✅ Wallet imported, encrypted & activated");
    } catch (e) { setError("Import failed: " + e.message); }
    setLoading(false);
  };

  // ── Casino connect/disconnect ──────────────────────────────────────────────
  const toggleCasino = async (casino) => {
    if (!activeWallet) return;
    const existing = activeWallet.connected_casinos || [];
    const idx = existing.findIndex(c => c.name === casino.name);
    const updated = idx >= 0
      ? existing.filter((_, i) => i !== idx)
      : [...existing, { name: casino.name, connected_at: new Date().toISOString(), status: "active" }];
    const ue = { ...walletEntities, [activeId]: { ...activeWallet, connected_casinos: updated } };
    setWalletEntities(ue);
    await store.set(`sv:wallets:${userId}`, ue);
    showToast(idx >= 0 ? `⛔ Disconnected ${casino.name}` : `✅ Connected ${casino.name}`);
  };

  // ── Toggle spending ────────────────────────────────────────────────────────
  const toggleSpending = async () => {
    if (!activeVault) return;
    const uv = { ...vaults, [activeId]: { ...activeVault, spending_enabled: !activeVault.spending_enabled } };
    setVaults(uv);
    await store.set(`sv:vaults:${userId}`, uv);
    showToast(uv[activeId].spending_enabled ? "⚡ Spending enabled" : "🔒 Spending disabled");
  };

  const isUnlocked = !!unlocked[activeId];
  const hasVault   = !!activeVault;
  const isActive   = !!activeWallet;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.root}>
      <div style={S.grid} />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHead}>
          <div style={S.logo}>
            <span style={S.logoHex}>⬡</span>
            <div>
              <div style={S.logoName}>SecureVault</div>
              <div style={S.logoSub}>entities/Wallet</div>
            </div>
          </div>
          <button style={S.pill} onClick={() => { setImportModal(true); setError(""); setPassword(""); }}>
            + Import
          </button>
        </div>

        <div style={S.walletList}>
          {importedWallets.map(w => {
            const cm = CHAIN_META[w.chain] || CHAIN_META.ETH;
            const active    = activeId === w.wallet_id;
            const activated = !!walletEntities[w.wallet_id];
            const open      = !!unlocked[w.wallet_id];
            return (
              <button key={w.wallet_id}
                style={{ ...S.walletRow, ...(active ? S.walletRowActive : {}) }}
                onClick={() => selectWallet(w)}>
                <div style={S.walletRowTop}>
                  <span style={{ ...S.badge, background: cm.bg, border: `1px solid ${cm.border}55`, color: cm.text }}>
                    {w.chain}
                  </span>
                  <div style={S.walletRowIcons}>
                    {activated
                      ? <span style={S.liveDot}>● LIVE</span>
                      : <span style={S.deadDot}>○ IDLE</span>}
                    <span style={{ color: open ? "#4AE88A" : "#333", fontSize: 13 }}>{open ? "🔓" : "🔒"}</span>
                  </div>
                </div>
                <div style={S.walletRowLabel}>{w.label}</div>
                <div style={S.walletRowAddr}>{w.address}</div>
                {activated && (
                  <div style={S.walletRowVal}>
                    ${(walletEntities[w.wallet_id]?.total_usd_value || 0)
                      .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div style={S.sidebarFooter}>
          <div style={S.footerLabel}>TOTAL ALL WALLETS</div>
          <div style={S.footerValue}>
            ${Object.values(walletEntities)
              .reduce((s, w) => s + (w.total_usd_value || 0), 0)
              .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main style={S.main}>
        {!activeImport ? (
          <div style={S.empty}>
            <div style={S.emptyIcon}>⬡</div>
            <div style={S.emptyTitle}>Select a Wallet</div>
            <div style={S.emptyDesc}>Choose from the sidebar or import a new one.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={S.header}>
              <div>
                <div style={S.headerName}>{activeImport.label}</div>
                <div style={S.headerAddr}>{activeImport.address}</div>
                <div style={S.headerPills}>
                  {isActive
                    ? <span style={S.pillGreen}>● WALLET ACTIVATED</span>
                    : <span style={S.pillGray}>○ NOT ACTIVATED</span>}
                  {hasVault && <span style={S.pillIndigo}>🔐 VAULT</span>}
                  {activeVault?.spending_enabled && <span style={S.pillAmber}>⚡ SPENDING ON</span>}
                </div>
              </div>
              <div style={S.headerBtns}>
                {!isActive && (
                  <button style={{ ...S.btn, ...S.btnGreen }} onClick={() => activateWallet(activeImport)}>
                    ▶ Activate Wallet
                  </button>
                )}
                {isActive && !hasVault && (
                  <button style={S.btn}
                    onClick={() => { setPwModal({ wallet_id: activeId, mode: "vault" }); setError(""); setPassword(""); setImportPk(""); }}>
                    🔐 Add to Vault
                  </button>
                )}
                {hasVault && !isUnlocked && (
                  <button style={{ ...S.btn, ...S.btnIndigo }}
                    onClick={() => { setPwModal({ wallet_id: activeId, mode: "unlock" }); setError(""); setPassword(""); }}>
                    🔓 Unlock
                  </button>
                )}
                {hasVault && isUnlocked && (
                  <>
                    <button style={{ ...S.btn, color: "#4AE88A", border: "1px solid #1A3A2A" }}
                      onClick={() => setUnlocked(u => { const n = { ...u }; delete n[activeId]; return n; })}>
                      🔒 Lock
                    </button>
                    <button style={{ ...S.btn, ...S.btnAmber }} onClick={toggleSpending}>
                      {activeVault?.spending_enabled ? "Disable Spend" : "Enable Spend"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={S.tabs}>
              {[["balances","💰 Balances"], ["casinos","🎲 Casinos"], ["vault","🔐 Vault"]].map(([t, label]) => (
                <button key={t} style={{ ...S.tab, ...(view === t ? S.tabActive : {}) }} onClick={() => setView(t)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── BALANCES ── */}
            {view === "balances" && (
              !isActive ? (
                <div style={S.activateCard}>
                  <div style={S.activateIcon}>▶</div>
                  <div style={S.activateTitle}>Wallet Not Activated</div>
                  <div style={S.activateDesc}>
                    This wallet was imported but the <code>entities/Wallet</code> record was never created.
                    That's why your balances weren't showing up — the storage was loaded, but the wallet entity wasn't activated.
                    Click below to fix it.
                  </div>
                  <button style={{ ...S.btn, ...S.btnGreen, padding: "10px 28px", fontSize: 13 }}
                    onClick={() => activateWallet(activeImport)}>
                    ▶ Activate & Load Balances
                  </button>
                </div>
              ) : (
                <>
                  <div style={S.portfolioCard}>
                    <div style={S.portLabel}>PORTFOLIO VALUE</div>
                    <div style={S.portValue}>
                      ${activeWallet.total_usd_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={S.portMeta}>
                      {Object.keys(activeWallet.balances).length} assets · {activeImport.chain} ·
                      activated {new Date(activeWallet.activated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={S.tokenList}>
                    {activeTokens.map(t => {
                      const pct = activeWallet.total_usd_value > 0 ? (t.usd_value / activeWallet.total_usd_value * 100) : 0;
                      return (
                        <div key={t.symbol} style={S.tokenRow}>
                          <div style={S.tokenLeft}>
                            <div style={{ ...S.tokenIcon, background: (t.color||"#666")+"22", border:`1px solid ${(t.color||"#666")}44`, color: t.color||"#aaa" }}>
                              {t.icon || t.symbol[0]}
                            </div>
                            <div>
                              <div style={S.tokenSym}>{t.symbol}</div>
                              <div style={S.tokenName}>{t.name || t.symbol}</div>
                            </div>
                          </div>
                          <div style={S.tokenRight}>
                            <div style={S.tokenUSD}>
                              ${t.usd_value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={S.tokenBal}>{t.amount?.toLocaleString()} {t.symbol}</div>
                            <div style={S.barTrack}><div style={{ ...S.barFill, width:`${pct}%`, background: t.color||"#6366F1" }} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}

            {/* ── CASINOS ── */}
            {view === "casinos" && (
              <div style={S.section}>
                <div style={S.sectionTitle}>Connected Casinos</div>
                <div style={S.sectionDesc}>Stored in <code>entities/Wallet.connected_casinos[]</code></div>
                <div style={S.casinoGrid}>
                  {CASINO_OPTIONS.map(c => {
                    const conn = activeWallet?.connected_casinos?.find(x => x.name === c.name);
                    return (
                      <div key={c.name} style={{ ...S.casinoCard, ...(conn ? S.casinoCardOn : {}) }}>
                        <div style={S.casinoIcon}>{c.icon}</div>
                        <div style={S.casinoName}>{c.name}</div>
                        {conn && <div style={S.casinoDate}>Since {new Date(conn.connected_at).toLocaleDateString()}</div>}
                        <button
                          style={{ ...S.casinoBtn, ...(conn ? S.casinoBtnOff : S.casinoBtnOn) }}
                          onClick={() => { if (!isActive) return showToast("Activate wallet first"); toggleCasino(c); }}>
                          {conn ? "Disconnect" : "Connect"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── VAULT ── */}
            {view === "vault" && (
              <div style={S.section}>
                <div style={S.sectionTitle}>SecureVault Record</div>
                <div style={S.sectionDesc}>entities/SecureVault — AES-256-GCM encrypted private key storage</div>
                {!hasVault
                  ? <div style={S.vaultEmpty}>No SecureVault record yet. Click "Add to Vault" to encrypt a private key for this wallet.</div>
                  : (
                    <div style={S.vaultFields}>
                      {[
                        { k: "wallet_id",          v: activeVault.wallet_id },
                        { k: "key_type",            v: activeVault.key_type.toUpperCase() },
                        { k: "spending_enabled",    v: String(activeVault.spending_enabled) },
                        { k: "last_used",           v: new Date(activeVault.last_used).toLocaleString() },
                        { k: "encryption_iv",       v: activeVault.encryption_iv, mono: true },
                        { k: "encrypted_private_key", v: activeVault.encrypted_private_key, mono: true, wrap: true },
                      ].map(f => (
                        <div key={f.k} style={S.vField}>
                          <div style={S.vLabel}>{f.k}</div>
                          <div style={{ ...S.vValue, ...(f.mono?S.mono:{}), ...(f.wrap?{wordBreak:"break-all",fontSize:10}:{}) }}>{f.v}</div>
                        </div>
                      ))}
                    </div>
                  )
                }
                {isUnlocked && (
                  <div style={S.keyBox}>
                    <div style={S.keyBoxHead}>
                      <span style={{ color: "#4AE88A" }}>🔓 Decrypted Key (memory only — never persisted)</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={S.keyBtn} onClick={() => setRevealed(r => ({ ...r, [activeId]: !r[activeId] }))}>
                          {revealed[activeId] ? "Hide" : "Reveal"}
                        </button>
                        <button style={S.keyBtn} onClick={() => { navigator.clipboard.writeText(unlocked[activeId]); showToast("📋 Copied"); }}>
                          Copy
                        </button>
                      </div>
                    </div>
                    <div style={{ ...S.keyVal, ...S.mono }}>
                      {revealed[activeId] ? unlocked[activeId] : "•".repeat(64)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Unlock / Add-to-Vault Modal ─────────────────────────────────── */}
      {pwModal && (
        <div style={S.overlay} onClick={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>
              {pwModal.mode === "unlock" ? "🔓 Unlock SecureVault" : "🔐 Add to SecureVault"}
            </div>
            <div style={S.modalDesc}>
              {pwModal.mode === "unlock"
                ? "Decrypt the private key into memory using your vault password."
                : "Paste your private key — it will be AES-256 encrypted and stored as an entities/SecureVault record."}
            </div>
            {pwModal.mode === "vault" && (
              <input type="password" placeholder="Private key…" style={{ ...S.input, marginBottom: 10 }}
                value={importPk} onChange={e => { setImportPk(e.target.value); setError(""); }} />
            )}
            <input type="password" placeholder="Vault password…" style={S.input}
              value={password} autoFocus
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && (pwModal.mode === "unlock" ? handleUnlock() : handleAddToVault())} />
            {error && <div style={S.errMsg}>{error}</div>}
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => { setPwModal(null); setPassword(""); setError(""); setImportPk(""); }}>Cancel</button>
              <button style={S.confirmBtn}
                onClick={pwModal.mode === "unlock" ? handleUnlock : handleAddToVault}
                disabled={loading}>
                {loading ? "Processing…" : pwModal.mode === "unlock" ? "Decrypt" : "Encrypt & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {importModal && (
        <div style={S.overlay} onClick={() => { setImportModal(false); setPassword(""); setError(""); }}>
          <div style={{ ...S.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalTitle}>+ Import & Activate Wallet</div>
            <div style={S.modalDesc}>
              Creates <strong>entities/SecureVault</strong> (encrypted key) + <strong>entities/Wallet</strong> (activated with live balances).
            </div>
            <div style={S.formGrid}>
              {[
                { label: "Wallet Label", key: "label",      placeholder: "e.g. DeFi Vault" },
                { label: "Address",      key: "address",    placeholder: "Public wallet address" },
                { label: "Private Key",  key: "privateKey", placeholder: "Your private key", pw: true },
              ].map(f => (
                <div key={f.key} style={S.formField}>
                  <label style={S.formLabel}>{f.label}</label>
                  <input type={f.pw ? "password" : "text"} placeholder={f.placeholder} style={S.input}
                    value={importForm[f.key]} onChange={e => setImportForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10 }}>
                {[{ label: "Chain", key: "chain", opts: ["ETH","BTC","SOL"] },
                  { label: "Key Type", key: "key_type", opts: ["hex","wif","mnemonic"] }].map(f => (
                  <div key={f.key} style={{ ...S.formField, flex: 1 }}>
                    <label style={S.formLabel}>{f.label}</label>
                    <select style={{ ...S.input, cursor: "pointer" }} value={importForm[f.key]}
                      onChange={e => setImportForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={S.formField}>
                <label style={S.formLabel}>Vault Password (encrypts your private key)</label>
                <input type="password" placeholder="Strong password…" style={S.input}
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
              </div>
            </div>
            {error && <div style={S.errMsg}>{error}</div>}
            <div style={S.modalBtns}>
              <button style={S.cancelBtn} onClick={() => { setImportModal(false); setPassword(""); setError(""); }}>Cancel</button>
              <button style={S.confirmBtn} onClick={handleImport} disabled={loading}>
                {loading ? "Encrypting…" : "Import, Encrypt & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  root: { display:"flex", minHeight:"100vh", background:"#080810", color:"#D0D0E4",
    fontFamily:"'IBM Plex Mono','Fira Code',monospace", position:"relative", overflow:"hidden" },
  grid: { position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
    backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",
    backgroundSize:"36px 36px" },

  sidebar: { width:256, background:"#0C0C18", borderRight:"1px solid #181828",
    display:"flex", flexDirection:"column", zIndex:1, flexShrink:0 },
  sidebarHead: { padding:"18px 14px 14px", borderBottom:"1px solid #181828",
    display:"flex", alignItems:"center", justifyContent:"space-between" },
  logo: { display:"flex", alignItems:"center", gap:10 },
  logoHex: { fontSize:22, color:"#6366F1" },
  logoName: { fontSize:13, fontWeight:700, color:"#A5B4FC", letterSpacing:".06em" },
  logoSub: { fontSize:9, color:"#30304A", letterSpacing:".08em" },
  pill: { fontSize:10, padding:"5px 10px", background:"transparent",
    border:"1px solid #6366F1", color:"#A5B4FC", borderRadius:4, cursor:"pointer" },
  walletList: { flex:1, padding:10, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 },
  walletRow: { background:"transparent", border:"1px solid #181828", borderRadius:7,
    padding:"11px 12px", cursor:"pointer", textAlign:"left", color:"inherit", transition:"all .15s" },
  walletRowActive: { background:"#10101E", borderColor:"#6366F1" },
  walletRowTop: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 },
  walletRowIcons: { display:"flex", alignItems:"center", gap:6 },
  badge: { fontSize:9, padding:"2px 6px", borderRadius:3, letterSpacing:".1em", fontWeight:700 },
  liveDot: { fontSize:9, color:"#4AE88A", letterSpacing:".06em" },
  deadDot: { fontSize:9, color:"#333355", letterSpacing:".06em" },
  walletRowLabel: { fontSize:12, fontWeight:600, color:"#C0C0DC", marginBottom:2 },
  walletRowAddr: { fontSize:9, color:"#303050", letterSpacing:".04em", marginBottom:4 },
  walletRowVal: { fontSize:11, color:"#6666AA", fontWeight:600 },
  sidebarFooter: { padding:"14px 16px", borderTop:"1px solid #181828" },
  footerLabel: { fontSize:9, color:"#303050", letterSpacing:".1em", marginBottom:4 },
  footerValue: { fontSize:17, fontWeight:700, color:"#7777BB" },

  main: { flex:1, padding:28, overflowY:"auto", zIndex:1, display:"flex", flexDirection:"column", gap:16 },
  empty: { margin:"auto", textAlign:"center", color:"#222240" },
  emptyIcon: { fontSize:44, marginBottom:14 },
  emptyTitle: { fontSize:18, fontWeight:700, marginBottom:6 },
  emptyDesc: { fontSize:12, lineHeight:1.7 },

  header: { display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    padding:"18px 22px", background:"#0C0C18", border:"1px solid #181828", borderRadius:10, flexWrap:"wrap", gap:12 },
  headerName: { fontSize:17, fontWeight:700, color:"#E0E0F0", marginBottom:3 },
  headerAddr: { fontSize:10, color:"#303050", letterSpacing:".05em", marginBottom:7 },
  headerPills: { display:"flex", gap:6, flexWrap:"wrap" },
  pillGreen:  { fontSize:9, padding:"2px 7px", background:"#0A2018", border:"1px solid #1A4030", color:"#4AE88A", borderRadius:3, letterSpacing:".08em" },
  pillGray:   { fontSize:9, padding:"2px 7px", background:"#141420", border:"1px solid #202030", color:"#444466", borderRadius:3, letterSpacing:".08em" },
  pillIndigo: { fontSize:9, padding:"2px 7px", background:"#101028", border:"1px solid #303080", color:"#8888DD", borderRadius:3, letterSpacing:".08em" },
  pillAmber:  { fontSize:9, padding:"2px 7px", background:"#1A1500", border:"1px solid #3A3000", color:"#C8A020", borderRadius:3, letterSpacing:".08em" },
  headerBtns: { display:"flex", gap:8, flexWrap:"wrap", alignItems:"flex-start" },

  btn: { fontSize:11, padding:"7px 13px", background:"#10101E", border:"1px solid #252535",
    color:"#8888BB", borderRadius:5, cursor:"pointer", fontFamily:"inherit", letterSpacing:".04em" },
  btnGreen:  { border:"1px solid #1A4030", color:"#4AE88A", background:"#0A1A10" },
  btnIndigo: { border:"1px solid #4040AA", color:"#A5B4FC", background:"#10101E" },
  btnAmber:  { border:"1px solid #3A3000", color:"#C8A020", background:"#1A1500" },

  tabs: { display:"flex", gap:4 },
  tab: { fontSize:11, padding:"7px 16px", background:"transparent", border:"1px solid #181828",
    color:"#40405A", borderRadius:5, cursor:"pointer", fontFamily:"inherit", letterSpacing:".05em" },
  tabActive: { background:"#10101E", borderColor:"#6366F1", color:"#A5B4FC" },

  activateCard: { display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center",
    padding:"48px 32px", background:"#0C0C18", border:"1px dashed #252540", borderRadius:10, gap:14 },
  activateIcon: { fontSize:36, color:"#4AE88A" },
  activateTitle: { fontSize:17, fontWeight:700, color:"#C0C0DC" },
  activateDesc: { fontSize:12, color:"#444466", lineHeight:1.8, maxWidth:420 },

  portfolioCard: { padding:"26px 30px", background:"#0C0C18", border:"1px solid #181828",
    borderRadius:10, textAlign:"center" },
  portLabel: { fontSize:9, color:"#303050", letterSpacing:".14em", textTransform:"uppercase", marginBottom:8 },
  portValue: { fontSize:38, fontWeight:700, color:"#E0E0F8", letterSpacing:"-.02em", marginBottom:6 },
  portMeta: { fontSize:11, color:"#303050" },

  tokenList: { display:"flex", flexDirection:"column", gap:6 },
  tokenRow: { display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"12px 18px", background:"#0C0C18", border:"1px solid #14141E", borderRadius:7 },
  tokenLeft: { display:"flex", alignItems:"center", gap:12 },
  tokenIcon: { width:38, height:38, borderRadius:7, display:"flex", alignItems:"center",
    justifyContent:"center", fontSize:15, flexShrink:0 },
  tokenSym: { fontSize:13, fontWeight:700, color:"#C8C8E0", marginBottom:2 },
  tokenName: { fontSize:10, color:"#303050" },
  tokenRight: { textAlign:"right", minWidth:140 },
  tokenUSD: { fontSize:14, fontWeight:600, color:"#C8C8E0", marginBottom:2 },
  tokenBal: { fontSize:10, color:"#404060", marginBottom:4 },
  barTrack: { height:2, background:"#181828", borderRadius:2 },
  barFill: { height:"100%", borderRadius:2, transition:"width .4s" },

  section: { display:"flex", flexDirection:"column", gap:12 },
  sectionTitle: { fontSize:13, fontWeight:700, color:"#C0C0DC" },
  sectionDesc: { fontSize:10, color:"#303050" },

  casinoGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:10 },
  casinoCard: { background:"#0C0C18", border:"1px solid #181828", borderRadius:8,
    padding:"16px 14px", display:"flex", flexDirection:"column", alignItems:"center", gap:7 },
  casinoCardOn: { background:"#0A120E", borderColor:"#1A3A2A" },
  casinoIcon: { fontSize:22 },
  casinoName: { fontSize:11, fontWeight:600, color:"#9090BC", textAlign:"center" },
  casinoDate: { fontSize:9, color:"#1A3A2A" },
  casinoBtn: { fontSize:10, padding:"4px 14px", borderRadius:4, cursor:"pointer", fontFamily:"inherit", border:"none" },
  casinoBtnOn:  { background:"#0A2018", color:"#4AE88A" },
  casinoBtnOff: { background:"#2A0A0A", color:"#F87171" },

  vaultEmpty: { fontSize:11, color:"#303050", padding:"22px", background:"#0C0C18",
    border:"1px dashed #1E1E2E", borderRadius:8, textAlign:"center" },
  vaultFields: { display:"flex", flexDirection:"column", gap:5 },
  vField: { display:"flex", gap:14, padding:"10px 14px", background:"#0C0C18",
    border:"1px solid #14141E", borderRadius:6, alignItems:"flex-start" },
  vLabel: { fontSize:10, color:"#303050", minWidth:160, flexShrink:0 },
  vValue: { fontSize:12, color:"#7777AA" },
  mono: { fontFamily:"'IBM Plex Mono',monospace", fontSize:11 },
  keyBox: { background:"#0A120E", border:"1px solid #1A3A2A", borderRadius:7, padding:"16px 18px" },
  keyBoxHead: { display:"flex", justifyContent:"space-between", alignItems:"center",
    marginBottom:10, fontSize:11 },
  keyBtn: { fontSize:10, padding:"3px 9px", background:"transparent",
    border:"1px solid #1A3A2A", color:"#4AE88A", borderRadius:3, cursor:"pointer" },
  keyVal: { color:"#4AE88A99", background:"#060E08", padding:"10px 12px",
    borderRadius:4, wordBreak:"break-all", lineHeight:1.8 },

  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.82)", display:"flex",
    alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(6px)" },
  modal: { background:"#0C0C18", border:"1px solid #252535", borderRadius:12,
    padding:"26px 28px", width:"90%", maxWidth:400 },
  modalTitle: { fontSize:15, fontWeight:700, color:"#C8C8E8", marginBottom:7 },
  modalDesc: { fontSize:11, color:"#404066", marginBottom:18, lineHeight:1.7 },
  input: { width:"100%", padding:"9px 11px", background:"#080810", border:"1px solid #181828",
    borderRadius:5, color:"#B0B0CC", fontSize:11, fontFamily:"inherit", outline:"none",
    boxSizing:"border-box" },
  errMsg: { color:"#F87171", fontSize:10, marginTop:7 },
  modalBtns: { display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" },
  cancelBtn: { padding:"7px 14px", background:"transparent", border:"1px solid #252535",
    color:"#444", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit" },
  confirmBtn: { padding:"7px 16px", background:"#6366F1", border:"none",
    color:"#fff", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit", fontWeight:700 },
  formGrid: { display:"flex", flexDirection:"column", gap:12 },
  formField: { display:"flex", flexDirection:"column", gap:5 },
  formLabel: { fontSize:9, color:"#404066", letterSpacing:".08em", textTransform:"uppercase" },

  toast: { position:"fixed", bottom:22, left:"50%", transform:"translateX(-50%)",
    background:"#0C0C18", border:"1px solid #252535", color:"#C0C0DC",
    padding:"9px 18px", borderRadius:7, fontSize:11, zIndex:200,
    letterSpacing:".04em", boxShadow:"0 4px 24px rgba(0,0,0,.6)" },
};
