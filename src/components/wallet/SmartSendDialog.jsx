import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, ArrowRight, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import TransactionBuilder from './TransactionBuilder';

// ─── Public API helpers ────────────────────────────────────────────────────────

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || '';
const MEMPOOL_BASE      = 'https://mempool.space/api';
const ETHERSCAN_BASE    = 'https://api.etherscan.io/api';

async function fetchEthBalance(address) {
  const url  = `${ETHERSCAN_BASE}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.status !== '1') throw new Error(json.message || 'Etherscan error');
  return parseFloat(json.result) / 1e18; // wei → ETH
}

async function fetchBtcBalance(address) {
  const res  = await fetch(`${MEMPOOL_BASE}/address/${address}`);
  if (!res.ok) throw new Error('Mempool.space balance error');
  const json = await res.json();
  const sats  = json.chain_stats.funded_txo_sum - json.chain_stats.spent_txo_sum;
  return sats / 1e8; // sats → BTC
}

async function fetchEthGasPrices() {
  const url  = `${ETHERSCAN_BASE}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.status !== '1') throw new Error('Gas oracle error');
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = json.result;
  return {
    slow:     Number(SafeGasPrice),
    standard: Number(ProposeGasPrice),
    fast:     Number(FastGasPrice),
  };
}

/**
 * Fetches BTC fee rates from Mempool.space — consistent with signTransaction.ts backend.
 * minimumFee  → slow    (many blocks / economy)
 * halfHourFee → standard (~3 blocks / ~30 min)
 * fastestFee  → fast    (next block)
 *
 * Previously used Blockstream which returned different values than the backend.
 * Now both UI and backend use the same Mempool.space source.
 */
async function fetchBtcFeeRates() {
  const res  = await fetch(`${MEMPOOL_BASE}/v1/fees/recommended`);
  if (!res.ok) throw new Error('BTC fee estimate unavailable');
  const json = await res.json();
  return {
    slow:     json.minimumFee  ?? 1,
    standard: json.halfHourFee ?? 10,
    fast:     json.fastestFee  ?? 20,
  };
}

// ─── Wallet loader ─────────────────────────────────────────────────────────────

function getSavedWallets() {
  try {
    return JSON.parse(localStorage.getItem('imported_wallets') || '[]');
  } catch {
    return [];
  }
}

async function refreshWalletBalance(wallet) {
  try {
    let balance = 0;
    if (['ethereum', 'polygon', 'bsc'].includes(wallet.blockchain)) {
      balance = await fetchEthBalance(wallet.address);
    } else if (wallet.blockchain === 'bitcoin') {
      // Use Mempool.space for BTC balances (consistent with UTXO/fee APIs)
      balance = await fetchBtcBalance(wallet.address);
    }
    return { ...wallet, balance, balanceUpdatedAt: Date.now() };
  } catch (err) {
    console.warn(`Could not refresh balance for ${wallet.address}:`, err);
    return wallet;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const BLOCKCHAIN_SYMBOL = {
  ethereum: 'ETH',
  bitcoin:  'BTC',
  solana:   'SOL',
  polygon:  'MATIC',
  bsc:      'BNB',
};

export default function SmartSendDialog({ isOpen, onClose, availableBalances }) {
  const [wallets,          setWallets]          = useState([]);
  const [loadingWallets,   setLoadingWallets]   = useState(false);
  const [walletError,      setWalletError]      = useState('');

  const [selectedToken,    setSelectedToken]    = useState('ETH');
  const [amount,           setAmount]           = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const [gasPrices,        setGasPrices]        = useState(null);
  const [isAnalyzing,      setIsAnalyzing]      = useState(false);
  const [recommendation,   setRecommendation]   = useState(null);

  const [selectedWallet,   setSelectedWallet]   = useState(null);
  const [showTxBuilder,    setShowTxBuilder]    = useState(false);

  // ── Load & refresh wallets ─────────────────────────────────────────────────
  const loadWallets = useCallback(async () => {
    setLoadingWallets(true);
    setWalletError('');
    try {
      const saved = getSavedWallets();
      if (saved.length === 0) {
        setWalletError('No imported wallets found. Import a wallet first.');
        setWallets([]);
        return;
      }

      const now = Date.now();
      const refreshed = await Promise.all(
        saved.map(w =>
          !w.balanceUpdatedAt || now - w.balanceUpdatedAt > 2 * 60 * 1000
            ? refreshWalletBalance(w)
            : Promise.resolve(w)
        )
      );

      localStorage.setItem('imported_wallets', JSON.stringify(refreshed));
      setWallets(refreshed);
    } catch (err) {
      setWalletError('Failed to load wallets: ' + err.message);
    } finally {
      setLoadingWallets(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadWallets();
  }, [isOpen, loadWallets]);

  // ── Derived: wallets matching selected token ───────────────────────────────
  const matchingWallets = wallets.filter(
    w => BLOCKCHAIN_SYMBOL[w.blockchain] === selectedToken
  );

  const totalAvailable = matchingWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // ── Analyze: fetch real gas + build recommendation ─────────────────────────
  const handleAnalyze = async () => {
    if (!amount || !recipientAddress) {
      toast.error('Please enter amount and recipient address');
      return;
    }
    if (parseFloat(amount) > totalAvailable) {
      toast.error(`Insufficient balance. Available: ${totalAvailable.toFixed(6)} ${selectedToken}`);
      return;
    }

    setIsAnalyzing(true);
    setRecommendation(null);
    try {
      let fees;
      let feeUnit;

      if (selectedToken === 'ETH') {
        const gwei = await fetchEthGasPrices();
        setGasPrices(gwei);
        const GAS_LIMIT = 21000;
        feeUnit = 'ETH';
        fees = {
          slow: {
            label:   'Slow (~5–10 min)',
            gwei:    gwei.slow,
            cost:    (gwei.slow     * GAS_LIMIT) / 1e9,
            costStr: ((gwei.slow     * GAS_LIMIT) / 1e9).toFixed(6),
          },
          standard: {
            label:   'Standard (~1–3 min)',
            gwei:    gwei.standard,
            cost:    (gwei.standard * GAS_LIMIT) / 1e9,
            costStr: ((gwei.standard * GAS_LIMIT) / 1e9).toFixed(6),
          },
          fast: {
            label:   'Fast (<1 min)',
            gwei:    gwei.fast,
            cost:    (gwei.fast     * GAS_LIMIT) / 1e9,
            costStr: ((gwei.fast     * GAS_LIMIT) / 1e9).toFixed(6),
          },
        };
      } else if (selectedToken === 'BTC') {
        // Mempool.space — same source as signTransaction.ts backend
        const rates = await fetchBtcFeeRates();
        const TX_VBYTES = 250;
        feeUnit = 'BTC';
        fees = {
          slow: {
            label:   'Economy (many blocks)',
            satVb:   rates.slow,
            cost:    (rates.slow     * TX_VBYTES) / 1e8,
            costStr: ((rates.slow     * TX_VBYTES) / 1e8).toFixed(8),
          },
          standard: {
            label:   'Standard (~30 min)',
            satVb:   rates.standard,
            cost:    (rates.standard * TX_VBYTES) / 1e8,
            costStr: ((rates.standard * TX_VBYTES) / 1e8).toFixed(8),
          },
          fast: {
            label:   'Priority (next block)',
            satVb:   rates.fast,
            cost:    (rates.fast     * TX_VBYTES) / 1e8,
            costStr: ((rates.fast     * TX_VBYTES) / 1e8).toFixed(8),
          },
        };
      } else {
        throw new Error(`Fee estimation not supported for ${selectedToken} yet.`);
      }

      const amountF    = parseFloat(amount);
      const bestWallet = matchingWallets
        .filter(w => (w.balance || 0) >= amountF + fees.standard.cost)
        .sort((a, b) => b.balance - a.balance)[0]
        || matchingWallets.sort((a, b) => b.balance - a.balance)[0];

      const rec = buildRecommendation({
        amount: amountF, selectedToken, fees, feeUnit,
        bestWallet, matchingWallets, recipientAddress,
      });
      setRecommendation({ text: rec, fees, bestWallet });
    } catch (err) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = () => {
    if (!recommendation?.bestWallet) {
      toast.error('No suitable wallet found with sufficient balance');
      return;
    }
    setSelectedWallet(recommendation.bestWallet);
    setShowTxBuilder(true);
  };

  const reset = () => {
    setRecommendation(null);
    setAmount('');
    setRecipientAddress('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Smart Send — AI Optimized</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Wallet status bar */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            {loadingWallets ? (
              <span className="text-white/50 text-sm flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Refreshing balances…
              </span>
            ) : walletError ? (
              <span className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> {walletError}
              </span>
            ) : (
              <span className="text-white/70 text-sm">
                {wallets.length} wallet{wallets.length !== 1 ? 's' : ''} loaded ·{' '}
                <span className="text-green-400 font-medium">
                  {totalAvailable.toFixed(6)} {selectedToken} available
                </span>
              </span>
            )}
            <button onClick={loadWallets} className="text-white/40 hover:text-white/80 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Token selector */}
          <div>
            <Label className="text-white/70">Token</Label>
            <select
              value={selectedToken}
              onChange={e => { setSelectedToken(e.target.value); setRecommendation(null); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mt-2 focus:outline-none focus:border-purple-500"
            >
              <option value="ETH">ETH — Ethereum</option>
              <option value="BTC">BTC — Bitcoin</option>
              <option value="MATIC">MATIC — Polygon</option>
              <option value="BNB">BNB — BSC</option>
            </select>
          </div>

          <div>
            <Label className="text-white/70">Amount</Label>
            <Input
              type="number"
              step="0.0001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          <div>
            <Label className="text-white/70">Recipient Address</Label>
            <Input
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              placeholder={selectedToken === 'BTC' ? 'bc1... or 1... or 3...' : '0x...'}
              className="bg-white/5 border-white/10 text-white mt-2"
            />
          </div>

          {/* Analyze button */}
          {!recommendation && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || loadingWallets || !amount || !recipientAddress}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching live gas & fees…</>
              ) : (
                'Analyze Best Strategy'
              )}
            </Button>
          )}

          {/* Recommendation panel */}
          {recommendation && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-2">Optimization Report</h3>
                  <p className="text-white/70 text-sm whitespace-pre-wrap">{recommendation.text}</p>
                </div>
              </div>

              {/* Fee comparison table */}
              {recommendation.fees && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {Object.entries(recommendation.fees).map(([speed, f]) => (
                    <div key={speed} className="bg-white/5 rounded-lg p-2">
                      <p className="text-white/50 capitalize">{speed}</p>
                      <p className="text-white font-mono">{f.costStr}</p>
                      {f.gwei  && <p className="text-purple-400">{f.gwei} Gwei</p>}
                      {f.satVb && <p className="text-orange-400">{f.satVb} sat/vB</p>}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={reset} variant="outline" className="flex-1">Analyze Again</Button>
                <Button
                  onClick={handleExecute}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  Proceed <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-400" />
              <p className="text-blue-400 text-sm font-medium">Live Data Sources</p>
            </div>
            <p className="text-blue-300 text-xs">
              ETH gas via Etherscan Gas Oracle · BTC fees & balances via Mempool.space · Balances refreshed every 2 min.
            </p>
          </div>
        </div>

        {showTxBuilder && selectedWallet && (
          <TransactionBuilder
            isOpen={showTxBuilder}
            onClose={() => { setShowTxBuilder(false); onClose(); }}
            wallet={selectedWallet}
            initialTo={recipientAddress}
            initialAmount={amount}
            gasPrices={gasPrices}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Recommendation text builder ──────────────────────────────────────────────

function buildRecommendation({ amount, selectedToken, fees, feeUnit, bestWallet, matchingWallets, recipientAddress }) {
  const lines = [];

  if (!bestWallet) {
    lines.push(`⚠️  No wallet has sufficient ${selectedToken} to cover ${amount} ${selectedToken} + fees.`);
    lines.push(`Total available across ${matchingWallets.length} wallet(s): ${matchingWallets.reduce((s, w) => s + (w.balance || 0), 0).toFixed(6)} ${selectedToken}`);
    return lines.join('\n');
  }

  lines.push(`✅  Recommended wallet: ${bestWallet.label || bestWallet.address.slice(0, 10) + '…'}`);
  lines.push(`    Address: ${bestWallet.address}`);
  lines.push(`    Balance: ${(bestWallet.balance || 0).toFixed(6)} ${selectedToken}`);
  lines.push('');
  lines.push(`📤  Sending ${amount} ${selectedToken} → ${recipientAddress.slice(0, 8)}…${recipientAddress.slice(-6)}`);
  lines.push('');
  lines.push('💸  Fee options (live · mempool.space):');
  lines.push(`    • Economy  : ${fees.slow.costStr} ${feeUnit}  — ${fees.slow.label}`);
  lines.push(`    • Standard : ${fees.standard.costStr} ${feeUnit}  — ${fees.standard.label}`);
  lines.push(`    • Priority : ${fees.fast.costStr} ${feeUnit}  — ${fees.fast.label}`);
  lines.push('');

  const totalStd  = amount + fees.standard.cost;
  const remaining = (bestWallet.balance || 0) - totalStd;
  lines.push(`💰  Total (standard): ${totalStd.toFixed(6)} ${selectedToken}  |  Remaining: ${remaining.toFixed(6)} ${selectedToken}`);

  if (matchingWallets.length > 1) {
    lines.push('');
    lines.push(`ℹ️   You have ${matchingWallets.length} ${selectedToken} wallets. Using the one with the largest balance.`);
  }

  if (selectedToken === 'BTC' && matchingWallets.length > 1) {
    lines.push('');
    lines.push('🔗  UTXO tip: Consider consolidating your BTC wallets during low-fee periods to reduce future costs.');
  }

  return lines.join('\n');
}
