import { RecurringBill, BudgetSettings, InAppNotification } from '../types';
import { formatMoney } from './storage';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermissionState => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
};

export const requestNotificationPermission = async (): Promise<NotificationPermissionState> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Triggers a browser native notification if permitted
 */
export const triggerBrowserNotification = (title: string, body: string, tag?: string) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }
  try {
    new Notification(title, {
      body,
      tag: tag || 'bill-reminder',
      badge: '/favicon.ico',
      icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    });
    return true;
  } catch (err) {
    console.error('Failed to dispatch native notification:', err);
    return false;
  }
};

/**
 * Evaluates recurring bills and checks if any are due today or within lead days.
 * Dispatches browser notifications and returns InAppNotification list.
 */
export const checkAndScheduleBillReminders = (
  bills: RecurringBill[],
  settings: BudgetSettings
): InAppNotification[] => {
  if (!settings.notificationsEnabled) {
    return [];
  }

  const now = new Date();
  const currentDay = now.getDate();
  const leadDays = settings.notificationLeadDays ?? 1;
  const isEn = settings.language === 'en';

  const inAppNotifications: InAppNotification[] = [];

  // Filter unpaid bills with reminders enabled (default to true if undefined)
  const dueBills = bills.filter((b) => !b.isPaid && b.reminderEnabled !== false);

  dueBills.forEach((bill) => {
    // Days until due day in current month
    const diff = bill.dueDay - currentDay;

    // Check if within reminder window (e.g. diff === 0 (today) or diff > 0 && diff <= leadDays)
    let shouldNotify = false;
    let timingLabel = '';

    if (diff === 0) {
      shouldNotify = true;
      timingLabel = isEn ? 'Today!' : 'اليوم!';
    } else if (diff === 1 && leadDays >= 1) {
      shouldNotify = true;
      timingLabel = isEn ? 'Tomorrow' : 'غداً';
    } else if (diff > 1 && diff <= leadDays) {
      shouldNotify = true;
      timingLabel = isEn ? `in ${diff} days` : `خلال ${diff} أيام`;
    }

    if (shouldNotify) {
      const formattedAmount = settings.hideAmounts
        ? '••••••'
        : formatMoney(bill.amount, settings.currency);
      const title = isEn
        ? `Due Bill Reminder: ${bill.title}`
        : `تذكير فاتورة مستحقة: ${bill.title}`;
      const body = isEn
        ? `Bill "${bill.title}" of ${formattedAmount} is due ${timingLabel} (Day ${bill.dueDay} of the month).`
        : `تستحق فاتورة "${bill.title}" بمبلغ ${formattedAmount} موعد السداد ${timingLabel} (يوم ${bill.dueDay} من الشهر).`;

      inAppNotifications.push({
        id: `notif-${bill.id}-${now.toISOString().split('T')[0]}`,
        title,
        body,
        billId: bill.id,
        timestamp: Date.now(),
      });

      // Also trigger browser Notification API if permission granted
      triggerBrowserNotification(title, body, `bill-${bill.id}`);
    }
  });

  return inAppNotifications;
};

/**
 * Send an immediate test notification to verify the browser Notification API
 */
export const sendTestBillNotification = (
  currency: BudgetSettings['currency'],
  language: 'ar' | 'en' = 'ar',
  hideAmounts: boolean = false
) => {
  const isEn = language === 'en';
  const sampleAmount = hideAmounts ? '••••••' : formatMoney(420, currency);
  const title = isEn
    ? 'Test Reminder: Electricity & AC Bill'
    : 'تنبيه تجريبي: فاتورة الكهرباء والتكييف';
  const body = isEn
    ? `This is a test notification for Halala & Qirsh. Bill amount: ${sampleAmount} is due.`
    : `هذا إشعار تجريبي لاختبار التنبيهات المحلية لتطبيق هللة وقرش. الفاتورة بمبلغ ${sampleAmount} مستحقة السداد.`;

  const dispatched = triggerBrowserNotification(title, body, 'test-notification');
  return {
    dispatched,
    title,
    body,
  };
};
