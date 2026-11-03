/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Expense } from '../types';

export interface SalaryCycle {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  salaryDay: number; // 1 - 31
  totalDays: number;
  daysRemaining: number;
  currentDayIndex: number;
  isSalaryCycle: boolean;
  labelAr: string;
  labelEn: string;
}

/**
 * Helper to zero-pad a number to 2 digits.
 */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Format a Date to YYYY-MM-DD in local time
 */
export function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parse a YYYY-MM-DD string to local Date at midnight
 */
export function parseLocalYmd(ymd: string): Date {
  const parts = ymd.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

/**
 * Clamp a day-of-month to the max days available in a given month.
 */
export function clampDayToMonth(year: number, month0: number, day: number): number {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return Math.min(Math.max(day, 1), daysInMonth);
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Calculate the active salary cycle for a given date and salary deposit day.
 *
 * @param salaryDay - Day of the month salary is deposited (1 to 31, default 27)
 * @param referenceDate - Target date (defaults to current local date)
 */
export function getSalaryCycle(
  salaryDay: number = 27,
  referenceDate: Date | string = new Date()
): SalaryCycle {
  const ref = typeof referenceDate === 'string' ? parseLocalYmd(referenceDate) : new Date(referenceDate);
  const refYear = ref.getFullYear();
  const refMonth0 = ref.getMonth();
  const refDay = ref.getDate();

  const safeSalaryDay = Math.min(Math.max(salaryDay || 27, 1), 31);

  // If salaryDay is 1, cycle is standard calendar month
  if (safeSalaryDay === 1) {
    const totalDays = new Date(refYear, refMonth0 + 1, 0).getDate();
    const startDate = `${refYear}-${pad(refMonth0 + 1)}-01`;
    const endDate = `${refYear}-${pad(refMonth0 + 1)}-${pad(totalDays)}`;
    const daysRemaining = Math.max(totalDays - refDay + 1, 1);
    const currentDayIndex = Math.min(Math.max(refDay, 1), totalDays);

    const monthNameAr = ARABIC_MONTHS[refMonth0];
    const monthNameEn = ENGLISH_MONTHS[refMonth0];

    return {
      startDate,
      endDate,
      salaryDay: 1,
      totalDays,
      daysRemaining,
      currentDayIndex,
      isSalaryCycle: false,
      labelAr: `شهر ${monthNameAr} ${refYear}`,
      labelEn: `${monthNameEn} ${refYear}`,
    };
  }

  // salaryDay > 1:
  // Determine if reference date is on/after salaryDay of current month or belongs to cycle from previous month
  const clampedSalaryDayCurrentMonth = clampDayToMonth(refYear, refMonth0, safeSalaryDay);

  let startYear = refYear;
  let startMonth0 = refMonth0;
  let nextYear = refYear;
  let nextMonth0 = refMonth0 + 1;

  if (refDay >= clampedSalaryDayCurrentMonth) {
    // Current cycle started this month
    startYear = refYear;
    startMonth0 = refMonth0;
    if (nextMonth0 > 11) {
      nextYear += 1;
      nextMonth0 = 0;
    }
  } else {
    // Current cycle started in previous month
    startMonth0 = refMonth0 - 1;
    if (startMonth0 < 0) {
      startYear -= 1;
      startMonth0 = 11;
    }
    nextYear = refYear;
    nextMonth0 = refMonth0;
  }

  const actualStartDay = clampDayToMonth(startYear, startMonth0, safeSalaryDay);
  const nextCycleStartDay = clampDayToMonth(nextYear, nextMonth0, safeSalaryDay);

  const startDateObj = new Date(startYear, startMonth0, actualStartDay);
  // End date is 1 day before next cycle starts
  const endDateObj = new Date(nextYear, nextMonth0, nextCycleStartDay - 1);

  const startDate = formatLocalYmd(startDateObj);
  const endDate = formatLocalYmd(endDateObj);

  // Total days in this cycle
  const diffTime = endDateObj.getTime() - startDateObj.getTime();
  const totalDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;

  // Days remaining from ref date to endDate (inclusive)
  const refMidnight = new Date(refYear, refMonth0, refDay);
  const msRemaining = endDateObj.getTime() - refMidnight.getTime();
  const daysRemaining = Math.max(Math.round(msRemaining / (1000 * 3600 * 24)) + 1, 1);

  // Current day index (1-based)
  const msPassed = refMidnight.getTime() - startDateObj.getTime();
  const currentDayIndex = Math.min(
    Math.max(Math.round(msPassed / (1000 * 3600 * 24)) + 1, 1),
    totalDays
  );

  const startMonthNameAr = ARABIC_MONTHS[startMonth0];
  const endMonthNameAr = ARABIC_MONTHS[endDateObj.getMonth()];
  const startMonthNameEn = ENGLISH_MONTHS[startMonth0];
  const endMonthNameEn = ENGLISH_MONTHS[endDateObj.getMonth()];

  const labelAr = `دورة الراتب: ${actualStartDay} ${startMonthNameAr} - ${endDateObj.getDate()} ${endMonthNameAr}`;
  const labelEn = `Salary Cycle: ${startMonthNameEn} ${actualStartDay} - ${endMonthNameEn} ${endDateObj.getDate()}`;

  return {
    startDate,
    endDate,
    salaryDay: safeSalaryDay,
    totalDays,
    daysRemaining,
    currentDayIndex,
    isSalaryCycle: true,
    labelAr,
    labelEn,
  };
}

/**
 * Check if a date string YYYY-MM-DD falls within a cycle.
 */
export function isDateInCycle(dateStr: string, cycle: { startDate: string; endDate: string }): boolean {
  return dateStr >= cycle.startDate && dateStr <= cycle.endDate;
}

/**
 * Filter an array of expenses to only actual expenses (excluding income) within the cycle.
 */
export function filterExpensesByCycle(
  expenses: Expense[],
  cycle: { startDate: string; endDate: string }
): Expense[] {
  return expenses.filter((e) => e.type !== 'income' && isDateInCycle(e.date, cycle));
}

/**
 * Filter an array of expenses to only income items within the cycle.
 */
export function filterIncomeByCycle(
  expenses: Expense[],
  cycle: { startDate: string; endDate: string }
): Expense[] {
  return expenses.filter((e) => e.type === 'income' && isDateInCycle(e.date, cycle));
}
