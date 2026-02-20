import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Zap, Clock, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// ─── Fee helpers ───────────────────────────────────────────────────────────────

const MEMPOOL_BASE    = 'https://mempool.space/api';
const ETHERSCAN_BASE  = 'https://api.etherscan.io/api';
const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || '';

async function fetchEthGasPrices() {
  const url  = `${ETHERSCAN_BASE}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.status !== '1') throw new Error('Gas oracle unavailable');
  return {
    slow:     Number(json.result.SafeGasPrice),
    standard: Number(json.result.ProposeGasPrice),
    fast:     Number(json.result.FastGasPrice),
  };
}

/**
 * Fetches BTC fee rates from Mempool.space — matches what signTransaction.ts uses.
 * minimumFee  → slow    (~economy, many blocks)
 * halfHourFee → standard (~3 blocks / 30 min)
 * fastestFee  → fast    (next block)
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

function buildEthGasOptions(gwei) {
  const GAS_LIMIT = 21000;
  return [
    {
      value:   'slow',
      label:   'Economy',
      icon:    Clock,
      time:    '5–10 min',
      detail:  `${gwei.slow} Gwei`,
      costRaw: (gwei.slow     * GAS_LIMIT) / 1e9,
      cost:    `${((gwei.slow     * GAS_LIMIT) / 1e9).toFixed(6)} ETH`,
      color:   'text-blue-400',
    },
    {
      value:   'standard',
      label:   'Standard',
      icon:    Zap,
      time:    '1–3 min',
      detail:  `${gwei.standard} Gwei`,
      costRaw: (gwei.standard * GAS_LIMIT) / 1e9,
      cost:    `${((gwei.standard * GAS_LIMIT) / 1e9).toFixed(6)} ETH`,
      color:   'text-purple-400',
    },
    {
      value:   'fast',
      label:   'Priority',
      icon:    Zap,
      time:    '< 1 min',
      detail:  `${gwei.fast} Gwei`,
      costRaw: (gwei.fast     * GAS_LIMIT) / 1e9,
      cost:    `${((gwei.fast     * GAS_LIMIT) / 1e9).toFixed(6)} ETH`,
      color:   'text-orange-400',
    },
  ];
}

function buildBtcFeeOptions(rates) {
  const TX_VBYTES = 250; // typical P2PKH tx estimate
  return [
    {
      value:   'slow',
      label:   'Economy',
      icon:    Clock,
      time:    'Many blocks',
      detail:  `${rates.slow} sat/vB`,
      costRaw: (rates.slow     * TX_VBYTES) / 1e8,
      cost:    `${((rates.slow     * TX_VBYTES) / 1e8).toFixed(8)} BTC`,
      color:   'text-blue-400',
    },
    {
      value:   'standard',
      label:   'Standard',
      icon:    Zap,
      time:    '~30 min',
      detail:  `${rates.standard} sat/vB`,
      costRaw: (rates.standard * TX_VBYTES) / 1e8,
      cost:    `${((rates.standard * TX_VBYTES) / 1e8).toFixed(8)} BTC`,
      color:   'text-purple-400',
    },
    {
      value:   'fast',
      label:   'Next Block',
      icon:    Zap,
      time:    '< 10 min',
      detail:  `${rates.fast} sat/vB`,
      costRaw: (rates.fast     * TX_VBYTES) / 1e8,
      cost:    `${((rates.fast     * TX_VBYTES) / 1e8).toFixed(8)} BTC`,
      color:   'text-orange-400',
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionBuilder({
  isOpen,
  onClose,
  wallet,
  initialTo     = '',
  initialAmount = '',
  gasPrices     = null, // pre-fetched ETH gas from SmartSendDialog (optional)
}) {
  const [step,         setStep]         = useState(1);
  const [toAddress,    setToAddress]    = useState(initialTo);
  const [amount,       setAmount]       = useState(initialAmount);
  const [gasOption,    setGasOption]    = useState('standard');
  const [gasOptions,   setGasOptions]   = useState([]);
  const [loadingGas,   setLoadingGas]   = useState(false);
  const [gasError,     setGasError]     = useState('');
  const [txPreview,    setTxPreview]    = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult,     setTxResult]     = useState(null);

  const isEvm = wallet?.blockchain !== 'bitcoin' && wallet?.blockchain !== 'solana';

  // ── Load live gas/fee prices when entering step 2 ─────────────────────────
  const loadGasOptions = async () => {
    setLoadingGas(true);
    setGasError('');
    try {
      let options;
      if (wallet?.blockchain === 'bitcoin') {
        // Mempool.space — same source as signTransaction.ts backend
        const rates = await fetchBtcFeeRates();
        options = buildBtcFeeOptions(rates);
      } else {
        // Use pre-fetched ETH gas if available; otherwise re-fetch
        const gwei = gasPrices ?? await fetchEthGasPrices();
        options = buildEthGasOptions(gwei);
      }
      setGasOptions(options);
    } catch (err) {
      setGasError('Could not fetch live fees — using estimates.');
      if (wallet?.blockchain === 'bitcoin') {
        setGasOptions(buildBtcFeeOptions({ slow: 1, standard: 10, fast: 20 }));
      } else {
        setGasOptions(buildEthGasOptions({ slow: 20, standard: 30, fast: 50 }));
      }
    } finally {
      setLoadingGas(false);
    }
  };

  const handleContinueToGas = () => {
    if (!toAddress || !amount) { toast.error('Fill in all fields'); return; }
    setStep(2);
    loadGasOptions();
  };

  const handlePreviewTransaction = () => {
    const selected = gasOptions.find(g => g.value === gasOption);
    setTxPreview({
      from:       wallet.address,
      to:         toAddress,
      amount:     parseFloat(amount),
      blockchain: wallet.blockchain,
      gas:        selected,
      total:      parseFloat(amount) + selected.costRaw,
    });
    setStep(3);
  };

  // ── Broadcast via signTransaction backend ─────────────────────────────────
  const handleSignAndBroadcast = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        wallet_id:  wallet.id,
        to_address: txPreview.to,
        amount:     String(txPreview.amount),
        blockchain: txPreview.blockchain,
        // Only pass gas_option for EVM — BTC uses live sat/vbyte, SOL uses fixed fee
        ...(isEvm && { gas_option: gasOption }),
      };

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

      setTxResult({
        hash:        data.transaction_hash,
        explorerUrl: data.explorer_url,
        fee:         data.fee,
        fee_unit:    data.fee_unit,
      });
      setStep(4);

    } catch (err) {
      toast.error(err.message || String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Fee label per chain ────────────────────────────────────────────────────
  const feeUnit = wallet?.blockchain === 'bitcoin' ? 'BTC'
                : wallet?.blockchain === 'solana'  ? 'SOL'
                : 'ETH';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            Secure Transaction Builder
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-purple-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* ── Step 1: Details ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">From Wallet</Label>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mt-2">
                <p className="text-white font-medium">{wallet?.label || 'Wallet'}</p>
                <p className="text-white/50 text-sm font-mono break-all">{wallet?.address}</p>
                <p className="text-purple-400 text-sm mt-1">
                  Balance: {(wallet?.balance || 0).toFixed(6)} {wallet?.blockchain?.toUpperCase()}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-white/70">Recipient Address</Label>
              <Input
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                placeholder={wallet?.blockchain === 'bitcoin' ? 'bc1q… or 1… or 3…' : '0x…'}
                className="bg-white/5 border-white/10 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white/70">Amount</Label>
              <div className="relative mt-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10 text-white pr-20"
                />
                <button
                  onClick={() => setAmount(String(Math.max(0, (wallet?.balance || 0) - 0.001)))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-medium hover:text-purple-300"
                >
                  MAX
                </button>
              </div>
            </div>

            <Button
              onClick={handleContinueToGas}
              disabled={!toAddress || !amount}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Continue to Fee Options
            </Button>
          </div>
        )}

        {/* ── Step 2: Fee selection ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Choose Transaction Speed</h3>
              <span className="text-white/40 text-xs">
                live · {wallet?.blockchain === 'bitcoin' ? 'mempool.space' : 'etherscan'}
              </span>
            </div>

            {loadingGas ? (
              <div className="flex items-center justify-center py-8 gap-2 text-white/50">
                <Loader2 className="w-4 h-4 animate-spin" /> Fetching live fees…
              </div>
            ) : (
              <>
                {gasError && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {gasError}
                  </div>
                )}

                <div className="space-y-3">
                  {gasOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setGasOption(option.value)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          gasOption === option.value
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${option.color}`} />
                            <div>
                              <p className="text-white font-medium">{option.label}</p>
                              <p className="text-white/50 text-sm">{option.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium font-mono">{option.detail}</p>
                            <p className="text-white/50 text-sm">{option.cost}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">Back</Button>
              <Button
                onClick={handlePreviewTransaction}
                disabled={loadingGas || gasOptions.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Review Transaction
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ────────────────────────────────────────────────── */}
        {step === 3 && txPreview && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-medium mb-1">Transaction Summary</h3>

              {[
                ['From',    `${txPreview.from.slice(0,10)}…${txPreview.from.slice(-8)}`],
                ['To',      `${txPreview.to.slice(0,10)}…${txPreview.to.slice(-8)}`],
                ['Amount',  `${txPreview.amount} ${txPreview.blockchain.toUpperCase()}`],
                ['Fee',     `${txPreview.gas.cost}  (${txPreview.gas.label} · ${txPreview.gas.time})`],
                ['Total',   `${txPreview.total.toFixed(8)} ${txPreview.blockchain.toUpperCase()}`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white font-mono">{val}</span>
                </div>
              ))}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-300 text-xs">
                Transactions are irreversible once broadcast. Double-check the recipient address before confirming.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">Back</Button>
              <Button
                onClick={handleSignAndBroadcast}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing…</>
                  : 'Sign & Broadcast'
                }
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ───────────────────────────────────────────────── */}
        {step === 4 && txResult && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-white text-xl font-semibold">Transaction Sent!</h3>

            {txResult.fee && (
              <p className="text-white/50 text-sm">
                Fee paid: {txResult.fee} {txResult.fee_unit ?? feeUnit}
              </p>
            )}

            {txResult.hash && (
              <p className="text-white/40 text-xs font-mono break-all px-2">{txResult.hash}</p>
            )}

            {txResult.explorerUrl && (
              <a
                href={txResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 mt-4"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
