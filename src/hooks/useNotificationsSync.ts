/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  RecurringBill,
  BudgetSettings,
  InAppNotification,
  DetectedSubscription,
  JamiyyaGroup,
} from '../types';
import { getShownBannerKeys, markBannerKeyShown } from '../utils/storage';
import {
  getNotificationPermission,
  NotificationPermissionState,
} from '../utils/notifications';
import { NativeNotificationService } from '../utils/nativeNotifications';
import { nativeHaptics } from '../utils/nativeHaptics';
import {
  getUpcomingSubscriptionRenewals,
  getSubscriptionPriceAlerts,
} from '../utils/subscriptionReminders';
import { getUpcomingJamiyyaReminders } from '../utils/jamiyyaEngine';

interface UseNotificationsSyncProps {
  bills: RecurringBill[];
  settings: BudgetSettings;
  subscriptions: DetectedSubscription[];
  jamiyyas: JamiyyaGroup[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function useNotificationsSync({
  bills,
  settings,
  subscriptions,
  jamiyyas,
  showToast,
}: UseNotificationsSyncProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermission()
  );
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
  const shownBannersRef = useRef<Set<string>>(new Set());

  // Load shown banner keys from Preferences on launch
  useEffect(() => {
    getShownBannerKeys().then((keys) => {
      shownBannersRef.current = new Set(keys);
    });
  }, []);

  // Check system notification permission
  useEffect(() => {
    NativeNotificationService.checkPermissions().then((status) => {
      setNotificationPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'default');
    });
  }, []);

  // Schedule daily reminder whenever settings change
  useEffect(() => {
    NativeNotificationService.scheduleDailyReminder(settings);
  }, [settings.dailyReminderEnabled, settings.dailyReminderTime, settings.language]);

  // Bill & Subscription notification check
  const runBillNotificationCheck = useCallback(async () => {
    if (!settings.notificationsEnabled) return;

    // 1. Recurring Bills
    const reminders = await NativeNotificationService.scheduleBillReminders(bills, settings);
    const unshown = reminders.filter((r) => !shownBannersRef.current.has(r.id));
    if (unshown.length > 0) {
      const notifToShow = unshown[0];
      shownBannersRef.current.add(notifToShow.id);
      await markBannerKeyShown(notifToShow.id);
      setCurrentNotification((prev) => (prev ? prev : notifToShow));
      return;
    }

    // 2. Confirmed Subscription Renewals (within 3 days)
    const confirmedSubs = (subscriptions || []).filter((s) => s.status === 'confirmed');
    const upcomingSubs = getUpcomingSubscriptionRenewals(confirmedSubs, { leadDays: 3 });
    const isEnLang = settings.language === 'en';
    for (const subAlert of upcomingSubs) {
      const notifKey = `sub-renew-${subAlert.subscriptionId}-${subAlert.renewalDate}`;
      if (!shownBannersRef.current.has(notifKey)) {
        shownBannersRef.current.add(notifKey);
        await markBannerKeyShown(notifKey);
        setCurrentNotification((prev) =>
          prev
            ? prev
            : {
                id: notifKey,
                title: isEnLang ? subAlert.titleEn : subAlert.titleAr,
                body: isEnLang ? subAlert.bodyEn : subAlert.bodyAr,
                timestamp: Date.now(),
              }
        );
        return;
      }
    }

    // 3. Price Increase Alerts
    const priceAlerts = getSubscriptionPriceAlerts(subscriptions || []);
    for (const alert of priceAlerts) {
      const alertKey = `sub-price-${alert.subscriptionId}-${alert.newAmount}`;
      if (!shownBannersRef.current.has(alertKey)) {
        shownBannersRef.current.add(alertKey);
        await markBannerKeyShown(alertKey);
        setCurrentNotification((prev) =>
          prev
            ? prev
            : {
                id: alertKey,
                title: isEnLang ? alert.titleEn : alert.titleAr,
                body: isEnLang ? alert.bodyEn : alert.bodyAr,
                timestamp: Date.now(),
              }
        );
        return;
      }
    }

    // 4. Jam'iyya Installment & Payout Reminders
    const jamiyyaReminders = getUpcomingJamiyyaReminders(
      jamiyyas || [],
      3,
      settings.currency
    );
    for (const jRem of jamiyyaReminders) {
      const notifKey = jRem.id;
      if (!shownBannersRef.current.has(notifKey)) {
        shownBannersRef.current.add(notifKey);
        await markBannerKeyShown(notifKey);
        setCurrentNotification((prev) =>
          prev
            ? prev
            : {
                id: notifKey,
                title: isEnLang ? jRem.titleEn : jRem.titleAr,
                body: isEnLang ? jRem.bodyEn : jRem.bodyAr,
                timestamp: Date.now(),
              }
        );
        return;
      }
    }
  }, [bills, settings, subscriptions, jamiyyas]);

  useEffect(() => {
    runBillNotificationCheck();
  }, [runBillNotificationCheck]);

  const handleRequestNotificationPermission = async () => {
    nativeHaptics.tap(settings.soundEnabled);
    const granted = await NativeNotificationService.requestPermissions();
    setNotificationPermission(granted ? 'granted' : 'denied');
    if (granted) {
      nativeHaptics.success(settings.soundEnabled);
      showToast(settings.language === 'en' ? 'Notifications enabled' : 'تم تفعيل التنبيهات بنجاح');
      runBillNotificationCheck();
      NativeNotificationService.scheduleDailyReminder(settings);
    }
  };

  const handleSendTestNotification = async () => {
    nativeHaptics.success(settings.soundEnabled);
    const res = await NativeNotificationService.sendTest(settings);
    setCurrentNotification({
      id: `test-${Date.now()}`,
      title: res.title,
      body: res.body,
      timestamp: Date.now(),
    });
  };

  return {
    notificationPermission,
    currentNotification,
    setCurrentNotification,
    runBillNotificationCheck,
    handleRequestNotificationPermission,
    handleSendTestNotification,
  };
}
