import { LocalNotifications } from '@capacitor/local-notifications';
import { RecurringBill, BudgetSettings, InAppNotification } from '../types';
import { formatMoney } from './storage';
import { triggerBrowserNotification, isNotificationSupported } from './notifications';

export class NativeNotificationService {
  private static isNative(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  }

  static async requestPermissions(): Promise<boolean> {
    if (this.isNative()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } catch (e) {
        console.error('Capacitor LocalNotifications permission error:', e);
        return false;
      }
    } else if (isNotificationSupported()) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }

  static async checkPermissions(): Promise<'granted' | 'denied' | 'prompt'> {
    if (this.isNative()) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display === 'granted') return 'granted';
        if (status.display === 'denied') return 'denied';
        return 'prompt';
      } catch {
        return 'prompt';
      }
    } else if (isNotificationSupported()) {
      if (Notification.permission === 'granted') return 'granted';
      if (Notification.permission === 'denied') return 'denied';
      return 'prompt';
    }
    return 'denied';
  }

  /**
   * Schedule recurring daily reminder to log expenses (e.g. at 21:00 / 9 PM)
   */
  static async scheduleDailyReminder(settings: BudgetSettings) {
    if (!settings.dailyReminderEnabled) {
      if (this.isNative()) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: 99999 }] });
        } catch {
          // ignore
        }
      }
      return;
    }

    const [hourStr, minuteStr] = (settings.dailyReminderTime || '21:00').split(':');
    const hour = parseInt(hourStr, 10) || 21;
    const minute = parseInt(minuteStr, 10) || 0;

    const title = settings.language === 'en' ? 'Daily Expense Reminder' : 'تذكير مصاريف البيت اليومي';
    const body =
      settings.language === 'en'
        ? 'Did you log your purchases and expenses today? Keep your budget on track!'
        : 'هل سجلت مشترياتك ومصاريف اليوم؟ دقيقة واحدة تحافظ على ميزانية بيتك!';

    if (this.isNative()) {
      try {
        // Cancel existing daily reminder before rescheduling
        await LocalNotifications.cancel({ notifications: [{ id: 99999 }] });
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 99999,
              title,
              body,
              schedule: {
                on: {
                  hour,
                  minute,
                },
                allowWhileIdle: true,
              },
              sound: 'beep.wav',
            },
          ],
        });
      } catch (err) {
        console.error('Failed to schedule daily reminder on native:', err);
      }
    }
  }

  /**
   * Schedule bill notifications and return in-app notifications
   */
  static async scheduleBillReminders(
    bills: RecurringBill[],
    settings: BudgetSettings
  ): Promise<InAppNotification[]> {
    if (!settings.notificationsEnabled) return [];

    const now = new Date();
    const currentDay = now.getDate();
    const leadDays = settings.notificationLeadDays ?? 1;
    const inAppNotifications: InAppNotification[] = [];

    const dueBills = bills.filter((b) => !b.isPaid && b.reminderEnabled !== false);

    for (const bill of dueBills) {
      const diff = bill.dueDay - currentDay;
      let shouldNotify = false;
      let timingLabel = '';

      if (diff === 0) {
        shouldNotify = true;
        timingLabel = settings.language === 'en' ? 'Today!' : 'اليوم!';
      } else if (diff === 1 && leadDays >= 1) {
        shouldNotify = true;
        timingLabel = settings.language === 'en' ? 'Tomorrow' : 'غداً';
      } else if (diff > 1 && diff <= leadDays) {
        shouldNotify = true;
        timingLabel = settings.language === 'en' ? `in ${diff} days` : `خلال ${diff} أيام`;
      }

      if (shouldNotify) {
        const formattedAmount = formatMoney(bill.amount, settings.currency);
        const title =
          settings.language === 'en'
            ? `Upcoming Bill: ${bill.title}`
            : `تذكير فاتورة مستحقة: ${bill.title}`;
        const body =
          settings.language === 'en'
            ? `Bill "${bill.title}" of ${formattedAmount} is due ${timingLabel} (Day ${bill.dueDay}).`
            : `تستحق فاتورة "${bill.title}" بمبلغ ${formattedAmount} موعد السداد ${timingLabel} (يوم ${bill.dueDay} من الشهر).`;

        inAppNotifications.push({
          id: `notif-${bill.id}-${now.toISOString().split('T')[0]}`,
          title,
          body,
          billId: bill.id,
          timestamp: Date.now(),
        });

        if (this.isNative()) {
          try {
            const numericId = parseInt(bill.id.replace(/\D/g, '').slice(0, 8), 10) || Math.floor(Math.random() * 100000);
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: numericId,
                  title,
                  body,
                  schedule: { at: new Date(Date.now() + 1000) },
                },
              ],
            });
          } catch {
            // fallback
          }
        } else {
          triggerBrowserNotification(title, body, `bill-${bill.id}`);
        }
      }
    }

    return inAppNotifications;
  }

  /**
   * Send test notification
   */
  static async sendTest(settings: BudgetSettings) {
    const formattedAmount = formatMoney(420, settings.currency);
    const title = settings.language === 'en' ? 'Test Notification: Electricity Bill' : 'تنبيه تجريبي: فاتورة الكهرباء';
    const body =
      settings.language === 'en'
        ? `This is a test notification for Home Expenses. Bill amount: ${formattedAmount}.`
        : `هذا إشعار تجريبي لاختبار التنبيهات المحلية لمصاريف البيت. الفاتورة بمبلغ ${formattedAmount} مستحقة.`;

    if (this.isNative()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 88888,
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
            },
          ],
        });
      } catch (err) {
        console.error('Failed to send native test notification:', err);
      }
    } else {
      triggerBrowserNotification(title, body, 'test-notif');
    }

    return { title, body };
  }
}
