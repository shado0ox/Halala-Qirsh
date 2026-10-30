/**
 * Subscription Renewal Reminders & Price Alert Engine
 * Evaluates upcoming renewal windows and price changes for subscriptions.
 */

import { DetectedSubscription, SubscriptionFrequency } from '../types';
import { getDaysBetweenDates, formatDateToYmd } from './subscriptionDetector';

export interface SubscriptionRenewalAlert {
  id: string;
  subscriptionId: string;
  merchant: string;
  amount: number;
  renewalDate: string;
  daysRemaining: number;
  isDueToday: boolean;
  frequency: SubscriptionFrequency;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

export interface SubscriptionPriceAlert {
  id: string;
  subscriptionId: string;
  merchant: string;
  oldAmount: number;
  newAmount: number;
  difference: number;
  percentage: number;
  date: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

/**
 * Returns localized label for a subscription frequency
 */
export function getFrequencyLabel(
  freq: SubscriptionFrequency,
  language: 'ar' | 'en' = 'ar'
): string {
  const isEn = language === 'en';
  switch (freq) {
    case 'weekly':
      return isEn ? 'Weekly' : 'أسبوعي';
    case 'biweekly':
      return isEn ? 'Bi-weekly' : 'كل أسبوعين';
    case 'monthly':
      return isEn ? 'Monthly' : 'شهري';
    case 'quarterly':
      return isEn ? 'Quarterly' : 'ربع سنوي';
    case 'yearly':
      return isEn ? 'Yearly' : 'سنوي';
  }
}

/**
 * Calculates upcoming renewal alerts for confirmed and detected subscriptions
 */
export function getUpcomingSubscriptionRenewals(
  subscriptions: DetectedSubscription[],
  options: {
    currentDate?: string;
    leadDays?: number;
    includeDetected?: boolean;
    currencySymbol?: string;
  } = {}
): SubscriptionRenewalAlert[] {
  const {
    currentDate = formatDateToYmd(new Date()),
    leadDays = 3,
    includeDetected = true,
    currencySymbol = 'ر.س',
  } = options;

  const alerts: SubscriptionRenewalAlert[] = [];

  for (const sub of subscriptions) {
    if (sub.status === 'dismissed') continue;
    if (!includeDetected && sub.status === 'detected') continue;

    const renewal = sub.nextExpectedRenewalDate;
    if (!renewal) continue;

    // Check if renewal date is today or upcoming within leadDays
    // Positive when renewal is in future, 0 when today, negative when past
    const daysRemaining = getDaysBetweenDates(currentDate, renewal);
    const isDueToday = currentDate === renewal;
    const isUpcoming = renewal >= currentDate && daysRemaining <= (sub.reminderDaysBefore ?? leadDays);

    if (isUpcoming) {
      const daysTextAr = isDueToday
        ? 'اليوم'
        : daysRemaining === 1
        ? 'غداً'
        : `خلال ${daysRemaining} أيام`;
      const daysTextEn = isDueToday
        ? 'today'
        : daysRemaining === 1
        ? 'tomorrow'
        : `in ${daysRemaining} days`;

      alerts.push({
        id: `alert-renew-${sub.id}-${renewal}`,
        subscriptionId: sub.id,
        merchant: sub.merchant,
        amount: sub.typicalAmount,
        renewalDate: renewal,
        daysRemaining: isDueToday ? 0 : daysRemaining,
        isDueToday,
        frequency: sub.detectedFrequency,
        titleAr: `تجديد اشتراك ${sub.merchant}`,
        titleEn: `${sub.merchant} Subscription Renewal`,
        bodyAr: `موعد تجديد اشتراك ${sub.merchant} ${daysTextAr} بقيمة متوقعة ${sub.typicalAmount} ${currencySymbol}.`,
        bodyEn: `${sub.merchant} subscription renews ${daysTextEn} for an expected ${sub.typicalAmount} ${currencySymbol}.`,
      });
    }
  }

  // Sort by urgency (closest renewal first)
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return alerts;
}

/**
 * Returns active price increase alerts across all tracked subscriptions
 */
export function getSubscriptionPriceAlerts(
  subscriptions: DetectedSubscription[],
  currencySymbol: string = 'ر.س'
): SubscriptionPriceAlert[] {
  const alerts: SubscriptionPriceAlert[] = [];

  for (const sub of subscriptions) {
    if (sub.status === 'dismissed' || !sub.priceIncrease) continue;

    const { oldAmount, newAmount, difference, percentage, date } = sub.priceIncrease;

    alerts.push({
      id: `alert-price-${sub.id}-${date}`,
      subscriptionId: sub.id,
      merchant: sub.merchant,
      oldAmount,
      newAmount,
      difference,
      percentage,
      date,
      titleAr: `تنبيه ارتفاع سعر اشتراك ${sub.merchant}`,
      titleEn: `Price Increase: ${sub.merchant}`,
      bodyAr: `تم رصد ارتفاع في سعر اشتراك ${sub.merchant} من ${oldAmount} إلى ${newAmount} ${currencySymbol} (+${difference} ${currencySymbol} / +${percentage}%).`,
      bodyEn: `${sub.merchant} subscription increased from ${oldAmount} to ${newAmount} ${currencySymbol} (+${difference} / +${percentage}%).`,
    });
  }

  return alerts;
}
