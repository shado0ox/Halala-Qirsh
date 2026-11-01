import { describe, it, expect } from 'vitest';
import { Expense } from '../../types';
import {
  findCrossSourceMatch,
  applyCrossMatch,
  CandidateMatch,
} from '../crossSourceDedupe';

describe('Cross-Source Deduplication (Apple Pay <-> Bank SMS)', () => {
  const baseTimestamp = 1730000000000; // Reference ms

  const makeExpense = (overrides: Partial<Expense>): Expense => ({
    id: `exp-${Math.random()}`,
    title: 'متجر اختبار',
    amount: 100,
    categoryId: 'food',
    date: '2026-10-30',
    paymentMethod: 'card',
    payer: 'الزوج',
    createdAt: baseTimestamp,
    ...overrides,
  });

  describe('findCrossSourceMatch', () => {
    it('matches exact amount in halalas between Apple Pay and Bank SMS', () => {
      const applePayExp = makeExpense({
        amount: 85.5,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });

      const smsCandidate: CandidateMatch = {
        amount: 85.5,
        date: '2026-10-30',
        at: baseTimestamp + 120000, // 2 minutes later
        source: 'sms',
      };

      const match = findCrossSourceMatch(smsCandidate, [applePayExp]);
      expect(match).toBe(applePayExp);
    });

    it('rejects candidates with halala discrepancies (e.g. 85.50 vs 85.55)', () => {
      const applePayExp = makeExpense({
        amount: 85.5,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });

      const smsCandidate: CandidateMatch = {
        amount: 85.55,
        date: '2026-10-30',
        at: baseTimestamp + 60000,
        source: 'sms',
      };

      const match = findCrossSourceMatch(smsCandidate, [applePayExp]);
      expect(match).toBeNull();
    });

    it('enforces bidirectional reciprocity (candidate sms matches apple_pay, candidate apple_pay matches sms)', () => {
      const smsExp = makeExpense({
        amount: 42,
        source: 'sms',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });
      const applePayExp = makeExpense({
        amount: 99,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });
      const manualExp = makeExpense({
        amount: 42,
        source: 'manual',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });

      // 1. Candidate apple_pay matches existing sms
      const applePayCandidate: CandidateMatch = {
        amount: 42,
        date: '2026-10-30',
        at: baseTimestamp + 30000,
        source: 'apple_pay',
      };
      expect(findCrossSourceMatch(applePayCandidate, [smsExp, manualExp])).toBe(smsExp);

      // 2. Candidate sms matches existing apple_pay
      const smsCandidate: CandidateMatch = {
        amount: 99,
        date: '2026-10-30',
        at: baseTimestamp + 30000,
        source: 'sms',
      };
      expect(findCrossSourceMatch(smsCandidate, [applePayExp, manualExp])).toBe(applePayExp);

      // 3. Does not match manual expenses
      const candidateForManual: CandidateMatch = {
        amount: 42,
        date: '2026-10-30',
        at: baseTimestamp,
        source: 'apple_pay',
      };
      expect(findCrossSourceMatch(candidateForManual, [manualExp])).toBeNull();
    });

    it('ignores expenses that have already been crossMatched', () => {
      const alreadyMatchedExp = makeExpense({
        amount: 50,
        source: 'apple_pay',
        date: '2026-10-30',
        crossMatched: true,
        createdAt: baseTimestamp,
      });

      const candidate: CandidateMatch = {
        amount: 50,
        date: '2026-10-30',
        at: baseTimestamp + 60000,
        source: 'sms',
      };

      expect(findCrossSourceMatch(candidate, [alreadyMatchedExp])).toBeNull();
    });

    it('respects maxDayDiff (allows 1 day diff for midnight boundary, rejects >1 day)', () => {
      const existing = makeExpense({
        amount: 120,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });

      // Same day -> match
      expect(
        findCrossSourceMatch(
          { amount: 120, date: '2026-10-30', at: baseTimestamp + 3000, source: 'sms' },
          [existing]
        )
      ).toBe(existing);

      // 1 day boundary -> match
      expect(
        findCrossSourceMatch(
          { amount: 120, date: '2026-10-31', at: baseTimestamp + 10000, source: 'sms' },
          [existing]
        )
      ).toBe(existing);

      // 3 days later -> reject
      expect(
        findCrossSourceMatch(
          { amount: 120, date: '2026-11-03', at: baseTimestamp + 3 * 86400000, source: 'sms' },
          [existing]
        )
      ).toBeNull();
    });

    it('respects time window (default 3 hours) when requireWindow is true, and ignores window when false', () => {
      const existing = makeExpense({
        amount: 60,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });

      // 4 hours later with requireWindow: true -> null
      const fourHoursLater = baseTimestamp + 4 * 3600 * 1000;
      expect(
        findCrossSourceMatch(
          { amount: 60, date: '2026-10-30', at: fourHoursLater, source: 'sms' },
          [existing],
          { requireWindow: true }
        )
      ).toBeNull();

      // 4 hours later with requireWindow: false -> matches by amount & date
      expect(
        findCrossSourceMatch(
          { amount: 60, date: '2026-10-30', at: fourHoursLater, source: 'sms' },
          [existing],
          { requireWindow: false }
        )
      ).toBe(existing);
    });

    it('picks the closest match in time when multiple matching candidates exist', () => {
      const exp1 = makeExpense({
        id: 'exp-1',
        amount: 25,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp,
      });
      const exp2 = makeExpense({
        id: 'exp-2',
        amount: 25,
        source: 'apple_pay',
        date: '2026-10-30',
        createdAt: baseTimestamp + 1800000, // 30 mins later
      });

      const smsCandidate: CandidateMatch = {
        amount: 25,
        date: '2026-10-30',
        at: baseTimestamp + 1750000, // Closer to exp2 (diff = 50s vs exp1 diff = 1750s)
        source: 'sms',
      };

      const match = findCrossSourceMatch(smsCandidate, [exp1, exp2]);
      expect(match?.id).toBe('exp-2');
    });
  });

  describe('applyCrossMatch', () => {
    it('when existing is sms and candidate is apple_pay: elevates title and source to apple_pay with crossMatched: true', () => {
      const existingSms = makeExpense({
        id: 'sms-1',
        title: 'عملية بنكية لدى STC*992',
        amount: 150,
        categoryId: 'bills',
        source: 'sms',
        date: '2026-10-30',
      });

      const merged = applyCrossMatch(existingSms, {
        amount: 150,
        date: '2026-10-30',
        source: 'apple_pay',
        title: 'STC Telecom',
      });

      expect(merged.crossMatched).toBe(true);
      expect(merged.source).toBe('apple_pay');
      expect(merged.title).toBe('STC Telecom');
      expect(merged.categoryId).toBe('bills');
      expect(merged.amount).toBe(150);
    });

    it('when existing is apple_pay and candidate is sms: preserves apple_pay title and sets crossMatched: true', () => {
      const existingApplePay = makeExpense({
        id: 'ap-1',
        title: 'Starbucks Coffee',
        amount: 28,
        categoryId: 'entertainment',
        source: 'apple_pay',
        date: '2026-10-30',
      });

      const merged = applyCrossMatch(existingApplePay, {
        amount: 28,
        date: '2026-10-30',
        source: 'sms',
        title: 'مؤسسة النجم للقهوة',
      });

      expect(merged.crossMatched).toBe(true);
      expect(merged.source).toBe('apple_pay');
      expect(merged.title).toBe('Starbucks Coffee');
      expect(merged.categoryId).toBe('entertainment');
    });
  });
});
