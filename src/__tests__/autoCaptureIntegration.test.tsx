import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

const nativeStore = new Map<string, string>();
const appListeners: Record<string, (arg?: any) => void> = {};
let launchUrlToReturn: { url: string } | undefined = undefined;

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((name: string, cb: (arg?: any) => void) => {
      appListeners[name] = cb;
      return Promise.resolve({
        remove: () => {
          if (appListeners[name] === cb) delete appListeners[name];
          return Promise.resolve();
        },
      });
    }),
    getLaunchUrl: vi.fn(() => Promise.resolve(launchUrlToReturn)),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(({ key }: { key: string }) =>
      Promise.resolve({ value: nativeStore.get(key) ?? null })
    ),
    set: vi.fn(({ key, value }: { key: string; value: string }) => {
      nativeStore.set(key, value);
      return Promise.resolve();
    }),
    remove: vi.fn(({ key }: { key: string }) => {
      nativeStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<any>('@capacitor/core');
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: () => true,
    },
  };
});

vi.mock('capacitor-secure-storage-plugin', () => ({
  SecureStoragePlugin: {
    get: () => Promise.reject(new Error('nf')),
    set: () => Promise.resolve({ value: true }),
    remove: () => Promise.resolve({ value: true }),
  },
}));

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: {
    checkBiometry: () => Promise.resolve({ isAvailable: false, biometryType: 0 }),
    authenticate: () => Promise.resolve(),
  },
  BiometryType: { none: 0 },
}));

import App from '../App';
import { getDefaultAppData, loadAppData } from '../utils/storage';
import { PendingSmsItem } from '../utils/smsInbox';
import { PendingQuickExpense } from '../utils/quickExpenseQueue';

const STORAGE_KEY = 'ios_home_expenses_store_v1';
const PENDING_EXPENSES_KEY = 'pendingExpenses';
const PENDING_SMS_KEY = 'pendingSms';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Bank SMS & Cross-Source Auto-Capture Integration Tests', () => {
  beforeEach(() => {
    nativeStore.clear();
    localStorage.clear();
    launchUrlToReturn = undefined;
    const d = getDefaultAppData();
    d.settings = {
      ...d.settings,
      language: 'ar',
      hasCompletedOnboarding: true,
      isPasscodeEnabled: false,
      animations: 'off',
      autoCaptureMode: 'both',
    } as any;
    const json = JSON.stringify(d);
    nativeStore.set(STORAGE_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  });

  // 1. autoCaptureMode defaults to 'apple_pay' when missing in old stored data
  it('defaults autoCaptureMode to apple_pay for legacy data lacking the setting', () => {
    const legacy = getDefaultAppData();
    delete (legacy.settings as any).autoCaptureMode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const loaded = loadAppData();
    expect(loaded.settings.autoCaptureMode).toBe('apple_pay');
  });

  // 2. In mode 'both': Apple Pay arrives first, then Bank SMS arrives -> deduplicated into single expense with crossMatched: true
  it('deduplicates bank SMS when matching Apple Pay expense already exists (mode: both)', async () => {
    const now = Date.now();
    const existingApplePay = {
      id: 'exp-ap-1',
      title: 'Starbucks Coffee',
      amount: 32.5,
      categoryId: 'entertainment',
      date: '2026-10-30',
      paymentMethod: 'digital' as const,
      payer: 'الزوج',
      source: 'apple_pay' as const,
      isAutoLogged: true,
      createdAt: now - 60000, // 1 min ago
    };

    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [existingApplePay];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    // Incoming SMS for the exact same transaction
    const smsItem: PendingSmsItem = {
      id: 'sms-incoming-starbucks',
      text: 'شراء بـ 32.50 ر.س من بطاقة مدى لدى ستاربكس بتاريخ 2026-10-30',
      createdAt: now,
    };
    nativeStore.set(PENDING_SMS_KEY, JSON.stringify([smsItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // Check toast indicating deduplication/merge
    await waitFor(() => {
      expect(
        screen.getByText(/تم دمج 1 عملية من رسائل البنك مع عمليات Apple Pay/)
      ).toBeInTheDocument();
    });

    // Check saved data: still exactly 1 expense, marked with crossMatched: true
    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(1);
    expect(saved.expenses[0].crossMatched).toBe(true);
    expect(saved.expenses[0].amount).toBe(32.5);

    // Verify SMS queue was acknowledged and cleared
    const remainingSms = JSON.parse(nativeStore.get(PENDING_SMS_KEY) || '[]');
    expect(remainingSms).toEqual([]);
  });

  // 3. In mode 'both': Bank SMS arrives first, then Apple Pay arrives -> deduplicated and title elevated
  it('deduplicates Apple Pay when matching bank SMS already exists (mode: both)', async () => {
    const now = Date.now();
    const existingSms = {
      id: 'exp-sms-1',
      title: 'عملية بنكية لدى بنده*101',
      amount: 140,
      categoryId: 'food',
      date: '2026-10-30',
      paymentMethod: 'card' as const,
      payer: 'الزوج',
      source: 'sms' as const,
      isAutoLogged: true,
      createdAt: now - 30000,
    };

    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [existingSms];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    // Incoming Apple Pay transaction
    const applePayItem: PendingQuickExpense = {
      id: 'ap-incoming-panda',
      amount: 140,
      categoryId: 'food',
      merchant: 'هايبر بنده',
      source: 'apple_pay',
      date: '2026-10-30',
      createdAt: now,
    };
    nativeStore.set(PENDING_EXPENSES_KEY, JSON.stringify([applePayItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    await waitFor(() => {
      expect(screen.getByText(/تم دمج 1 عملية مع رسالة البنك لتفادي التكرار/)).toBeInTheDocument();
    });

    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(1);
    expect(saved.expenses[0].crossMatched).toBe(true);
    expect(saved.expenses[0].source).toBe('apple_pay');
    expect(saved.expenses[0].title).toBe('هايبر بنده');
  });

  // 4. In mode 'apple_pay': Bank SMS arrives -> discarded and queue acked without adding expense
  it('discards bank SMS when autoCaptureMode is apple_pay', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'apple_pay', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    const smsItem: PendingSmsItem = {
      id: 'sms-ignored-in-applepay-mode',
      text: 'شراء بـ 95.00 ر.س من بطاقة مدى لدى بنده',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_SMS_KEY, JSON.stringify([smsItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // No expenses added
    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(0);

    // Queue acknowledged
    const remaining = JSON.parse(nativeStore.get(PENDING_SMS_KEY) || '[]');
    expect(remaining).toEqual([]);
  });

  // 5. In mode 'bank_sms': Apple Pay arrives -> discarded without adding expense
  it('discards Apple Pay transaction when autoCaptureMode is bank_sms', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'bank_sms', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    const applePayItem: PendingQuickExpense = {
      id: 'ap-ignored-in-banksms-mode',
      amount: 70,
      categoryId: 'food',
      merchant: 'ماكدونالدز',
      source: 'apple_pay',
      date: '2026-10-30',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_EXPENSES_KEY, JSON.stringify([applePayItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(0);

    const remaining = JSON.parse(nativeStore.get(PENDING_EXPENSES_KEY) || '[]');
    expect(remaining).toEqual([]);
  });

  // 6. Bank SMS with unknown merchant -> placed in toReview and opens SmartSmsSheet with initialText
  it('routes unknown merchant in bank SMS to review queue and pre-fills SmartSmsSheet with initialText', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    const unknownSms: PendingSmsItem = {
      id: 'sms-unknown-store-99',
      text: 'شراء بقيمة 115.00 ر.س من بطاقة مدى لدى متجر غير معروف كلياً XYZ999 بتاريخ 2026-10-30',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_SMS_KEY, JSON.stringify([unknownSms]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // SmartSmsSheet should be open
    await waitFor(() => {
      expect(screen.getByText('استيراد الرسائل البنكية الذكي')).toBeInTheDocument();
    });

    // Should indicate choose category
    expect(screen.getAllByText('اختر تصنيفاً').length).toBeGreaterThan(0);
  });

  // 7. Manual save with duplicate detection in SmartSmsSheet
  it('warns user about duplicate expense in SmartSmsSheet with options to Ignore (Link) or Save Anyway', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [
      {
        id: 'existing-starbucks-exp',
        title: 'Starbucks Coffee',
        amount: 28,
        categoryId: 'entertainment',
        date: '2026-10-30',
        paymentMethod: 'digital',
        payer: 'الزوج',
        createdAt: Date.now() - 10000,
      },
    ];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    // Put SMS with matching amount in pending queue
    const matchingSms: PendingSmsItem = {
      id: 'sms-review-dup',
      text: 'شراء بقيمة 28.00 ر.س من بطاقة مدى لدى مقهى مجهول غير مسجل بتاريخ 2026-10-30',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_SMS_KEY, JSON.stringify([matchingSms]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    await waitFor(() => {
      expect(screen.getByText('استيراد الرسائل البنكية الذكي')).toBeInTheDocument();
    });

    // Pick a category to satisfy required category selection
    const entertainmentCatBtns = screen.getAllByText('ترفيه ومطاعم عائلية');
    const entertainmentCatBtn = entertainmentCatBtns[entertainmentCatBtns.length - 1];
    await act(async () => {
      fireEvent.click(entertainmentCatBtn);
    });

    // Click Save
    const saveBtn = screen.getByTestId('save-parsed-expense');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Duplicate warning banner appears
    await waitFor(() => {
      expect(screen.getByTestId('duplicate-warning-banner')).toBeInTheDocument();
      expect(screen.getByText(/احتمال تكرار العملية/)).toBeInTheDocument();
    });

    // Click "تجاهل (دمج)"
    const ignoreBtn = screen.getByText('تجاهل (دمج)');
    await act(async () => {
      fireEvent.click(ignoreBtn);
      await wait(100);
    });

    // Check that existing expense was marked as crossMatched: true
    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses[0].crossMatched).toBe(true);
  });

  // 8. In mode 'both': incoming Apple Pay deep link without autolog=true parameter logs automatically
  it('automatically logs Apple Pay deep link without autolog parameter when mode is both', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // Simulate incoming Apple Pay URL event from shortcut without autolog=true
    await act(async () => {
      if (appListeners['appUrlOpen']) {
        appListeners['appUrlOpen']({
          url: 'halalaqirsh://applepay?amount=55.25&merchant=%D8%AA%D9%85%D9%88%D9%8A%D9%86%D8%A7%D8%AA%20%D8%A7%D9%84%D8%AF%D8%A7%D9%86%D9%88%D8%A8',
        });
      }
      await wait(200);
    });

    // Check toast indicating auto-logging
    await waitFor(() => {
      expect(screen.getByText(/تم قيد 55.25 تلقائياً/)).toBeInTheDocument();
    });

    // Check expense is persisted in store
    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(1);
    expect(saved.expenses[0].amount).toBe(55.25);
    expect(saved.expenses[0].title).toBe('تموينات الدانوب');
    expect(saved.expenses[0].source).toBe('apple_pay');
    expect(saved.expenses[0].isAutoLogged).toBe(true);
  });

  // 9. Parses formatted currency in Apple Pay deep link (e.g. SAR 120.00) and auto-logs
  it('parses formatted currency strings in Apple Pay deep links and auto-logs', async () => {
    const d = getDefaultAppData();
    d.settings = { ...d.settings, autoCaptureMode: 'both', hasCompletedOnboarding: true, animations: 'off' };
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // Simulate incoming Apple Pay URL with formatted SAR currency
    await act(async () => {
      if (appListeners['appUrlOpen']) {
        appListeners['appUrlOpen']({
          url: 'halalaqirsh://applepay?amount=SAR%20120.00&merchant=%D8%AC%D8%B1%D9%8A%D8%B1',
        });
      }
      await wait(200);
    });

    // Check toast indicating auto-logging
    await waitFor(() => {
      expect(screen.getByText(/تم قيد 120 تلقائياً/)).toBeInTheDocument();
    });

    const saved = JSON.parse(nativeStore.get(STORAGE_KEY)!);
    expect(saved.expenses).toHaveLength(1);
    expect(saved.expenses[0].amount).toBe(120);
    expect(saved.expenses[0].title).toBe('جرير');
  });
});
