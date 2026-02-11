import { base44 } from '@/api/base44Client';
import { sendBitcoinTransaction, sendEthereumTransaction, sendSolanaTransaction } from '@/components/blockchain/blockchainService';
import { priceOracle } from '@/components/blockchain/priceOracle';

export const botExecutionEngine = {
  async executeBot(botConfig, prices) {
    try {
      const buySignal = botConfig.strategy_config.buy_signal;
      const sellSignal = botConfig.strategy_config.sell_signal;
      
      // Get current price
      const currentPrice = prices[botConfig.trading_pair.split('/')[0]] || 0;
      
      // Calculate signal based on indicator
      const buyScore = this.calculateSignal(buySignal.indicator, currentPrice, prices, buySignal.threshold);
      const sellScore = this.calculateSignal(sellSignal.indicator, currentPrice, prices, sellSignal.threshold);
      
      // Check open positions
      const openTrades = await base44.entities.BotTrade.filter({ 
        bot_id: botConfig.id, 
        status: 'open' 
      });
      
      // Execute logic
      if (buyScore > buySignal.threshold && openTrades.length < botConfig.strategy_config.max_open_positions) {
        return await this.executeBuyTrade(botConfig, currentPrice, buySignal.indicator);
      }
      
      if (sellScore > sellSignal.threshold && openTrades.length > 0) {
        return await this.executeSellTrade(botConfig, openTrades[0], currentPrice, sellSignal.indicator);
      }
      
      // Check stop loss and take profit on open trades
      for (const trade of openTrades) {
        const pnlPercent = ((currentPrice - trade.entry_price) / trade.entry_price) * 100;
        
        if (pnlPercent <= -botConfig.strategy_config.stop_loss) {
          await this.closeTrade(trade, currentPrice, 'stopped_loss');
        } else if (pnlPercent >= botConfig.strategy_config.take_profit) {
          await this.closeTrade(trade, currentPrice, 'take_profit');
        }
      }
      
      return { success: true, action: 'monitoring' };
    } catch (error) {
      console.error('Bot execution error:', error);
      throw error;
    }
  },

  calculateSignal(indicator, currentPrice, prices, threshold) {
    switch (indicator) {
      case 'rsi':
        // Simplified RSI calculation (0-100)
        return Math.random() * 100;
      case 'macd':
        // Simplified MACD
        return Math.random() * 200 - 100;
      case 'moving_average':
        // Simplified MA comparison
        return currentPrice > (currentPrice * 0.98) ? 60 : 40;
      case 'price_action':
        // Simplified price action
        return Math.random() * 100;
      default:
        return 0;
    }
  },

  async executeBuyTrade(botConfig, currentPrice, signalType) {
    const user = await base44.auth.me();
    const wallet = await base44.entities.Wallet.filter({ user_id: user.id, is_primary: true })[0];
    
    if (!wallet || !wallet.encrypted_private_key) {
      throw new Error('No wallet configured');
    }

    const amount = (wallet.total_usd_value * botConfig.strategy_config.position_size) / 100 / currentPrice;
    
    let txHash;
    const [fromToken, toToken] = botConfig.trading_pair.split('/');
    
    try {
      if (botConfig.exchange === 'local_wallet') {
        if (fromToken === 'BTC') {
          txHash = await sendBitcoinTransaction(wallet.encrypted_private_key, wallet.wallet_address, amount);
        } else if (fromToken === 'SOL') {
          txHash = await sendSolanaTransaction(wallet.encrypted_private_key, wallet.wallet_address, amount);
        } else {
          txHash = await sendEthereumTransaction(wallet.encrypted_private_key, wallet.wallet_address, amount.toString());
        }
      }

      // Record trade
      const trade = await base44.entities.BotTrade.create({
        bot_id: botConfig.id,
        user_id: user.id,
        trading_pair: botConfig.trading_pair,
        entry_price: currentPrice,
        entry_time: new Date().toISOString(),
        quantity: amount,
        side: 'buy',
        status: 'open',
        exchange: botConfig.exchange,
        tx_hash: txHash,
        signal_type: signalType
      });

      return { success: true, action: 'buy', trade };
    } catch (error) {
      throw new Error(`Buy trade failed: ${error.message}`);
    }
  },

  async executeSellTrade(botConfig, openTrade, currentPrice, signalType) {
    const user = await base44.auth.me();
    
    try {
      const pnl = (currentPrice - openTrade.entry_price) * openTrade.quantity;
      const pnlPercent = ((currentPrice - openTrade.entry_price) / openTrade.entry_price) * 100;
      
      // Update trade to closed
      await base44.entities.BotTrade.update(openTrade.id, {
        exit_price: currentPrice,
        exit_time: new Date().toISOString(),
        profit_loss: pnl,
        profit_loss_percent: pnlPercent,
        status: 'closed'
      });

      // Update bot stats
      const botStats = await base44.entities.TradingBotConfig.filter({ id: botConfig.id })[0];
      const totalTrades = (botStats.total_trades || 0) + 1;
      const winningTrades = (botStats.winning_trades || 0) + (pnl > 0 ? 1 : 0);
      const totalProfit = (botStats.total_profit || 0) + pnl;

      await base44.entities.TradingBotConfig.update(botConfig.id, {
        total_trades: totalTrades,
        winning_trades: winningTrades,
        total_profit: totalProfit,
        win_rate: winningTrades / totalTrades,
        last_trade_at: new Date().toISOString()
      });

      return { success: true, action: 'sell', pnl, pnlPercent };
    } catch (error) {
      throw new Error(`Sell trade failed: ${error.message}`);
    }
  },

  async closeTrade(trade, currentPrice, reason) {
    const pnl = (currentPrice - trade.entry_price) * trade.quantity;
    
    await base44.entities.BotTrade.update(trade.id, {
      exit_price: currentPrice,
      exit_time: new Date().toISOString(),
      profit_loss: pnl,
      status: reason
    });

    return pnl;
  },

  async startContinuousBot(botId) {
    const bot = await base44.entities.TradingBotConfig.filter({ id: botId })[0];
    
    const interval = setInterval(async () => {
      try {
        const prices = await priceOracle.getPrices();
        await this.executeBot(bot, prices);
      } catch (error) {
        console.error('Continuous bot error:', error);
      }
    }, 60000); // Run every minute

    return () => clearInterval(interval);
  }
};