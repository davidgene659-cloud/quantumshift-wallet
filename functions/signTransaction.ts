/**
 * signTransaction.ts
 * Real transaction signing + broadcasting for BTC, ETH, ERC-20, SOL
 * Uses free public RPC/API endpoints — no paid API keys required.
 *
 * Runtime: Deno-compatible (also works on Node 18+ with minor fetch polyfill)
 *
 * Dependencies (Deno ESM imports — no npm install needed):
 *   ethers v6     – EVM signing
 *   @noble/secp256k1  – BTC signing (pure JS, Deno-safe)
 *   @noble/hashes     – SHA256/RIPEMD160 for BTC address/script work
 *   @solana/web3.js   – Solana signing + broadcast
 */

// ─── Imports ──────────────────────────────────────────────────────────────────

// Ethers v6 (EVM: ETH, ERC-20, Polygon, BSC)
import { ethers } from "npm:ethers@6.11.1";

// Noble crypto primitives for Bitcoin (pure JS, no native deps)
import * as secp256k1 from "npm:@noble/secp256k1@2.1.0";
import { sha256 } from "npm:@noble/hashes@1.4.0/sha256";
import { ripemd160 } from "npm:@noble/hashes@1.4.0/ripemd160";
import { bytesToHex, hexToBytes, concatBytes } from "npm:@noble/hashes@1.4.0/utils";

// Solana
// PINNED VERSIONS — do not upgrade without testing on Deno Deploy:
//   web3.js  1.87.6  — last stable before breaking Deno ESM changes
//   spl-token 0.3.9  — last version before @solana/spl-token-group was added,
//                      which pulls in @solana/codecs that Deno Deploy cannot resolve.
//                      0.4.x and above will boot-fail with "mapEncoder" export error.
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "npm:@solana/web3.js@1.87.6";

import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getMint,
} from "npm:@solana/spl-token@0.3.9";

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// ─── Free Public RPC Endpoints ────────────────────────────────────────────────
// These are rate-limited but functional for low-volume use.
// Swap in your own keys when ready.

const RPC = {
  ethereum:  "https://eth.llamarpc.com",
  polygon:   "https://polygon.llamarpc.com",
  bsc:       "https://bsc-dataseed.binance.org",
  solana:    "https://api.mainnet-beta.solana.com",
  // Bitcoin uses REST APIs (no RPC needed for free tier)
  btc_mempool: "https://mempool.space/api",
  btc_fallback: "https://blockstream.info/api",
};

// ERC-20 transfer ABI (minimal — only what we need)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type GasOption = "slow" | "standard" | "fast";
type Blockchain = "ethereum" | "polygon" | "bsc" | "bitcoin" | "solana";

interface TxRequest {
  wallet_id: string;
  to_address: string;
  amount: string;          // human-readable, e.g. "0.01"
  blockchain: Blockchain;
  token_contract?: string; // for ERC-20 / SPL
  gas_option?: GasOption;
}

interface TxResult {
  success: boolean;
  transaction_hash: string;
  from: string;
  to: string;
  amount: string;
  fee_eth?: string;       // EVM: fee in native token
  fee_usd_estimate?: string;
  estimated_time?: string;
  explorer_url: string;
  status: "pending" | "confirmed";
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TxRequest = await req.json();
    const {
      wallet_id,
      to_address,
      amount,
      blockchain,
      token_contract,
      gas_option = "standard",
    } = body;

    // ── Validate inputs ──────────────────────────────────────────────────────

    if (!wallet_id || !to_address || !amount || !blockchain) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    // ── Load wallet + vault ──────────────────────────────────────────────────

    const wallet = await base44.entities.ImportedWallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: "Wallet not found" }, { status: 404 });
    }

    const vaults = await base44.entities.SecureVault.filter({
      user_id: user.id,
      wallet_id,
    });

    if (vaults.length === 0) {
      return Response.json({
        error: "No private key stored for this wallet. Please import your private key first.",
      }, { status: 400 });
    }

    const vault = vaults[0];

    if (!vault.spending_enabled) {
      return Response.json({
        error: "Spending is disabled for this wallet. Enable it in vault settings.",
      }, { status: 403 });
    }

    // ── Decrypt private key ──────────────────────────────────────────────────
    // Key = SHA-256(userId + ENCRYPTION_SECRET) — same scheme as original

    const appSecret = Deno.env.get("ENCRYPTION_SECRET");
    if (!appSecret) {
      return Response.json({
        error: "Server misconfiguration: ENCRYPTION_SECRET not set",
      }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const keyMaterial = `${user.id}-${appSecret}`;
    const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(keyMaterial));

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyHash, { name: "AES-GCM" }, false, ["decrypt"]
    );

    const encryptedData = Uint8Array.from(
      atob(vault.encrypted_private_key), c => c.charCodeAt(0)
    );
    const iv = Uint8Array.from(
      atob(vault.encryption_iv), c => c.charCodeAt(0)
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, cryptoKey, encryptedData
    );

    const privateKey = decoder.decode(decryptedBuffer);

    // ── Route to chain-specific handler ─────────────────────────────────────

    let result: TxResult;

    switch (blockchain) {
      case "ethereum":
      case "polygon":
      case "bsc":
        if (token_contract) {
          result = await sendERC20(
            privateKey, wallet.address, to_address,
            amount, token_contract, blockchain, gas_option
          );
        } else {
          result = await sendEVM(
            privateKey, wallet.address, to_address,
            amount, blockchain, gas_option
          );
        }
        break;

      case "bitcoin":
        result = await sendBTC(privateKey, wallet.address, to_address, amount);
        break;

      case "solana":
        result = await sendSOL(
          privateKey, wallet.address, to_address, amount, token_contract
        );
        break;

      default:
        return Response.json({ error: `Unsupported blockchain: ${blockchain}` }, { status: 400 });
    }

    // ── Record transaction in DB ─────────────────────────────────────────────

    await base44.asServiceRole.entities.SecureVault.update(vault.id, {
      last_used: new Date().toISOString(),
    });

    await base44.entities.Transaction.create({
      user_id: user.id,
      type: "withdraw",
      from_token: blockchain.toUpperCase(),
      to_token: blockchain.toUpperCase(),
      from_amount: amountFloat,
      to_amount: amountFloat,
      tx_hash: result.transaction_hash,
      fee: result.fee_eth ?? "0",
      status: "pending",
      explorer_url: result.explorer_url,
    });

    return Response.json(result);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("signTransaction error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVM — ETH / Polygon / BSC native transfers
// ═══════════════════════════════════════════════════════════════════════════════

async function sendEVM(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  blockchain: "ethereum" | "polygon" | "bsc",
  gasOption: GasOption
): Promise<TxResult> {
  const rpcUrl = RPC[blockchain];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(normalizeEvmKey(privateKey), provider);

  // Validate sender matches stored address
  if (signer.address.toLowerCase() !== fromAddress.toLowerCase()) {
    throw new Error("Private key does not match wallet address");
  }

  // ── Fetch real gas fees (EIP-1559) ────────────────────────────────────────
  const feeData = await provider.getFeeData();

  // Priority fee multipliers per speed
  const priorityMultiplier: Record<GasOption, bigint> = {
    slow:     BigInt(8),   // 8 Gwei tip
    standard: BigInt(15),
    fast:     BigInt(30),
  };

  const maxPriorityFeePerGas = ethers.parseUnits(
    priorityMultiplier[gasOption].toString(), "gwei"
  );

  // maxFeePerGas = 2x baseFee + priorityFee (EIP-1559 standard formula)
  const baseFee = feeData.lastBaseFeePerGas ?? ethers.parseUnits("20", "gwei");
  const maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;

  const estimatedTime: Record<GasOption, string> = {
    slow:     "5–10 min",
    standard: "1–3 min",
    fast:     "< 30 sec",
  };

  // ── Build + estimate gas ──────────────────────────────────────────────────
  const valueWei = ethers.parseEther(amount);

  // Check balance covers amount + max possible fee
  const balance = await provider.getBalance(signer.address);
  const gasLimit = BigInt(21000); // native ETH transfer always 21000
  const maxFee = maxFeePerGas * gasLimit;

  if (balance < valueWei + maxFee) {
    const balanceEth = ethers.formatEther(balance);
    const neededEth = ethers.formatEther(valueWei + maxFee);
    throw new Error(
      `Insufficient balance. Have ${balanceEth}, need ~${neededEth} (amount + fee)`
    );
  }

  // ── Build transaction ─────────────────────────────────────────────────────
  const nonce = await provider.getTransactionCount(signer.address, "latest");
  const network = await provider.getNetwork();

  const tx: ethers.TransactionRequest = {
    type: 2, // EIP-1559
    to: toAddress,
    value: valueWei,
    nonce,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    chainId: network.chainId,
  };

  // ── Sign + broadcast ──────────────────────────────────────────────────────
  const sentTx = await signer.sendTransaction(tx);
  const feeEth = ethers.formatEther(maxFeePerGas * gasLimit);

  const explorerMap: Record<string, string> = {
    ethereum: `https://etherscan.io/tx/${sentTx.hash}`,
    polygon:  `https://polygonscan.com/tx/${sentTx.hash}`,
    bsc:      `https://bscscan.com/tx/${sentTx.hash}`,
  };

  return {
    success: true,
    transaction_hash: sentTx.hash,
    from: signer.address,
    to: toAddress,
    amount,
    fee_eth: feeEth,
    estimated_time: estimatedTime[gasOption],
    explorer_url: explorerMap[blockchain],
    status: "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVM — ERC-20 token transfers
// ═══════════════════════════════════════════════════════════════════════════════

async function sendERC20(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: string,       // human-readable token units, e.g. "100.5" USDC
  contractAddress: string,
  blockchain: "ethereum" | "polygon" | "bsc",
  gasOption: GasOption
): Promise<TxResult> {
  const rpcUrl = RPC[blockchain];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(normalizeEvmKey(privateKey), provider);

  if (signer.address.toLowerCase() !== fromAddress.toLowerCase()) {
    throw new Error("Private key does not match wallet address");
  }

  const contract = new ethers.Contract(contractAddress, ERC20_ABI, signer);

  // Fetch token decimals from chain (real value, not assumed)
  const decimals: number = await contract.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);

  // Check token balance
  const tokenBalance: bigint = await contract.balanceOf(signer.address);
  if (tokenBalance < amountWei) {
    throw new Error(
      `Insufficient token balance. Have ${ethers.formatUnits(tokenBalance, decimals)}, need ${amount}`
    );
  }

  // Estimate gas for ERC-20 transfer (varies: ~65000–100000)
  const gasEstimate = await provider.estimateGas({
    from: signer.address,
    to: contractAddress,
    data: contract.interface.encodeFunctionData("transfer", [toAddress, amountWei]),
  });

  // Add 20% buffer to estimate
  const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

  // EIP-1559 fees
  const feeData = await provider.getFeeData();
  const baseFee = feeData.lastBaseFeePerGas ?? ethers.parseUnits("20", "gwei");

  const priorityGwei: Record<GasOption, number> = {
    slow: 8, standard: 15, fast: 30
  };
  const maxPriorityFeePerGas = ethers.parseUnits(
    priorityGwei[gasOption].toString(), "gwei"
  );
  const maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;

  // Check ETH balance for gas
  const ethBalance = await provider.getBalance(signer.address);
  const maxGasCost = maxFeePerGas * gasLimit;
  if (ethBalance < maxGasCost) {
    throw new Error(
      `Insufficient ETH for gas. Need ~${ethers.formatEther(maxGasCost)} ETH for fees.`
    );
  }

  // Send
  const sentTx = await contract.transfer(toAddress, amountWei, {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type: 2,
  });

  const feeEth = ethers.formatEther(maxFeePerGas * gasLimit);

  const explorerMap: Record<string, string> = {
    ethereum: `https://etherscan.io/tx/${sentTx.hash}`,
    polygon:  `https://polygonscan.com/tx/${sentTx.hash}`,
    bsc:      `https://bscscan.com/tx/${sentTx.hash}`,
  };

  return {
    success: true,
    transaction_hash: sentTx.hash,
    from: signer.address,
    to: toAddress,
    amount,
    fee_eth: feeEth,
    explorer_url: explorerMap[blockchain],
    status: "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bitcoin — UTXO selection, fee calculation, signing, broadcast
// ═══════════════════════════════════════════════════════════════════════════════

interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  status: { confirmed: boolean };
}

async function sendBTC(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: string // BTC, e.g. "0.001"
): Promise<TxResult> {

  const amountSats = Math.round(parseFloat(amount) * 1e8);
  if (amountSats < 546) throw new Error("Amount below Bitcoin dust limit (546 sat)");

  // ── Fetch UTXOs (mempool.space, fallback to blockstream) ──────────────────
  let utxos: UTXO[] = await fetchBTCUtxos(fromAddress);

  if (utxos.length === 0) {
    throw new Error("No UTXOs found. Wallet may have zero confirmed balance.");
  }

  // Only use confirmed UTXOs to avoid double-spend risk
  utxos = utxos.filter(u => u.status.confirmed);
  if (utxos.length === 0) {
    throw new Error("No confirmed UTXOs. Wait for pending transactions to confirm.");
  }

  // ── Fetch real fee rate (sat/vbyte) ───────────────────────────────────────
  const feeRate = await fetchBTCFeeRate(); // sat/vbyte for "standard" (~1–3 block)

  // ── UTXO selection (simple largest-first greedy) ──────────────────────────
  // Sorts largest first to minimize number of inputs (smaller tx = lower fee)
  utxos.sort((a, b) => b.value - a.value);

  // Estimate tx size to calculate fee
  // P2PKH: 10 base + 148*inputs + 34*outputs (2 outputs: recipient + change)
  // We iterate adding UTXOs until we cover amount + fee
  let selectedUtxos: UTXO[] = [];
  let totalInput = 0;
  let fee = 0;

  for (const utxo of utxos) {
    selectedUtxos.push(utxo);
    totalInput += utxo.value;

    const inputCount = selectedUtxos.length;
    const outputCount = 2; // recipient + change
    const estimatedVBytes = 10 + (148 * inputCount) + (34 * outputCount);
    fee = Math.ceil(estimatedVBytes * feeRate);

    if (totalInput >= amountSats + fee) break;
  }

  if (totalInput < amountSats + fee) {
    const totalBTC = (totalInput / 1e8).toFixed(8);
    const neededBTC = ((amountSats + fee) / 1e8).toFixed(8);
    throw new Error(
      `Insufficient BTC. Have ${totalBTC} BTC (${totalInput} sat), ` +
      `need ${neededBTC} BTC (amount + ${fee} sat fee)`
    );
  }

  const changeSats = totalInput - amountSats - fee;

  // ── Build + sign raw transaction ──────────────────────────────────────────
  const rawHex = await buildAndSignBTCTx(
    privateKey,
    fromAddress,
    toAddress,
    amountSats,
    changeSats,
    selectedUtxos,
    feeRate
  );

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const txid = await broadcastBTCTx(rawHex);

  return {
    success: true,
    transaction_hash: txid,
    from: fromAddress,
    to: toAddress,
    amount,
    fee_eth: (fee / 1e8).toFixed(8) + " BTC",
    explorer_url: `https://mempool.space/tx/${txid}`,
    status: "pending",
  };
}

async function fetchBTCUtxos(address: string): Promise<UTXO[]> {
  // Try mempool.space first
  try {
    const res = await fetch(`${RPC.btc_mempool}/address/${address}/utxo`);
    if (res.ok) return await res.json();
  } catch { /* fall through */ }

  // Fallback: blockstream.info
  const res = await fetch(`${RPC.btc_fallback}/address/${address}/utxo`);
  if (!res.ok) throw new Error("Failed to fetch UTXOs from both mempool.space and blockstream");
  return await res.json();
}

async function fetchBTCFeeRate(): Promise<number> {
  // mempool.space recommended fees (sat/vbyte)
  try {
    const res = await fetch(`${RPC.btc_mempool}/v1/fees/recommended`);
    if (res.ok) {
      const fees = await res.json();
      // halfHourFee = confirms in ~3 blocks (~30 min) — good default
      return fees.halfHourFee ?? fees.fastestFee ?? 10;
    }
  } catch { /* fall through */ }

  // Fallback: blockstream fee estimate
  try {
    const res = await fetch(`${RPC.btc_fallback}/fee-estimates`);
    if (res.ok) {
      const fees = await res.json();
      return Math.ceil(fees["6"] ?? 10); // 6-block target
    }
  } catch { /* ignore */ }

  return 10; // conservative hardcoded fallback (sat/vbyte)
}

async function buildAndSignBTCTx(
  privateKeyWIF: string,
  fromAddress: string,
  toAddress: string,
  amountSats: number,
  changeSats: number,
  utxos: UTXO[],
  _feeRate: number
): Promise<string> {
  /**
   * Builds a P2PKH (legacy) or P2WPKH (SegWit) raw transaction.
   * Detects address type from prefix:
   *   1... = P2PKH (legacy)
   *   3... = P2SH-wrapped SegWit
   *   bc1q.. = native SegWit (P2WPKH)
   */

  // Decode WIF private key to raw bytes
  const privKeyBytes = wifToPrivKey(privateKeyWIF);
  const pubKeyBytes  = secp256k1.getPublicKey(privKeyBytes, true); // compressed

  const isSegwit = toAddress.startsWith("bc1") || fromAddress.startsWith("bc1");

  if (isSegwit) {
    return buildSegwitTx(privKeyBytes, pubKeyBytes, fromAddress, toAddress, amountSats, changeSats, utxos);
  } else {
    return buildLegacyTx(privKeyBytes, pubKeyBytes, fromAddress, toAddress, amountSats, changeSats, utxos);
  }
}

function buildLegacyTx(
  privKey: Uint8Array,
  pubKey: Uint8Array,
  fromAddress: string,
  toAddress: string,
  amountSats: number,
  changeSats: number,
  utxos: UTXO[]
): string {
  // ── Helper writers ────────────────────────────────────────────────────────
  const writeUint32LE = (n: number): Uint8Array => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, true);
    return b;
  };

  const writeUint64LE = (n: number): Uint8Array => {
    // JavaScript safe integer limit is 2^53, sufficient for BTC satoshis
    const b = new Uint8Array(8);
    const view = new DataView(b.buffer);
    view.setUint32(0, n & 0xffffffff, true);
    view.setUint32(4, Math.floor(n / 0x100000000), true);
    return b;
  };

  const writeVarInt = (n: number): Uint8Array => {
    if (n < 0xfd) return new Uint8Array([n]);
    if (n < 0xffff) return new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);
    throw new Error("VarInt > 0xffff not supported");
  };

  const p2pkhScript = (addr: string): Uint8Array => {
    const hash = base58CheckDecode(addr);
    // OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    return concatBytes(
      new Uint8Array([0x76, 0xa9, 0x14]),
      hash,
      new Uint8Array([0x88, 0xac])
    );
  };

  // ── Build unsigned tx for signing (SIGHASH_ALL per input) ────────────────
  const version    = writeUint32LE(1);
  const locktime   = writeUint32LE(0);
  const sighashAll = writeUint32LE(1);

  const fromScript = p2pkhScript(fromAddress);
  const toScript   = p2pkhScript(toAddress);
  const changeScript = p2pkhScript(fromAddress); // change back to sender

  const outputs: Uint8Array[] = [];
  outputs.push(concatBytes(writeUint64LE(amountSats), writeVarInt(toScript.length), toScript));
  if (changeSats > 546) { // only add change output if above dust
    outputs.push(concatBytes(writeUint64LE(changeSats), writeVarInt(changeScript.length), changeScript));
  }
  const outputCount = writeVarInt(outputs.length);

  // Sign each input separately (SIGHASH_ALL)
  const signedInputs: Uint8Array[] = [];

  for (let i = 0; i < utxos.length; i++) {
    const utxo = utxos[i];

    // Build signing preimage: all inputs, but only input i has fromScript; others empty
    const inputsForSig: Uint8Array[] = utxos.map((u, j) => {
      const txidBytes = hexToBytes(u.txid).reverse(); // little-endian
      const vout = writeUint32LE(u.vout);
      const seq  = new Uint8Array([0xff, 0xff, 0xff, 0xff]);

      if (j === i) {
        return concatBytes(txidBytes, vout, writeVarInt(fromScript.length), fromScript, seq);
      } else {
        return concatBytes(txidBytes, vout, new Uint8Array([0x00]), seq);
      }
    });

    const preimage = concatBytes(
      version,
      writeVarInt(utxos.length),
      ...inputsForSig,
      outputCount,
      ...outputs,
      locktime,
      sighashAll
    );

    // Double-SHA256 of preimage
    const hash = sha256(sha256(preimage));

    // Sign with secp256k1
    const sig = secp256k1.sign(hash, privKey);
    const derSig = concatBytes(sig.toDERRawBytes(), new Uint8Array([0x01])); // SIGHASH_ALL byte

    // scriptSig: <sig> <pubkey>
    const scriptSig = concatBytes(
      writeVarInt(derSig.length),
      derSig,
      writeVarInt(pubKey.length),
      pubKey
    );

    const txidBytes = hexToBytes(utxo.txid).reverse();
    signedInputs.push(concatBytes(
      txidBytes,
      writeUint32LE(utxo.vout),
      writeVarInt(scriptSig.length),
      scriptSig,
      new Uint8Array([0xff, 0xff, 0xff, 0xff]) // sequence
    ));
  }

  const finalTx = concatBytes(
    version,
    writeVarInt(signedInputs.length),
    ...signedInputs,
    outputCount,
    ...outputs,
    locktime
  );

  return bytesToHex(finalTx);
}

function buildSegwitTx(
  privKey: Uint8Array,
  pubKey: Uint8Array,
  fromAddress: string,
  toAddress: string,
  amountSats: number,
  changeSats: number,
  utxos: UTXO[]
): string {
  /**
   * BIP143 SegWit v0 P2WPKH transaction signing.
   * Witness data replaces scriptSig for SegWit inputs.
   */
  const writeUint32LE = (n: number): Uint8Array => {
    const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b;
  };
  const writeUint64LE = (n: number): Uint8Array => {
    const b = new Uint8Array(8);
    new DataView(b.buffer).setUint32(0, n & 0xffffffff, true);
    new DataView(b.buffer).setUint32(4, Math.floor(n / 0x100000000), true);
    return b;
  };
  const writeVarInt = (n: number): Uint8Array =>
    n < 0xfd ? new Uint8Array([n]) : new Uint8Array([0xfd, n & 0xff, (n >> 8) & 0xff]);

  const pubKeyHash = ripemd160(sha256(pubKey));

  // scriptPubKey for P2WPKH: OP_0 <20-byte-hash>
  const p2wpkhScript = (hash: Uint8Array) =>
    concatBytes(new Uint8Array([0x00, 0x14]), hash);

  // scriptCode used in BIP143 sighash: OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG
  const scriptCode = concatBytes(
    new Uint8Array([0x19, 0x76, 0xa9, 0x14]),
    pubKeyHash,
    new Uint8Array([0x88, 0xac])
  );

  // BIP143 preimage components
  const version = writeUint32LE(1);
  const locktime = writeUint32LE(0);

  // hashPrevouts: double-SHA256 of all outpoints
  const allOutpoints = concatBytes(...utxos.map(u =>
    concatBytes(hexToBytes(u.txid).reverse(), writeUint32LE(u.vout))
  ));
  const hashPrevouts = sha256(sha256(allOutpoints));

  // hashSequence: double-SHA256 of all sequences (0xffffffff each)
  const allSeqs = concatBytes(...utxos.map(() => new Uint8Array([0xff, 0xff, 0xff, 0xff])));
  const hashSequence = sha256(sha256(allSeqs));

  // Outputs
  const toScript     = p2wpkhScript(bech32Decode(toAddress));
  const changeScript = p2wpkhScript(pubKeyHash);

  const outputsList: Uint8Array[] = [
    concatBytes(writeUint64LE(amountSats), writeVarInt(toScript.length), toScript),
  ];
  if (changeSats > 546) {
    outputsList.push(concatBytes(writeUint64LE(changeSats), writeVarInt(changeScript.length), changeScript));
  }
  const hashOutputs = sha256(sha256(concatBytes(...outputsList)));

  // Sign each input (BIP143)
  const witnesses: Uint8Array[][] = [];

  for (let i = 0; i < utxos.length; i++) {
    const utxo = utxos[i];
    const outpoint = concatBytes(hexToBytes(utxo.txid).reverse(), writeUint32LE(utxo.vout));

    const sigHash = sha256(sha256(concatBytes(
      version,
      hashPrevouts,
      hashSequence,
      outpoint,
      scriptCode,
      writeUint64LE(utxo.value),
      new Uint8Array([0xff, 0xff, 0xff, 0xff]), // sequence
      hashOutputs,
      locktime,
      writeUint32LE(1) // SIGHASH_ALL
    )));

    const sig = secp256k1.sign(sigHash, privKey);
    const derSig = concatBytes(sig.toDERRawBytes(), new Uint8Array([0x01]));

    witnesses.push([derSig, pubKey]);
  }

  // Assemble segwit tx (marker 0x00 flag 0x01)
  const inputs = concatBytes(...utxos.map((u, i) =>
    concatBytes(
      hexToBytes(u.txid).reverse(),
      writeUint32LE(u.vout),
      new Uint8Array([0x00]), // empty scriptSig for segwit
      new Uint8Array([0xff, 0xff, 0xff, 0xff])
    )
  ));

  const witnessData = concatBytes(...witnesses.map(w =>
    concatBytes(
      writeVarInt(w.length),
      ...w.map(item => concatBytes(writeVarInt(item.length), item))
    )
  ));

  const outputCount = writeVarInt(outputsList.length);
  const finalTx = concatBytes(
    version,
    new Uint8Array([0x00, 0x01]), // segwit marker + flag
    writeVarInt(utxos.length),
    inputs,
    outputCount,
    ...outputsList,
    witnessData,
    locktime
  );

  return bytesToHex(finalTx);
}

async function broadcastBTCTx(rawHex: string): Promise<string> {
  // Try mempool.space
  try {
    const res = await fetch(`${RPC.btc_mempool}/tx`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: rawHex,
    });
    if (res.ok) return await res.text(); // returns txid
    const err = await res.text();
    if (!err.includes("already")) throw new Error(`mempool.space broadcast: ${err}`);
  } catch (e) {
    if (String(e).includes("mempool.space broadcast")) throw e;
  }

  // Fallback: blockstream.info
  const res = await fetch(`${RPC.btc_fallback}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: rawHex,
  });
  if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
  return await res.text();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Solana — SOL + SPL token transfers
// ═══════════════════════════════════════════════════════════════════════════════

async function sendSOL(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  tokenMint?: string // if present: SPL token transfer
): Promise<TxResult> {
  const connection = new Connection(RPC.solana, "confirmed");

  // Decode private key (supports base58 or raw 64-byte hex/Uint8Array)
  const keypair = decodeSolanaKeypair(privateKey);

  // Sanity check
  if (keypair.publicKey.toBase58() !== fromAddress) {
    throw new Error("Private key does not match wallet address");
  }

  const toPubkey = new PublicKey(toAddress);
  let txHash: string;

  if (tokenMint) {
    // ── SPL token transfer ───────────────────────────────────────────────────
    // createTransferCheckedInstruction is the correct API in spl-token 0.3.9
    // It requires mint + decimals for on-chain decimal verification.
    const mintPubkey = new PublicKey(tokenMint);
    const mintInfo   = await getMint(connection, mintPubkey);
    const decimals   = mintInfo.decimals;
    const amountRaw  = BigInt(Math.round(parseFloat(amount) * 10 ** decimals));

    // Get or create associated token accounts (keypair pays for account creation if needed)
    const fromATA = await getOrCreateAssociatedTokenAccount(
      connection, keypair, mintPubkey, keypair.publicKey
    );
    const toATA = await getOrCreateAssociatedTokenAccount(
      connection, keypair, mintPubkey, toPubkey
    );

    const tx = new Transaction().add(
      // Args: source, mint, destination, owner, amount, decimals
      createTransferCheckedInstruction(
        fromATA.address,
        mintPubkey,
        toATA.address,
        keypair.publicKey,
        amountRaw,
        decimals
      )
    );

    txHash = await sendAndConfirmTransaction(connection, tx, [keypair]);
  } else {
    // ── Native SOL transfer ──────────────────────────────────────────────────
    const lamports = Math.round(parseFloat(amount) * LAMPORTS_PER_SOL);

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    const fee = 5000; // ~5000 lamports typical tx fee

    if (balance < lamports + fee + rentExempt) {
      const balSOL = balance / LAMPORTS_PER_SOL;
      const needSOL = (lamports + fee) / LAMPORTS_PER_SOL;
      throw new Error(
        `Insufficient SOL. Have ${balSOL.toFixed(6)}, need ~${needSOL.toFixed(6)}`
      );
    }

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey,
        lamports,
      })
    );

    txHash = await sendAndConfirmTransaction(connection, tx, [keypair]);
  }

  return {
    success: true,
    transaction_hash: txHash,
    from: fromAddress,
    to: toAddress,
    amount,
    explorer_url: `https://solscan.io/tx/${txHash}`,
    status: "pending",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Crypto Utilities
// ═══════════════════════════════════════════════════════════════════════════════

/** Normalize EVM private key: strips 0x prefix, validates length */
function normalizeEvmKey(key: string): string {
  const stripped = key.startsWith("0x") ? key.slice(2) : key;
  if (stripped.length !== 64) throw new Error("Invalid EVM private key length");
  return "0x" + stripped;
}

/** Decode Bitcoin WIF private key to raw 32 bytes */
function wifToPrivKey(wif: string): Uint8Array {
  const decoded = base58Decode(wif);
  // WIF: 1 byte version + 32 bytes key + optional 0x01 compression flag + 4 byte checksum
  // Verify checksum
  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  const hash = sha256(sha256(payload));
  for (let i = 0; i < 4; i++) {
    if (hash[i] !== checksum[i]) throw new Error("Invalid WIF checksum");
  }
  // Skip version byte (1 byte), optionally skip compression flag
  const isCompressed = payload.length === 34;
  return payload.slice(1, isCompressed ? 33 : 32);
}

/** Decode Bitcoin Base58Check address to 20-byte hash */
function base58CheckDecode(addr: string): Uint8Array {
  const decoded = base58Decode(addr);
  const payload = decoded.slice(0, -4);
  return payload.slice(1); // skip version byte, return 20-byte hash
}

/** Bech32 decode for P2WPKH (bc1q...) — returns 20-byte witness program */
function bech32Decode(addr: string): Uint8Array {
  // Minimal bech32 decode for P2WPKH
  const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  const lower = addr.toLowerCase();
  const sepIdx = lower.lastIndexOf("1");
  const data = lower.slice(sepIdx + 1, -6); // strip hrp, separator, checksum

  const values = Array.from(data).map(c => CHARSET.indexOf(c));
  // Convert from 5-bit groups to 8-bit, skip witness version byte
  const bytes: number[] = [];
  let acc = 0, bits = 0;
  for (let i = 1; i < values.length; i++) { // i=1 skips witness version
    acc = (acc << 5) | values[i];
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes.slice(0, 20));
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(str: string): Uint8Array {
  let num = BigInt(0);
  for (const char of str) {
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Invalid Base58 character: ${char}`);
    num = num * BigInt(58) + BigInt(idx);
  }

  const bytes: number[] = [];
  while (num > BigInt(0)) {
    bytes.unshift(Number(num & BigInt(0xff)));
    num >>= BigInt(8);
  }

  // Leading '1's become 0x00 bytes
  for (const char of str) {
    if (char === "1") bytes.unshift(0);
    else break;
  }

  return new Uint8Array(bytes);
}

/** Decode Solana private key: supports base58, hex, or JSON array format */
function decodeSolanaKeypair(privateKey: string): Keypair {
  // JSON array format: [1,2,3,...64 numbers]
  if (privateKey.trim().startsWith("[")) {
    const arr = JSON.parse(privateKey);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // Hex format (128 chars = 64 bytes)
  if (/^[0-9a-fA-F]{128}$/.test(privateKey)) {
    return Keypair.fromSecretKey(hexToBytes(privateKey));
  }

  // Base58 format (most common for Solana)
  const decoded = base58Decode(privateKey);
  return Keypair.fromSecretKey(decoded);
}