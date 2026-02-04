
// Mock Service for Multi-channel Notifications including Web Push & Service Worker

type Channel = 'email' | 'sms' | 'push';
type TemplateType = 'booking_confirmed' | 'payment_received' | 'kyc_status' | 'new_message' | 'payout_sent' | 'admin_alert' | 'kyc_email_confirm';

interface NotificationPayload {
  userId: string;
  template: TemplateType;
  data: Record<string, any>;
  channels: Channel[];
}

const buildNotificationMessage = (payload: NotificationPayload) => {
  let title = "Événéo";
  let content = "";
  let url = "/";

  switch(payload.template) {
      case 'booking_confirmed':
          title = "🎉 Nouvelle Commande !";
          content = `La réservation pour ${payload.data.eventName} est confirmée. Préparez-vous !`;
          url = `/event/${payload.data.eventId}`;
          break;
      case 'payment_received':
          title = "💰 Paiement Reçu";
          content = `Paiement de ${payload.data.amount} reçu. Facture #${payload.data.invoiceId} disponible.`;
          url = `/wallet`;
          break;
      case 'payout_sent':
          title = "💸 Virement Effectué";
          content = `Virement de ${payload.data.amount} envoyé vers votre compte bancaire.`;
          url = `/wallet`;
          break;
      case 'new_message':
          title = `💬 Nouveau Message`;
          content = `${payload.data.sender} vous a envoyé un message.`;
          url = `/messages?provider=${payload.data.providerId}`;
          break;
      case 'kyc_status':
          title = "Identité";
          content = `Votre statut est maintenant : ${payload.data.status}.`;
          if (payload.data.reason) {
              content += ` Raison: ${payload.data.reason}`;
          }
          url = `/dashboard/provider`;
          break;
      case 'kyc_email_confirm':
          title = "Vérification Email";
          content = "Cliquez ici pour valider votre email.";
          break;
      case 'admin_alert':
          title = "Alerte Admin";
          content = payload.data.message;
          break;
      default:
          content = "Vous avez une nouvelle notification Événéo.";
  }

  return { title, content, url };
};

export const notificationService = {
  // Request permission for Web Notifications
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.warn('Permission request error:', error);
        return false;
    }
  },

  async send(payload: NotificationPayload): Promise<void> {
    try {
      const { title, content, url } = buildNotificationMessage(payload);
      const raw = localStorage.getItem('eveneo_notifications');
      const parsed = raw ? (JSON.parse(raw) as any[]) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const next = [
        {
          id: `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title,
          content,
          url,
          createdAt: Date.now(),
          read: false,
        },
        ...list
      ].slice(0, 50);
      localStorage.setItem('eveneo_notifications', JSON.stringify(next));
    } catch {
      // ignore
    }

    console.group(`[Notification System] Processing ${payload.template} for User ${payload.userId}`);

    for (const channel of payload.channels) {
      try {
        await this.dispatchToChannel(channel, payload);
        console.log(`✅ Sent via ${channel.toUpperCase()}`);
      } catch (error) {
        // Use warn instead of error for expected failures like permission denied
        console.warn(`⚠️ Failed via ${channel.toUpperCase()}. Reason: ${error}. Attempting fallback...`);
        // Fallback logic
        if (channel === 'push') {
            console.log(`➡️ Fallback: Sending Email instead.`);
            // await this.dispatchToChannel('email', payload); // Fallback mock
        }
      }
    }
    console.groupEnd();
  },

  async dispatchToChannel(channel: Channel, payload: NotificationPayload): Promise<boolean> {
    const { title, content, url } = buildNotificationMessage(payload);

    if (channel === 'push') {
        // Check SW Registration for Mobile/PWA Push
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if(reg.active && Notification.permission === 'granted') {
                    // In a real app, we would send payload to backend to trigger PushManager.
                    // Since we are simulating client-side, we ask the SW to show notification via postMessage
                    // OR fallback to standard Notification API if SW push event isn't triggerable from here.
                    
                    // Native SW Notification (Best for PWA)
                    reg.showNotification(title, {
                        body: content,
                        icon: 'https://ui-avatars.com/api/?name=E&background=8A2DF9&color=fff&size=192&rounded=true&bold=true',
                        badge: 'https://ui-avatars.com/api/?name=E&background=fff&color=000&size=96&rounded=true',
                        data: { url },
                        vibrate: [200, 100, 200]
                    } as any);
                    return true;
                }
            } catch (e) {
                console.warn("SW Push failed, falling back to standard notification", e);
            }
        }

        // Browser Notification API (Fallback)
        if (typeof Notification === 'undefined') {
            return Promise.reject('Notification API not available');
        }

        if (Notification.permission === 'granted') {
            try {
                const n = new Notification(title, {
                    body: content,
                    icon: 'https://ui-avatars.com/api/?name=E&background=8A2DF9&color=fff&size=192&rounded=true&bold=true'
                });
                n.onclick = () => {
                    window.location.href = '#' + url;
                    window.focus();
                };
                return Promise.resolve(true);
            } catch (e) {
                return Promise.reject('Notification instantiation failed');
            }
        } else if (Notification.permission !== 'denied') {
            const granted = await this.requestPermission();
            if (granted) {
                // Recursive call after permission
                return this.dispatchToChannel('push', payload);
            }
        }
        return Promise.reject('Permission denied or not granted');
    }

    // Mock Email/SMS async network request
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[${channel.toUpperCase()}] To: ${payload.userId} | Subject: ${title} | Body: "${content}"`);
        resolve(true);
      }, 500);
    });
  }
};
