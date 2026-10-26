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

  /**
   * Deterministic 32-bit positive integer ID for local notifications
   */
  static getDeterministicId(prefix: string, key: string): number {
    let hash = 0;
    const str = `${prefix}_${key}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 900000) + 10000;
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
   * Schedule recurring daily reminder to log expenses at 9 PM (or user-chosen time)
   */
  static async scheduleDailyReminder(settings: BudgetSettings): Promise<void> {
    const DAILY_REMINDER_ID = 99999;
    if (!settings.dailyReminderEnabled) {
      if (this.isNative()) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
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
        ? 'Did you log your purchases and expenses today? Keep your household budget on track!'
        : 'هل سجلت مشتريات ومصاريف اليوم؟ دقيقة واحدة تحافظ على ميزانية بيتك!';

    if (this.isNative()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: DAILY_REMINDER_ID }] });
        await LocalNotifications.schedule({
          notifications: [
            {
              id: DAILY_REMINDER_ID,
              title,
              body,
              schedule: {
                on: {
                  hour,
                  minute,
                },
                allowWhileIdle: true,
              },
            },
          ],
        });
      } catch (err) {
        console.error('Failed to schedule daily reminder on native:', err);
      }
    }
  }

  /**
   * Cancels a scheduled notification for a specific recurring bill (e.g. when paid or deleted)
   */
  static async cancelBillNotification(billId: string): Promise<void> {
    if (this.isNative()) {
      try {
        const notifId = this.getDeterministicId('bill', billId);
        await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
      } catch (err) {
        console.warn('Failed to cancel bill notification:', err);
      }
    }
  }

  /**
   * Schedule bill notifications deterministically at 9:00 AM on due day minus lead days.
   * Also returns active in-app notifications for due bills.
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
      let isDueSoon = false;
      let timingLabel = '';

      if (diff === 0) {
        isDueSoon = true;
        timingLabel = settings.language === 'en' ? 'Today!' : 'اليوم!';
      } else if (diff === 1 && leadDays >= 1) {
        isDueSoon = true;
        timingLabel = settings.language === 'en' ? 'Tomorrow' : 'غداً';
      } else if (diff > 1 && diff <= leadDays) {
        isDueSoon = true;
        timingLabel = settings.language === 'en' ? `in ${diff} days` : `خلال ${diff} أيام`;
      }

      const formattedAmount = formatMoney(bill.amount, settings.currency);
      const title =
        settings.language === 'en'
          ? `Upcoming Bill: ${bill.title}`
          : `تذكير فاتورة مستحقة: ${bill.title}`;
      const body =
        settings.language === 'en'
          ? `Bill "${bill.title}" of ${formattedAmount} is due ${timingLabel} (Day ${bill.dueDay}).`
          : `تستحق فاتورة "${bill.title}" بمبلغ ${formattedAmount} موعد السداد ${timingLabel} (يوم ${bill.dueDay} من الشهر).`;

      if (isDueSoon) {
        inAppNotifications.push({
          id: `notif-${bill.id}-${now.toISOString().split('T')[0]}`,
          title,
          body,
          billId: bill.id,
          timestamp: Date.now(),
        });
      }

      if (this.isNative()) {
        try {
          const numericId = this.getDeterministicId('bill', bill.id);
          // Calculate next notification trigger date at 9:00 AM
          const targetDate = new Date(now.getFullYear(), now.getMonth(), bill.dueDay, 9, 0, 0);
          if (targetDate.getTime() < now.getTime()) {
            targetDate.setMonth(targetDate.getMonth() + 1);
          }
          const scheduledTrigger = new Date(targetDate.getTime() - leadDays * 86400000);

          if (scheduledTrigger.getTime() > now.getTime()) {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: numericId,
                  title,
                  body,
                  schedule: { at: scheduledTrigger, allowWhileIdle: true },
                },
              ],
            });
          }
        } catch {
          // ignore native scheduling error
        }
      } else if (isDueSoon) {
        triggerBrowserNotification(title, body, `bill-${bill.id}`);
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
