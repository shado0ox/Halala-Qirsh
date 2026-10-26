import { LocalNotifications } from '@capacitor/local-notifications';
import { RecurringBill, BudgetSettings, InAppNotification } from '../types';
import { formatMoney } from './storage';
import { triggerBrowserNotification, isNotificationSupported } from './notifications';
import { withSystemFlow } from './systemFlow';

/**
 * Clamps a day-of-month to the actual number of days in the specified year and month.
 * Handles leap years for February (29 days) and 30-day months.
 * monthIndex is 0-indexed (0 = Jan, 1 = Feb, etc.)
 */
export function clampDayToMonth(year: number, monthIndex: number, day: number): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, Math.floor(day)), daysInMonth);
}

/**
 * Computes upcoming future bill trigger dates for the candidate month and next months.
 * Guarantees `count` upcoming future triggers (default 3 cycles).
 */
export function computeUpcomingBillTriggers(
  dueDay: number,
  leadDays: number,
  now: Date = new Date(),
  count: number = 3
): { dueDate: Date; triggerDate: Date; clampedDay: number }[] {
  const results: { dueDate: Date; triggerDate: Date; clampedDay: number }[] = [];
  let monthOffset = 0;

  while (results.length < count && monthOffset < 12) {
    const candidateMonthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const y = candidateMonthDate.getFullYear();
    const m = candidateMonthDate.getMonth();
    const clamped = clampDayToMonth(y, m, dueDay);

    const dueDate = new Date(y, m, clamped, 9, 0, 0);
    const triggerDate = new Date(dueDate.getTime() - Math.max(0, leadDays) * 86400000);

    if (triggerDate.getTime() > now.getTime()) {
      results.push({ dueDate, triggerDate, clampedDay: clamped });
    }
    monthOffset++;
  }

  return results;
}

export class NativeNotificationService {
  private static isNative(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  }

  /**
   * Deterministic ID for bill notifications.
   * IDs reside in range 100,000 to 790,000 to prevent collisions with:
   * - 88888 (test notification)
   * - 99999 (daily reminder)
   */
  static getDeterministicId(billId: string, cycleIndex: number = 0): number {
    let hash = 0;
    const str = `bill_${billId}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const base = 100000 + (Math.abs(hash) % 680000);
    return base + (cycleIndex % 10) * 10;
  }

  static async requestPermissions(): Promise<boolean> {
    return withSystemFlow(async () => {
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
    });
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
   * Cancels scheduled notifications for a specific recurring bill across all cycle offsets
   */
  static async cancelBillNotification(billId: string): Promise<void> {
    if (this.isNative()) {
      try {
        const idsToCancel = [0, 1, 2].map((idx) => ({
          id: this.getDeterministicId(billId, idx),
        }));
        await LocalNotifications.cancel({ notifications: idsToCancel });
      } catch (err) {
        console.warn('Failed to cancel bill notifications:', err);
      }
    }
  }

  /**
   * Evaluates due bills and returns in-app banner notifications with clamped dates
   */
  static evaluateInAppReminders(
    bills: RecurringBill[],
    settings: BudgetSettings,
    now: Date = new Date()
  ): InAppNotification[] {
    if (!settings.notificationsEnabled) return [];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    const leadDays = settings.notificationLeadDays ?? 1;
    const inAppNotifications: InAppNotification[] = [];

    const dueBills = bills.filter((b) => !b.isPaid && b.reminderEnabled !== false);

    for (const bill of dueBills) {
      const effectiveDueDay = clampDayToMonth(currentYear, currentMonth, bill.dueDay);
      const diff = effectiveDueDay - currentDay;
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

      if (isDueSoon) {
        const formattedAmount = formatMoney(bill.amount, settings.currency);
        const title =
          settings.language === 'en'
            ? `Upcoming Bill: ${bill.title}`
            : `تذكير فاتورة مستحقة: ${bill.title}`;
        const body =
          settings.language === 'en'
            ? `Bill "${bill.title}" of ${formattedAmount} is due ${timingLabel} (Day ${effectiveDueDay}).`
            : `تستحق فاتورة "${bill.title}" بمبلغ ${formattedAmount} موعد السداد ${timingLabel} (يوم ${effectiveDueDay} من الشهر).`;

        const todayStr = now.toISOString().split('T')[0];
        inAppNotifications.push({
          id: `notif-${bill.id}-${todayStr}`,
          title,
          body,
          billId: bill.id,
          timestamp: Date.now(),
        });
      }
    }

    return inAppNotifications;
  }

  /**
   * Schedule bill notifications deterministically for the candidate month and the following 2 months.
   * Cancels prior pending schedules for each bill before re-scheduling.
   */
  static async scheduleBillReminders(
    bills: RecurringBill[],
    settings: BudgetSettings
  ): Promise<InAppNotification[]> {
    if (!settings.notificationsEnabled) return [];

    const now = new Date();
    const leadDays = settings.notificationLeadDays ?? 1;
    const inAppNotifications = this.evaluateInAppReminders(bills, settings, now);

    const dueBills = bills.filter((b) => !b.isPaid && b.reminderEnabled !== false);

    for (const bill of dueBills) {
      const formattedAmount = formatMoney(bill.amount, settings.currency);
      const title =
        settings.language === 'en'
          ? `Upcoming Bill: ${bill.title}`
          : `تذكير فاتورة مستحقة: ${bill.title}`;

      if (this.isNative()) {
        try {
          // Cancel previous pending schedules for this bill
          await this.cancelBillNotification(bill.id);

          // Compute upcoming trigger dates across the next 3 cycles
          const triggers = computeUpcomingBillTriggers(bill.dueDay, leadDays, now, 3);

          for (let cycleIndex = 0; cycleIndex < triggers.length; cycleIndex++) {
            const { triggerDate, clampedDay } = triggers[cycleIndex];
            const numericId = this.getDeterministicId(bill.id, cycleIndex);
            const body =
              settings.language === 'en'
                ? `Bill "${bill.title}" of ${formattedAmount} is due soon (Day ${clampedDay}).`
                : `تستحق فاتورة "${bill.title}" بمبلغ ${formattedAmount} قريباً (يوم ${clampedDay} من الشهر).`;

            await LocalNotifications.schedule({
              notifications: [
                {
                  id: numericId,
                  title,
                  body,
                  schedule: { at: triggerDate, allowWhileIdle: true },
                },
              ],
            });
          }
        } catch (err) {
          console.warn('Native bill reminder schedule error:', err);
        }
      } else {
        // Web fallback
        for (const notif of inAppNotifications) {
          if (notif.billId === bill.id) {
            triggerBrowserNotification(notif.title, notif.body, `bill-${bill.id}`);
          }
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
