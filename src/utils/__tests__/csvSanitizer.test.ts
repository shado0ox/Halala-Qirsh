/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { sanitizeCsvCell, exportExpensesToCSV } from '../storage';
import { Expense, Category } from '../../types';
import { NativeShareService } from '../nativeShare';

describe('CSV Sanitizer & Formula Injection Prevention Tests', () => {
  it('neutralizes cells starting with =, +, -, @, tab, or CR by prefixing single quote', () => {
    // Dangerous formula prefixes
    expect(sanitizeCsvCell('=cmd|\' /C calc\'!A0')).toBe('"\'=cmd|\' /C calc\'!A0"');
    expect(sanitizeCsvCell('=SUM(1+1)')).toBe('"\'=SUM(1+1)"');
    expect(sanitizeCsvCell('+1234567890')).toBe('"\'+1234567890"');
    expect(sanitizeCsvCell('-15% discount')).toBe('"\' -15% discount"'.replace(' ', ''));
    expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
    expect(sanitizeCsvCell('\tmaliciousTab')).toBe('"\'\tmaliciousTab"');
    expect(sanitizeCsvCell('\rmaliciousCR')).toBe('"\'\rmaliciousCR"');
    expect(sanitizeCsvCell('   =nestedFormula')).toBe('"\'   =nestedFormula"');
  });

  it('keeps normal Arabic and English text untouched without prefixing single quote', () => {
    expect(sanitizeCsvCell('قهوة ستاربكس')).toBe('"قهوة ستاربكس"');
    expect(sanitizeCsvCell('سوبرماركت بنده')).toBe('"سوبرماركت بنده"');
    expect(sanitizeCsvCell('Starbucks Coffee')).toBe('"Starbucks Coffee"');
    expect(sanitizeCsvCell('2026-11-02')).toBe('"2026-11-02"');
  });

  it('correctly escapes double quotes inside values', () => {
    expect(sanitizeCsvCell('Store "Best" Deal')).toBe('"Store ""Best"" Deal"');
    expect(sanitizeCsvCell('="malicious"')).toBe('"\'=""malicious"""');
  });

  it('handles null, undefined, and numeric amounts safely', () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
    expect(sanitizeCsvCell(45.5)).toBe('45.5');
    expect(sanitizeCsvCell(0)).toBe('0');
  });

  it('exports expenses without executing formulas when titles or notes contain injection payloads', async () => {
    let capturedContent = '';
    vi.spyOn(NativeShareService, 'shareFile').mockImplementation(async (_filename, content) => {
      capturedContent = content;
      return true;
    });

    const categories: Category[] = [
      { id: 'food', name: 'طعام', icon: 'Utensils', color: '#10B981', bgColor: '#D1FAE5', monthlyLimit: 1000 },
    ];

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        title: '=1+1',
        amount: 25,
        categoryId: 'food',
        date: '2026-11-02',
        paymentMethod: 'card',
        payer: 'الزوج',
        notes: '@maliciousLink',
        createdAt: Date.now(),
      },
    ];

    await exportExpensesToCSV(expenses, categories, 'ر.س', false);

    expect(capturedContent).toContain('"\'=1+1"');
    expect(capturedContent).toContain('"\'@maliciousLink"');
    // Ensure BOM is present
    expect(capturedContent.startsWith('\uFEFF')).toBe(true);
  });
});
