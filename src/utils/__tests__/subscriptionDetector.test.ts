import { describe, it, expect } from 'vitest';
import { Expense, DetectedSubscription } from '../../types';
import {
  normalizeSubscriptionMerchant,
  isAmountSimilar,
  getDaysBetweenDates,
  detectCadence,
  calculateNextRenewalDate,
  detectSubscriptionsFromExpenses,
} from '../subscriptionDetector';
import {
  getUpcomingSubscriptionRenewals,
  getSubscriptionPriceAlerts,
  getFrequencyLabel,
} from '../subscriptionReminders';

describe('Subscription Detection Engine', () => {
  describe('Merchant Name Normalization', () => {
    it('normalizes common variations of Netflix to canonical key', () => {
      expect(normalizeSubscriptionMerchant('NETFLIX.COM')).toBe('netflix');
      expect(normalizeSubscriptionMerchant('Netflix')).toBe('netflix');
      expect(normalizeSubscriptionMerchant('Netflix Inc.')).toBe('netflix');
      expect(normalizeSubscriptionMerchant('Purchase at Netflix')).toBe('netflix');
      expect(normalizeSubscriptionMerchant('اشتراك NETFLIX')).toBe('netflix');
    });

    it('normalizes other subscription providers correctly', () => {
      expect(normalizeSubscriptionMerchant('Spotify AB')).toBe('spotify');
      expect(normalizeSubscriptionMerchant('Spotify Premium')).toBe('spotify');
      expect(normalizeSubscriptionMerchant('Apple.com/bill')).toBe('apple');
      expect(normalizeSubscriptionMerchant('STC Pay')).toBe('stc');
      expect(normalizeSubscriptionMerchant('شاهد VIP')).toBe('shahid');
      expect(normalizeSubscriptionMerchant('Gym Fitness Time')).toBe('fitness time');
      expect(normalizeSubscriptionMerchant('ChatGPT Plus')).toBe('chatgpt');
    });
  });

  describe('Amount & Cadence Utilities', () => {
    it('accurately identifies similar amounts within tax/rounding tolerance', () => {
      expect(isAmountSimilar(40, 40)).toBe(true);
      expect(isAmountSimilar(39.99, 40.00)).toBe(true);
      expect(isAmountSimilar(45, 46)).toBe(true); // within 3% tolerance
      expect(isAmountSimilar(45, 47, 0.10)).toBe(true); // with explicit 10% tolerance
      expect(isAmountSimilar(45, 47)).toBe(false); // exceeds default 3% tolerance
      expect(isAmountSimilar(20, 200)).toBe(false);
    });

    it('calculates days between YYYY-MM-DD dates', () => {
      expect(getDaysBetweenDates('2026-01-01', '2026-01-08')).toBe(7);
      expect(getDaysBetweenDates('2026-01-01', '2026-01-31')).toBe(30);
      expect(getDaysBetweenDates('2026-02-01', '2026-03-01')).toBe(28);
    });

    it('detects monthly cadence from regular ~30 day intervals', () => {
      const intervals = [30, 31, 29, 30];
      const res = detectCadence(intervals);
      expect(res).not.toBeNull();
      expect(res?.frequency).toBe('monthly');
    });

    it('handles missed month (e.g. skipped/paused month: 30, 60, 31) without losing cadence', () => {
      const intervals = [30, 61, 30]; // 61 is ~2x 30
      const res = detectCadence(intervals);
      expect(res).not.toBeNull();
      expect(res?.frequency).toBe('monthly');
    });

    it('advances next renewal date properly', () => {
      expect(calculateNextRenewalDate('2026-05-15', 'monthly', '2026-05-20')).toBe('2026-06-15');
      expect(calculateNextRenewalDate('2026-05-15', 'weekly', '2026-05-16')).toBe('2026-05-22');
      expect(calculateNextRenewalDate('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28');
    });
  });

  describe('detectSubscriptionsFromExpenses', () => {
    const createExpense = (id: string, title: string, amount: number, date: string): Expense => ({
      id,
      title,
      amount,
      categoryId: 'bills',
      date,
      paymentMethod: 'card',
      payer: 'الزوج',
      createdAt: Date.now(),
    });

    it('detects regular monthly subscription like Netflix with slight date drift (±3 days)', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'NETFLIX.COM', 45, '2026-07-15'),
        createExpense('exp-2', 'Netflix', 45, '2026-08-16'), // +32 days
        createExpense('exp-3', 'Netflix Inc.', 45, '2026-09-15'), // +30 days
      ];

      const detected = detectSubscriptionsFromExpenses(expenses, {
        currentDate: '2026-09-20',
      });

      expect(detected).toHaveLength(1);
      const sub = detected[0];
      expect(sub.normalizedMerchant).toBe('netflix');
      expect(sub.typicalAmount).toBe(45);
      expect(sub.detectedFrequency).toBe('monthly');
      expect(sub.lastChargeDate).toBe('2026-09-15');
      expect(sub.nextExpectedRenewalDate).toBe('2026-10-15');
      expect(sub.status).toBe('detected');
    });

    it('detects price-increase when a subscription charge comes in at a higher amount', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'Spotify Premium', 35, '2026-06-10'),
        createExpense('exp-2', 'Spotify', 35, '2026-07-10'),
        createExpense('exp-3', 'Spotify AB', 45, '2026-08-10'), // Increased from 35 to 45
      ];

      const detected = detectSubscriptionsFromExpenses(expenses, {
        currentDate: '2026-08-15',
      });

      expect(detected).toHaveLength(1);
      const sub = detected[0];
      expect(sub.normalizedMerchant).toBe('spotify');
      expect(sub.typicalAmount).toBe(45);
      expect(sub.priceIncrease).toBeDefined();
      expect(sub.priceIncrease?.oldAmount).toBe(35);
      expect(sub.priceIncrease?.newAmount).toBe(45);
      expect(sub.priceIncrease?.difference).toBe(10);
      expect(sub.priceIncrease?.percentage).toBe(29);
    });

    it('handles multiple charges in the same period without breaking cycle', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'Netflix', 45, '2026-06-01'),
        createExpense('exp-2', 'Netflix', 45, '2026-06-02'), // duplicate/retry on consecutive day
        createExpense('exp-3', 'Netflix', 45, '2026-07-01'),
        createExpense('exp-4', 'Netflix', 45, '2026-08-01'),
      ];

      const detected = detectSubscriptionsFromExpenses(expenses, {
        currentDate: '2026-08-10',
      });

      expect(detected).toHaveLength(1);
      expect(detected[0].detectedFrequency).toBe('monthly');
    });

    it('rejects merchants with high-frequency one-off random purchases (e.g. Starbucks or Panda)', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'Starbucks', 18, '2026-08-01'),
        createExpense('exp-2', 'Starbucks Coffee', 42, '2026-08-04'),
        createExpense('exp-3', 'Starbucks', 26, '2026-08-05'),
        createExpense('exp-4', 'Starbucks', 65, '2026-08-12'),
      ];

      const detected = detectSubscriptionsFromExpenses(expenses);
      expect(detected).toHaveLength(0);
    });

    it('does not detect weekly repeated purchases like Starbucks 22 four times', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'Starbucks', 22, '2026-08-01'),
        createExpense('exp-2', 'Starbucks', 22, '2026-08-08'),
        createExpense('exp-3', 'Starbucks', 22, '2026-08-15'),
        createExpense('exp-4', 'Starbucks', 22, '2026-08-22'),
      ];

      const detected = detectSubscriptionsFromExpenses(expenses);
      expect(detected).toHaveLength(0);
    });

    it('does not detect monthly fluctuating purchases like Panda 310/305/298', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          title: 'Hyper Panda',
          amount: 310,
          categoryId: 'groceries',
          date: '2026-06-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
        {
          id: 'exp-2',
          title: 'Panda',
          amount: 305,
          categoryId: 'groceries',
          date: '2026-07-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
        {
          id: 'exp-3',
          title: 'Panda Market',
          amount: 298,
          categoryId: 'groceries',
          date: '2026-08-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
      ];

      const detected = detectSubscriptionsFromExpenses(expenses);
      expect(detected).toHaveLength(0);
    });

    it('does not detect recurring expenses with categoryId "food"', () => {
      const expenses: Expense[] = [
        {
          id: 'exp-1',
          title: 'Monthly Food Supply',
          amount: 400,
          categoryId: 'food',
          date: '2026-06-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
        {
          id: 'exp-2',
          title: 'Monthly Food Supply',
          amount: 400,
          categoryId: 'food',
          date: '2026-07-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
        {
          id: 'exp-3',
          title: 'Monthly Food Supply',
          amount: 400,
          categoryId: 'food',
          date: '2026-08-01',
          paymentMethod: 'card',
          payer: 'الزوج',
          createdAt: Date.now(),
        },
      ];

      const detected = detectSubscriptionsFromExpenses(expenses);
      expect(detected).toHaveLength(0);
    });

    it('respects dismissed subscriptions and does not re-detect them', () => {
      const expenses: Expense[] = [
        createExpense('exp-1', 'Gym Member', 250, '2026-06-01'),
        createExpense('exp-2', 'Gym Member', 250, '2026-07-01'),
        createExpense('exp-3', 'Gym Member', 250, '2026-08-01'),
      ];

      const detected = detectSubscriptionsFromExpenses(expenses, {
        dismissedMerchants: ['gym member'],
      });

      expect(detected).toHaveLength(0);
    });

    it('preserves existing confirmed subscriptions and updates renewal date', () => {
      const existing: DetectedSubscription = {
        id: 'sub-netflix',
        merchant: 'Netflix 4K',
        normalizedMerchant: 'netflix',
        typicalAmount: 65,
        detectedFrequency: 'monthly',
        lastChargeDate: '2026-06-15',
        nextExpectedRenewalDate: '2026-07-15',
        status: 'confirmed',
        detectedAt: 123456,
        chargeCount: 2,
        priceHistory: [],
        notes: 'Family Premium Plan',
      };

      const expenses: Expense[] = [
        createExpense('exp-1', 'Netflix', 65, '2026-07-15'),
        createExpense('exp-2', 'Netflix', 65, '2026-08-15'),
      ];

      const detected = detectSubscriptionsFromExpenses(expenses, {
        existingSubscriptions: [existing],
        currentDate: '2026-08-20',
      });

      expect(detected).toHaveLength(1);
      const sub = detected[0];
      expect(sub.status).toBe('confirmed');
      expect(sub.notes).toBe('Family Premium Plan');
      expect(sub.lastChargeDate).toBe('2026-08-15');
      expect(sub.nextExpectedRenewalDate).toBe('2026-09-15');
    });
  });

  describe('Renewal Reminders & Price Alerts', () => {
    it('surfaces upcoming renewals within lead days', () => {
      const subscriptions: DetectedSubscription[] = [
        {
          id: 'sub-1',
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          typicalAmount: 45,
          detectedFrequency: 'monthly',
          lastChargeDate: '2026-09-15',
          nextExpectedRenewalDate: '2026-10-18', // 3 days from 2026-10-15
          status: 'confirmed',
          detectedAt: Date.now(),
          chargeCount: 3,
          priceHistory: [],
          reminderDaysBefore: 3,
        },
        {
          id: 'sub-2',
          merchant: 'Amazon Prime',
          normalizedMerchant: 'amazon prime',
          typicalAmount: 16,
          detectedFrequency: 'monthly',
          lastChargeDate: '2026-09-01',
          nextExpectedRenewalDate: '2026-11-01', // far away
          status: 'confirmed',
          detectedAt: Date.now(),
          chargeCount: 3,
          priceHistory: [],
          reminderDaysBefore: 3,
        },
      ];

      const alerts = getUpcomingSubscriptionRenewals(subscriptions, {
        currentDate: '2026-10-15',
        leadDays: 3,
        currencySymbol: 'ر.س',
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].merchant).toBe('Netflix');
      expect(alerts[0].daysRemaining).toBe(3);
      expect(alerts[0].bodyAr).toContain('خلال 3 أيام');
      expect(alerts[0].bodyAr).toContain('45 ر.س');
    });

    it('surfaces price increase alerts', () => {
      const subscriptions: DetectedSubscription[] = [
        {
          id: 'sub-1',
          merchant: 'Netflix',
          normalizedMerchant: 'netflix',
          typicalAmount: 55,
          detectedFrequency: 'monthly',
          lastChargeDate: '2026-10-15',
          nextExpectedRenewalDate: '2026-11-15',
          status: 'confirmed',
          detectedAt: Date.now(),
          chargeCount: 4,
          priceHistory: [],
          priceIncrease: {
            oldAmount: 45,
            newAmount: 55,
            difference: 10,
            percentage: 22,
            date: '2026-10-15',
          },
        },
      ];

      const priceAlerts = getSubscriptionPriceAlerts(subscriptions, 'ر.س');
      expect(priceAlerts).toHaveLength(1);
      expect(priceAlerts[0].merchant).toBe('Netflix');
      expect(priceAlerts[0].oldAmount).toBe(45);
      expect(priceAlerts[0].newAmount).toBe(55);
      expect(priceAlerts[0].difference).toBe(10);
      expect(priceAlerts[0].bodyAr).toContain('ارتفاع');
      expect(priceAlerts[0].bodyAr).toContain('45');
      expect(priceAlerts[0].bodyAr).toContain('55');
    });

    it('formats frequency labels in Arabic and English', () => {
      expect(getFrequencyLabel('monthly', 'ar')).toBe('شهري');
      expect(getFrequencyLabel('monthly', 'en')).toBe('Monthly');
      expect(getFrequencyLabel('yearly', 'ar')).toBe('سنوي');
      expect(getFrequencyLabel('weekly', 'en')).toBe('Weekly');
    });
  });
});
