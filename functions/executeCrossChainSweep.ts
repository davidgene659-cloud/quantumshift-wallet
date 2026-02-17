import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sweep_plan_id, user_passphrase } = await req.json();

    if (!sweep_plan_id || !user_passphrase) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Retrieve the sweep plan (stored as a temporary entity or passed directly)
    // For now, we'll assume it's passed in the request body
    const { sweep_transactions } = await req.json();

    if (!sweep_transactions || sweep_transactions.length === 0) {
      return Response.json({ error: 'No transactions to execute' }, { status: 400 });
    }

    // SANITY CHECKS
    const sanityChecks = {
      passed: true,
      checks: [],
      warnings: []
    };

    // Check 1: Verify all source wallets have sufficient balance
    for (const tx of sweep_transactions) {
      const wallet = await base44.asServiceRole.entities.ImportedWallet.get(tx.wallet_id);
      if (!wallet) {
        sanityChecks.passed = false;
        sanityChecks.checks.push({
          name: 'Wallet Existence',
          status: 'failed',
          message: `Wallet ${tx.wallet_id} not found`
        });
        continue;
      }

      // Fetch current balance
      const balanceResponse = await base44.functions.invoke('checkAllBalances', {});
      const currentBalance = balanceResponse.data.wallets.find(w => w.address === wallet.address);
      
      if (!currentBalance || currentBalance.balance < tx.amount_to_sweep + tx.estimated_fee) {
        sanityChecks.passed = false;
        sanityChecks.checks.push({
          name: 'Sufficient Balance',
          status: 'failed',
          message: `Insufficient balance in ${wallet.address.slice(0, 8)}`
        });
      } else {
        sanityChecks.checks.push({
          name: 'Sufficient Balance',
          status: 'passed',
          message: `${wallet.address.slice(0, 8)} has sufficient funds`
        });
      }
    }

    // Check 2: Verify target wallet exists and is active
    const targetWalletId = sweep_transactions[0]?.target_wallet_id;
    if (targetWalletId) {
      const targetWallet = await base44.asServiceRole.entities.ImportedWallet.get(targetWalletId);
      if (!targetWallet || !targetWallet.is_active) {
        sanityChecks.passed = false;
        sanityChecks.checks.push({
          name: 'Target Wallet Valid',
          status: 'failed',
          message: 'Target wallet is invalid or inactive'
        });
      } else {
        sanityChecks.checks.push({
          name: 'Target Wallet Valid',
          status: 'passed',
          message: 'Target wallet is active'
        });
      }
    }

    // Check 3: Verify fees haven't spiked
    const gasOracleResponse = await base44.functions.invoke('getGasOracle', {
      blockchain: 'ethereum'
    });
    
    if (gasOracleResponse.data?.instant > 100) {
      sanityChecks.warnings.push({
        name: 'High Gas Fees',
        message: 'Gas fees are elevated. Consider waiting for lower fees.'
      });
    } else {
      sanityChecks.checks.push({
        name: 'Gas Fees Normal',
        status: 'passed',
        message: 'Current gas fees are acceptable'
      });
    }

    // Check 4: Verify total transaction value makes sense
    const totalValue = sweep_transactions.reduce((sum, tx) => sum + tx.value_to_sweep_usd, 0);
    const totalFees = sweep_transactions.reduce((sum, tx) => sum + tx.fee_usd, 0);
    const efficiency = (totalValue - totalFees) / totalValue * 100;

    if (efficiency < 90) {
      sanityChecks.warnings.push({
        name: 'Low Efficiency',
        message: `Transaction efficiency is ${efficiency.toFixed(1)}%. High fee percentage.`
      });
    } else {
      sanityChecks.checks.push({
        name: 'Efficiency Acceptable',
        status: 'passed',
        message: `Transaction efficiency: ${efficiency.toFixed(1)}%`
      });
    }

    if (!sanityChecks.passed) {
      return Response.json({
        success: false,
        error: 'Sanity checks failed',
        sanity_checks: sanityChecks
      }, { status: 400 });
    }

    // Execute transactions
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const tx of sweep_transactions) {
      try {
        // Get encrypted private key
        const vault = await base44.asServiceRole.entities.SecureVault.filter({
          wallet_id: tx.wallet_id,
          user_id: user.id
        });

        if (!vault || vault.length === 0) {
          results.push({
            wallet_id: tx.wallet_id,
            status: 'failed',
            error: 'Private key not found'
          });
          failCount++;
          continue;
        }

        // Sign and broadcast transaction
        const signResponse = await base44.functions.invoke('signTransaction', {
          wallet_id: tx.wallet_id,
          to_address: tx.target_address,
          amount: tx.amount_to_sweep,
          user_passphrase: user_passphrase
        });

        if (signResponse.data.success) {
          results.push({
            wallet_id: tx.wallet_id,
            address: tx.address,
            status: 'success',
            tx_hash: signResponse.data.tx_hash,
            amount: tx.amount_to_sweep,
            symbol: tx.symbol
          });
          successCount++;

          // Record transaction
          await base44.asServiceRole.entities.Transaction.create({
            user_id: user.id,
            type: 'withdraw',
            from_token: tx.symbol,
            from_amount: tx.amount_to_sweep,
            fee: tx.estimated_fee,
            status: 'completed',
            usd_value: tx.value_to_sweep_usd
          });
        } else {
          results.push({
            wallet_id: tx.wallet_id,
            status: 'failed',
            error: signResponse.data.error
          });
          failCount++;
        }

      } catch (error) {
        results.push({
          wallet_id: tx.wallet_id,
          status: 'failed',
          error: error.message
        });
        failCount++;
      }
    }

    return Response.json({
      success: successCount > 0,
      sanity_checks: sanityChecks,
      results: results,
      summary: {
        total: sweep_transactions.length,
        success: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});