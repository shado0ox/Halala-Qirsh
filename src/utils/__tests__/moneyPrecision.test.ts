import { describe, it, expect } from 'vitest';
import { formatMoney, sumMoney, cleanMoneyAmount } from '../storage';
import { parseApplePayDeepLink } from '../deepLink';

describe('Currency and Money Precision (3.45 SAR Apple Pay test)', () => {
  it('formats 3.45 SAR exactly as 3.45 without rounding to 3.5 or 3.50 in English', () => {
    const formatted = formatMoney(3.45, 'SAR', 'en');
    expect(formatted).toBe('ر.س 3.45');
    expect(formatted).not.toBe('ر.س 3.5');
    expect(formatted).not.toBe('ر.س 3.50');
    expect(formatted).not.toBe('ر.س 4');
  });

  it('formats 3.45 SAR with exact Arabic numerals without rounding in Arabic', () => {
    const formatted = formatMoney(3.45, 'SAR', 'ar');
    expect(formatted).toContain('٣٫٤٥');
    expect(formatted).not.toContain('٣٫٥');
  });

  it('does not force unnecessary trailing decimals for whole numbers', () => {
    expect(formatMoney(50, 'SAR', 'en')).toBe('ر.س 50');
  });

  it('preserves single decimal numbers when applicable without rounding', () => {
    expect(formatMoney(3.5, 'SAR', 'en')).toBe('ر.س 3.5');
  });

  it('prevents floating-point drift when summing totals (0.1 + 0.2 = 0.3)', () => {
    const nativeSum = 0.1 + 0.2;
    expect(nativeSum).not.toBe(0.3); // 0.30000000000000004 in native JS

    const safeSum = sumMoney([0.1, 0.2]);
    expect(safeSum).toBe(0.3);
  });

  it('totals multiple Apple Pay transactions of 3.45 SAR with exact precision', () => {
    // 3.45 + 3.45 + 3.45 = 10.35
    const total = sumMoney([3.45, 3.45, 3.45]);
    expect(total).toBe(10.35);

    // 3.45 + 1.55 = 5.0
    const evenTotal = sumMoney([3.45, 1.55]);
    expect(evenTotal).toBe(5);

    // Summing array of amounts with halalas
    const mixed = sumMoney([3.45, 12.30, 4.25, 0.05]);
    expect(mixed).toBe(20.05);
  });

  it('cleans floating point drift using cleanMoneyAmount', () => {
    expect(cleanMoneyAmount(3.4500000000000002)).toBe(3.45);
    expect(cleanMoneyAmount(0.1 + 0.2)).toBe(0.3);
  });

  it('end-to-end Apple Pay flow preserves 3.45 amount through parsing, storing, and totaling', () => {
    const deepLinkUrl = 'halalaqirsh://applepay?amount=3.45&merchant=Coffee%20Shop&autolog=1';
    const payload = parseApplePayDeepLink(deepLinkUrl);

    expect(payload).not.toBeNull();
    expect(payload?.amount).toBe(3.45);

    // Simulated stored expense
    const storedExpense = {
      id: 'exp-test-1',
      title: payload?.merchant || 'Coffee Shop',
      amount: cleanMoneyAmount(payload!.amount!),
      categoryId: 'food',
      date: '2026-10-31',
    };

    expect(storedExpense.amount).toBe(3.45);

    // Formatted in English
    const displayedEn = formatMoney(storedExpense.amount, 'SAR', 'en');
    expect(displayedEn).toBe('ر.س 3.45');

    // Totaled with another expense
    const secondExpense = { amount: 6.55 };
    const grandTotal = sumMoney([storedExpense.amount, secondExpense.amount]);
    expect(grandTotal).toBe(10);
    expect(formatMoney(grandTotal, 'SAR', 'en')).toBe('ر.س 10');
  });
});
