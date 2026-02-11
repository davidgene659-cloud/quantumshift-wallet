import { base44 } from '@/api/base44Client';

export const notificationManager = {
  // Request browser notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },

  // Send browser push notification
  sendPushNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=96&h=96&fit=crop',
        badge: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=32&h=32&fit=crop',
        ...options
      });
    }
  },

  // Show in-app toast notification (using sonner)
  showInAppNotification(message, type = 'info') {
    // This will be called from components that have access to toast
    return message;
  },

  // Check price movement and trigger notifications
  async checkPriceMovement(currentPrices, previousPrices, user, preferences) {
    if (!user || !preferences || preferences.length === 0) return;

    for (const pref of preferences) {
      if (!pref.enabled) continue;

      const symbol = pref.asset_symbol;
      const currentPrice = currentPrices[symbol];
      const previousPrice = previousPrices[symbol];

      if (!currentPrice || !previousPrice) continue;

      const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
      const absChange = Math.abs(changePercent);

      // Check if change meets threshold
      if (absChange >= pref.price_change_percent) {
        const direction = changePercent > 0 ? 'up' : 'down';
        
        // Check if we should alert based on direction preference
        if (pref.direction === 'both' || pref.direction === direction) {
          const message = `${symbol} is ${direction === 'up' ? '📈' : '📉'} ${Math.abs(changePercent).toFixed(2)}% - Now $${currentPrice.toFixed(2)}`;
          
          if (pref.push_enabled) {
            this.sendPushNotification(`${symbol} Price Alert`, {
              body: message,
              tag: `price-${symbol}`,
              requireInteraction: false
            });
          }

          // Track notification
          try {
            await base44.entities.NotificationLog?.create?.({
              user_id: user.id,
              type: 'price_movement',
              asset: symbol,
              change_percent: changePercent,
              message: message,
              sent_at: new Date().toISOString()
            });
          } catch (e) {
            // Ignore if NotificationLog entity doesn't exist
          }
        }
      }
    }
  },

  // Check transaction status and trigger notifications
  async checkTransactionStatus(transactions, user, preferences) {
    if (!user || !transactions || transactions.length === 0) return;

    const transactionPrefs = preferences.filter(p => 
      p.notification_type === 'transaction_status' || p.notification_type === 'both'
    );

    if (transactionPrefs.length === 0) return;

    for (const tx of transactions) {
      // Only notify on status changes (pending -> completed/failed)
      if (tx.status === 'completed' || tx.status === 'failed') {
        const statusIcon = tx.status === 'completed' ? '✅' : '❌';
        const message = `${statusIcon} ${tx.from_token} ${tx.type} - ${tx.status.toUpperCase()}`;
        
        if (transactionPrefs[0]?.push_enabled) {
          this.sendPushNotification(`Transaction ${tx.status}`, {
            body: message,
            tag: `tx-${tx.id}`,
            requireInteraction: tx.status === 'failed'
          });
        }

        try {
          await base44.entities.NotificationLog?.create?.({
            user_id: user.id,
            type: 'transaction_status',
            transaction_id: tx.id,
            status: tx.status,
            message: message,
            sent_at: new Date().toISOString()
          });
        } catch (e) {
          // Ignore if NotificationLog entity doesn't exist
        }
      }
    }
  }
};