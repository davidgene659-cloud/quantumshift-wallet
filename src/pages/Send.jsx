import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send as SendIcon, Scan, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenSelector, { tokens } from '@/components/swap/TokenSelector';
import AIChatbot from '@/components/chat/AIChatbot';

// ── Address validation ────────────────────────────────────────────────────────

function validateAddress(address, blockchain) {
  if (!address || address.trim().length === 0) return 'Address is required';
  const addr = address.trim();
  switch (blockchain) {
    case 'ethereum':
    case 'polygon':
    case 'bsc':
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr))
        return 'Invalid EVM address (must be 0x + 40 hex characters)';
      break;
    case 'bitcoin':
      if (
        !/^(1|3)[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(addr) &&
        !/^bc1q[0-9a-z]{38,59}$/.test(addr)
      )
        return 'Invalid Bitcoin address';
      break;
    case 'solana':
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr))
        return 'Invalid Solana address';
      break;
    default:
      break;
  }
  return null;
}

function validateAmount(amount, balance) {
  const n = parseFloat(amount);
  if (!amount || isNaN(n)) return 'Enter a valid amount';
  if (n <= 0)              return 'Amount must be greater than 0';
  if (n > balance)         return 'Amount exceeds available balance';
  return null;
}

// ── Chain → blockchain param mapping ─────────────────────────────────────────

const BLOCKCHAIN_MAP = {
  ETH:   'ethereum',
  MATIC: 'polygon',
  BNB:   'bsc',
  BTC:   'bitcoin',
  SOL:   'solana',
  USDC:  'ethereum',
  USDT:  'ethereum',
};

// ERC-20 contract addresses (mainnet)
const ERC20_CONTRACTS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
};

// ── Wallet helpers ────────────────────────────────────────────────────────────

function getSavedWallets() {
  try {
    return JSON.parse(localStorage.getItem('imported_wallets') || '[]');
  } catch {
    return [];
  }
}

/**
 * Returns the best wallet id for a given token symbol.
 * Prefers the wallet with the largest balance for that chain.
 */
function getBestWalletId(tokenSymbol) {
  const blockchain = BLOCKCHAIN_MAP[tokenSymbol];
  if (!blockchain) return '';
  const wallets = getSavedWallets();
  const matching = wallets
    .filter(w => w.blockchain === blockchain)
    .sort((a, b) => (b.balance || 0) - (a.balance || 0));
  return matching[0]?.id ?? '';
}

// ── Gas option config (EVM only) ──────────────────────────────────────────────

const GAS_OPTIONS = [
  { value: 'slow',     label: '🐢 Slow',     description: '5–10 min' },
  { value: 'standard', label: '⚡ Standard', description: '1–3 min'  },
  { value: 'fast',     label: '🚀 Fast',     description: '< 30 sec' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Send() {
  const [token,       setToken]       = useState('ETH');
  const [amount,      setAmount]      = useState('');
  const [address,     setAddress]     = useState('');
  const [gasOption,   setGasOption]   = useState('standard');
  const [isSending,   setIsSending]   = useState(false);
  const [txResult,    setTxResult]    = useState(null);
  const [error,       setError]       = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Derived from selected token — auto-selects the best wallet for that chain
  const [walletId, setWalletId] = useState(() => getBestWalletId('ETH'));

  // Re-derive walletId whenever token changes
  useEffect(() => {
    setWalletId(getBestWalletId(token));
    setError(null);
    setAddress('');
  }, [token]);

  const selectedToken = tokens.find(t => t.symbol === token);
  const usdValue = amount && selectedToken
    ? (parseFloat(amount) * selectedToken.price).toFixed(2)
    : '0.00';

  const blockchain    = BLOCKCHAIN_MAP[token] || 'ethereum';
  const tokenContract = ERC20_CONTRACTS[token];
  const isEVM         = ['ethereum', 'polygon', 'bsc'].includes(blockchain);
  const balance       = selectedToken?.balance ?? 0;

  // Fee label per chain
  const feeLabel = blockchain === 'bitcoin' ? 'BTC'
                 : blockchain === 'solana'  ? 'SOL'
                 : 'ETH';

  const addressError = address ? validateAddress(address, blockchain) : null;
  const amountError  = amount  ? validateAmount(amount, balance)       : null;
  const canSend      = !addressError && !amountError && !isSending && !!walletId && !!address && !!amount;

  // ── Broadcast ──────────────────────────────────────────────────────────────

  const executeSend = async () => {
    setShowConfirm(false);
    setError(null);
    setIsSending(true);
    setTxResult(null);

    try {
      const payload = {
        wallet_id:  walletId,
        to_address: address.trim(),
        amount:     amount.trim(),
        blockchain,
        // Only send gas_option for EVM; BTC uses live sat/vbyte, SOL uses fixed fee
        ...(isEVM && { gas_option: gasOption }),
      };

      if (tokenContract) payload.token_contract = tokenContract;

      const res = await fetch('/api/signTransaction', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      setTxResult(data);
      setAmount('');
      setAddress('');

    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendClick = () => {
    if (!canSend) return;
    setShowConfirm(true);
  };

  const handleReset = () => {
    setTxResult(null);
    setError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to={createPageUrl('Portfolio')}>
            <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Send Crypto</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >

          {/* ── Success overlay ── */}
          {txResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-10 bg-gray-900/97 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center gap-4 p-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.15 }}
              >
                <CheckCircle2 className="w-20 h-20 text-emerald-400" />
              </motion.div>

              <h3 className="text-2xl font-bold text-white">Transaction Sent!</h3>
              <p className="text-white/60 text-center">
                {txResult.amount} {token} → {txResult.to.slice(0, 8)}…{txResult.to.slice(-6)}
              </p>

              {/* fee + fee_unit come from the backend — correct per chain */}
              {txResult.fee && (
                <p className="text-white/40 text-sm">
                  Fee: {txResult.fee} {txResult.fee_unit ?? feeLabel}
                </p>
              )}

              <a
                href={txResult.explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </a>

              <p className="text-white/30 text-xs font-mono break-all text-center">
                {txResult.transaction_hash}
              </p>

              <button
                onClick={handleReset}
                className="mt-2 text-white/50 hover:text-white text-sm transition-colors"
              >
                Send another →
              </button>
            </motion.div>
          )}

          {/* ── Confirm dialog overlay ── */}
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-10 bg-gray-900/97 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center gap-5 p-6"
            >
              <h3 className="text-xl font-bold text-white">Confirm Transaction</h3>

              <div className="w-full bg-white/5 rounded-2xl p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Sending</span>
                  <span className="text-white font-semibold">{amount} {token}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">≈ USD</span>
                  <span className="text-white">${usdValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">To</span>
                  <span className="text-white font-mono text-xs break-all text-right max-w-[60%]">{address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Network</span>
                  <span className="text-white capitalize">{blockchain}</span>
                </div>
                {/* Only show speed row for EVM — BTC/SOL don't use this option */}
                {isEVM && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Speed</span>
                    <span className="text-white capitalize">{gasOption}</span>
                  </div>
                )}
              </div>

              <p className="text-amber-400/80 text-xs text-center">
                ⚠️ This transaction is irreversible. Double-check the address before confirming.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeSend}
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all"
                >
                  Confirm Send
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Main form ── */}
          <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-4"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold text-sm">Transaction Failed</p>
                  <p className="text-red-300/80 text-sm mt-1">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Token selection */}
            <div>
              <Label className="text-white/70 mb-2 block">Select Token</Label>
              <div className="flex items-center gap-3">
                <TokenSelector
                  selected={token}
                  onSelect={(t) => {
                    setToken(t);
                    setError(null);
                    setAddress('');
                  }}
                />
                <span className="text-white/50 text-sm">Balance: {balance.toFixed(6)} {token}</span>
              </div>
            </div>

            {/* Active wallet indicator */}
            {walletId ? (
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/50">
                {(() => {
                  const w = getSavedWallets().find(x => x.id === walletId);
                  return w
                    ? `Wallet: ${w.label || w.address.slice(0, 10) + '…' + w.address.slice(-6)}`
                    : `Wallet ID: ${walletId}`;
                })()}
              </div>
            ) : (
              <p className="text-amber-400/70 text-xs text-center">
                ⚠️ No {blockchain} wallet found. Import one first.
              </p>
            )}

            {/* Amount */}
            <div>
              <Label className="text-white/70 mb-2 block">Amount</Label>
              <div className={`bg-white/5 rounded-2xl p-4 transition-all ${amountError ? 'ring-1 ring-red-500/50' : ''}`}>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(null); }}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="bg-transparent border-none text-3xl font-bold text-white placeholder:text-white/30 focus-visible:ring-0 p-0"
                  />
                  <button
                    onClick={() => setAmount(String(balance))}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded-lg bg-blue-400/10 transition-all flex-shrink-0"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-white/40 text-sm mt-2">≈ ${usdValue} USD</p>
              </div>
              {amountError && (
                <p className="text-red-400 text-xs mt-1 ml-1">{amountError}</p>
              )}
            </div>

            {/* Recipient address */}
            <div>
              <Label className="text-white/70 mb-2 block">Recipient Address</Label>
              <div className={`relative transition-all ${addressError ? 'ring-1 ring-red-500/50 rounded-xl' : ''}`}>
                <Input
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setError(null); }}
                  placeholder={
                    blockchain === 'bitcoin' ? 'bc1q... or 1... or 3...' :
                    blockchain === 'solana'  ? 'Solana public key (base58)' :
                    '0x... Ethereum address'
                  }
                  className="bg-white/5 border-white/10 text-white pr-12 h-14 font-mono text-sm"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-all">
                  <Scan className="w-5 h-5 text-white/50" />
                </button>
              </div>
              {addressError && (
                <p className="text-red-400 text-xs mt-1 ml-1">{addressError}</p>
              )}
            </div>

            {/* Gas option — EVM only */}
            {isEVM && (
              <div>
                <Label className="text-white/70 mb-2 block">Transaction Speed</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GAS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGasOption(opt.value)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        gasOption === opt.value
                          ? 'border-blue-500 bg-blue-500/15 text-white'
                          : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fee preview */}
            {amount && parseFloat(amount) > 0 && !amountError && (
              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                {isEVM && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Network Fee (est.)</span>
                    <span className="text-white/80">Fetched live on send</span>
                  </div>
                )}
                {blockchain === 'bitcoin' && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Fee Rate</span>
                    <span className="text-white/80">Live mempool rate (sat/vbyte) · paid in BTC</span>
                  </div>
                )}
                {blockchain === 'solana' && (
                  <div className="flex justify-between">
                    <span className="text-white/50">Network Fee</span>
                    <span className="text-white/80">~0.000005 SOL</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-white/50">You send</span>
                  <span className="text-white font-semibold">{amount} {token}</span>
                </div>
              </div>
            )}

            {/* Send button */}
            <Button
              onClick={handleSendClick}
              disabled={!canSend}
              className="w-full h-14 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-2xl transition-all"
            >
              {isSending
                ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Broadcasting…</>
                : <><SendIcon className="w-5 h-5 mr-2" /> Review & Send</>
              }
            </Button>

          </div>
        </motion.div>
      </div>

      <AIChatbot />
    </div>
  );
}
