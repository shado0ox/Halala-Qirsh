/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getSalaryCycle,
  isDateInCycle,
  filterExpensesByCycle,
  filterIncomeByCycle,
  clampDayToMonth,
} from '../salaryCycle';
import { Expense } from '../../types';

describe('Salary Cycle Logic & Income Separation Tests', () => {
  it('correctly calculates standard calendar cycle when salaryDay is 1', () => {
    const cycle = getSalaryCycle(1, '2026-11-03');
    expect(cycle.startDate).toBe('2026-11-01');
    expect(cycle.endDate).toBe('2026-11-30');
    expect(cycle.totalDays).toBe(30);
    expect(cycle.daysRemaining).toBe(28); // Nov 3 to Nov 30 inclusive
    expect(cycle.currentDayIndex).toBe(3);
    expect(cycle.isSalaryCycle).toBe(false);
  });

  it('maintains continuous financial cycle across month end when salaryDay is 27 (Saudi Standard)', () => {
    // 1. On salary deposit day (Oct 27)
    const cycleStart = getSalaryCycle(27, '2026-10-27');
    expect(cycleStart.startDate).toBe('2026-10-27');
    expect(cycleStart.endDate).toBe('2026-11-26');
    expect(cycleStart.totalDays).toBe(31);
    expect(cycleStart.daysRemaining).toBe(31);
    expect(cycleStart.currentDayIndex).toBe(1);
    expect(cycleStart.isSalaryCycle).toBe(true);

    // 2. On Oct 31 (month end): MUST stay in the SAME cycle!
    const cycleMonthEnd = getSalaryCycle(27, '2026-10-31');
    expect(cycleMonthEnd.startDate).toBe('2026-10-27');
    expect(cycleMonthEnd.endDate).toBe('2026-11-26');
    expect(cycleMonthEnd.daysRemaining).toBe(27); // Oct 31 + 26 days of Nov = 27 days

    // 3. On Nov 1 (calendar month rollover): MUST NOT RESET! Stays in the SAME cycle!
    const cycleNov1 = getSalaryCycle(27, '2026-11-01');
    expect(cycleNov1.startDate).toBe('2026-10-27');
    expect(cycleNov1.endDate).toBe('2026-11-26');
    expect(cycleNov1.daysRemaining).toBe(26);

    // 4. On Nov 3: Stays in the SAME cycle
    const cycleNov3 = getSalaryCycle(27, '2026-11-03');
    expect(cycleNov3.startDate).toBe('2026-10-27');
    expect(cycleNov3.endDate).toBe('2026-11-26');
    expect(cycleNov3.daysRemaining).toBe(24);

    // 5. On Nov 26 (last day before next salary)
    const cycleNov26 = getSalaryCycle(27, '2026-11-26');
    expect(cycleNov26.startDate).toBe('2026-10-27');
    expect(cycleNov26.endDate).toBe('2026-11-26');
    expect(cycleNov26.daysRemaining).toBe(1);
    expect(cycleNov26.currentDayIndex).toBe(31);

    // 6. On Nov 27 (new salary arrives): Starts new cycle
    const cycleNov27 = getSalaryCycle(27, '2026-11-27');
    expect(cycleNov27.startDate).toBe('2026-11-27');
    expect(cycleNov27.endDate).toBe('2026-12-26');
    expect(cycleNov27.totalDays).toBe(30);
    expect(cycleNov27.daysRemaining).toBe(30);
    expect(cycleNov27.currentDayIndex).toBe(1);
  });

  it('handles cross-year salary cycle smoothly (December to January)', () => {
    // Dec 28
    const cycleDec = getSalaryCycle(27, '2026-12-28');
    expect(cycleDec.startDate).toBe('2026-12-27');
    expect(cycleDec.endDate).toBe('2027-01-26');

    // Jan 5
    const cycleJan = getSalaryCycle(27, '2027-01-05');
    expect(cycleJan.startDate).toBe('2026-12-27');
    expect(cycleJan.endDate).toBe('2027-01-26');
  });

  it('clamps salaryDay correctly for months with fewer days', () => {
    // February 2026 has 28 days
    expect(clampDayToMonth(2026, 1, 31)).toBe(28);
    expect(clampDayToMonth(2026, 3, 31)).toBe(30); // April has 30 days
  });

  it('strictly excludes Jamiyya income (type === income) from expense calculations', () => {
    const cycle = getSalaryCycle(27, '2026-11-03'); // 2026-10-27 to 2026-11-26

    const items: Expense[] = [
      {
        id: 'exp-1',
        title: 'بنده - سوبرماركت',
        amount: 350,
        categoryId: 'food',
        date: '2026-10-28',
        paymentMethod: 'card',
        payer: 'الزوج',
        createdAt: 1,
      },
      {
        id: 'inc-jamiyya-1',
        title: 'استلام جمعية الأهل - دور نوفمبر',
        amount: 15000,
        categoryId: 'income',
        type: 'income',
        source: 'jamiyya',
        date: '2026-11-01',
        paymentMethod: 'transfer',
        payer: 'مشترك',
        createdAt: 2,
      },
      {
        id: 'exp-2',
        title: 'فاتورة الكهرباء',
        amount: 420,
        categoryId: 'bills',
        date: '2026-11-02',
        paymentMethod: 'transfer',
        payer: 'الزوج',
        createdAt: 3,
      },
      {
        id: 'exp-outside',
        title: 'مصروف قديم',
        amount: 100,
        categoryId: 'food',
        date: '2026-09-15', // outside cycle
        paymentMethod: 'cash',
        payer: 'الزوج',
        createdAt: 4,
      },
    ];

    // Filter expenses
    const filteredExpenses = filterExpensesByCycle(items, cycle);
    expect(filteredExpenses.map((e) => e.id)).toEqual(['exp-1', 'exp-2']);

    const totalSpent = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    // MUST equal 350 + 420 = 770 SAR, and NOT 15,770 SAR!
    expect(totalSpent).toBe(770);

    // Filter income
    const filteredIncome = filterIncomeByCycle(items, cycle);
    expect(filteredIncome.map((e) => e.id)).toEqual(['inc-jamiyya-1']);
    expect(filteredIncome[0].amount).toBe(15000);
  });
});
