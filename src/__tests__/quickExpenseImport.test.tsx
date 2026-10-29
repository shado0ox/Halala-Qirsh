import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

const nativeStore = new Map<string, string>();

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
import { getDefaultAppData } from '../utils/storage';
import * as quickQueue from '../utils/quickExpenseQueue';

const STORAGE_KEY = 'ios_home_expenses_store_v1';
const PENDING_KEY = 'pendingExpenses';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Quick Expense Import Integration Tests', () => {
  beforeEach(() => {
    nativeStore.clear();
    localStorage.clear();
    const d = getDefaultAppData();
    d.settings = {
      ...d.settings,
      language: 'ar',
      hasCompletedOnboarding: true,
      isPasscodeEnabled: false,
      animations: 'off',
    } as any;
    const json = JSON.stringify(d);
    nativeStore.set(STORAGE_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  });

  it('imports valid pending expense once and prevents duplicate addition on multiple passes', async () => {
    const pendingItem: quickQueue.PendingQuickExpense = {
      id: 'quick-exp-101',
      amount: 175,
      categoryId: 'food',
      date: '2026-10-29',
      note: 'مشتريات الغداء',
      createdAt: Date.now(),
    };

    nativeStore.set(PENDING_KEY, JSON.stringify([pendingItem]));

    render(<App />);

    // Wait for hydration & import to complete
    await act(async () => {
      await wait(350);
    });

    // Check toast
    await waitFor(() => {
      expect(screen.getByText(/تم تسجيل 1 مصروف من الاختصار/)).toBeInTheDocument();
    });

    // Verify queue is cleared / acked
    const remainingQueueJson = nativeStore.get(PENDING_KEY);
    const remainingQueue = remainingQueueJson ? JSON.parse(remainingQueueJson) : [];
    expect(remainingQueue).toEqual([]);

    // Simulate putting the same item back in the queue
    nativeStore.set(PENDING_KEY, JSON.stringify([pendingItem]));

    await act(async () => {
      await wait(200);
    });

    // Should not show 2 expenses imported
    expect(screen.queryByText(/تم تسجيل 2 مصروف/)).toBeNull();
  });

  it('does not save expense when category is deleted, shows error toast, and acks the queue item', async () => {
    const orphanedItem: quickQueue.PendingQuickExpense = {
      id: 'quick-orphan-999',
      amount: 80,
      categoryId: 'non-existent-cat-xyz',
      date: '2026-10-29',
      note: 'تصنيف محذوف',
      createdAt: Date.now(),
    };

    nativeStore.set(PENDING_KEY, JSON.stringify([orphanedItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    await waitFor(() => {
      expect(
        screen.getByText('تعذّر تسجيل مصروف من الاختصار لأن التصنيف محذوف')
      ).toBeInTheDocument();
    });

    // Queue must be acked so the invalid element is purged
    const remainingQueueJson = nativeStore.get(PENDING_KEY);
    const remainingQueue = remainingQueueJson ? JSON.parse(remainingQueueJson) : [];
    expect(remainingQueue).toEqual([]);
  });

  // (أ) الاستيراد يعمل بعد التحميل بالتصنيفات المخصصة المحفوظة (تصنيف غير افتراضي لا يُرفض)
  it('imports successfully with saved custom non-default categories without rejection', async () => {
    const customCat = {
      id: 'custom-gym-99',
      name: 'اشتراك النادي الرياضي',
      nameEn: 'Gym Subscription',
      icon: 'Dumbbell',
      color: '#10B981',
      bgColor: '#ECFDF5',
      monthlyLimit: 500,
    };
    const d = getDefaultAppData();
    d.categories.push(customCat);
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    const pendingItem: quickQueue.PendingQuickExpense = {
      id: 'quick-custom-1',
      amount: 350,
      categoryId: 'custom-gym-99',
      date: '2026-10-29',
      note: 'نادي اللياقة',
      createdAt: Date.now(),
    };

    nativeStore.set(PENDING_KEY, JSON.stringify([pendingItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    await waitFor(() => {
      expect(screen.getByText(/تم تسجيل 1 مصروف من الاختصار/)).toBeInTheDocument();
    });

    expect(
      screen.queryByText('تعذّر تسجيل مصروف من الاختصار لأن التصنيف محذوف')
    ).toBeNull();
  });

  // (ب) الفحص الدوري يلتقط عنصراً جديداً في الطابور والتطبيق مفتوح بدون appStateChange
  it('periodic interval check picks up newly queued item while app remains open without appStateChange', async () => {
    nativeStore.set(PENDING_KEY, JSON.stringify([]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    expect(screen.queryByText(/تم تسجيل.*مصروف من الاختصار/)).toBeNull();

    const queuedItem: quickQueue.PendingQuickExpense = {
      id: 'quick-live-interval-1',
      amount: 95,
      categoryId: 'food',
      date: '2026-10-29',
      note: 'قهوة سريعة',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_KEY, JSON.stringify([queuedItem]));

    // Wait for the periodic 3s interval to tick
    await act(async () => {
      await wait(3300);
    });

    await waitFor(() => {
      expect(screen.getByText(/تم تسجيل 1 مصروف من الاختصار/)).toBeInTheDocument();
    });

    const remaining = JSON.parse(nativeStore.get(PENDING_KEY) || '[]');
    expect(remaining).toEqual([]);
  });

  // (ج) فتح تعديل مصروف ثم وصول عنصر من الطابور لا يستبدل المصروف المعدَّل وإنما يضيف مصروفاً جديداً
  it('editing an existing expense while a quick expense arrives does not overwrite the editing expense and adds new expense', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const existingExpense = {
      id: 'existing-exp-123',
      title: 'سوبرماركت التميمي',
      amount: 450,
      categoryId: 'food',
      date: todayStr,
      paymentMethod: 'card' as const,
      payer: 'الزوج',
      createdAt: Date.now() - 50000,
    };
    const d = getDefaultAppData();
    d.settings = {
      ...d.settings,
      language: 'ar',
      hasCompletedOnboarding: true,
      isPasscodeEnabled: false,
      animations: 'off',
    } as any;
    d.expenses = [existingExpense, ...d.expenses];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));
    nativeStore.set(PENDING_KEY, JSON.stringify([]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    // Go to expenses tab
    const expensesTabBtn = screen.getByText('المصاريف');
    await act(async () => {
      fireEvent.click(expensesTabBtn);
      await wait(100);
    });

    // Click on the existing expense to open its detail modal
    const expenseItem = screen.getByText('سوبرماركت التميمي');
    await act(async () => {
      fireEvent.click(expenseItem);
      await wait(100);
    });

    // Click edit in the details modal
    const editBtn = screen.getByText('تعديل');
    await act(async () => {
      fireEvent.click(editBtn);
      await wait(100);
    });

    // Confirm edit sheet is open with title "تعديل المصروف"
    expect(screen.getByText('تعديل المصروف')).toBeInTheDocument();

    // Now a quick expense arrives in queue
    const arrivingItem: quickQueue.PendingQuickExpense = {
      id: 'quick-during-edit-99',
      amount: 60,
      categoryId: 'food',
      date: '2026-10-29',
      note: 'مخبز وتموينات',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_KEY, JSON.stringify([arrivingItem]));

    // Advance for interval check
    await act(async () => {
      await wait(3300);
    });

    // Check toast that 1 expense was added from shortcut
    await waitFor(() => {
      expect(screen.getByText(/تم تسجيل 1 مصروف من الاختصار/)).toBeInTheDocument();
    });

    // Crucial check: edit modal is still open and was NOT closed or replaced
    expect(screen.getByText('تعديل المصروف')).toBeInTheDocument();
  });

  it('imports quick expense with payer "الزوج" (not "Husband") even when language is English', async () => {
    const d = getDefaultAppData();
    d.settings = {
      ...d.settings,
      language: 'en',
      hasCompletedOnboarding: true,
      isPasscodeEnabled: false,
      animations: 'off',
    } as any;
    d.expenses = [];
    nativeStore.set(STORAGE_KEY, JSON.stringify(d));

    const pendingItem: quickQueue.PendingQuickExpense = {
      id: 'quick-payer-en-1',
      amount: 85,
      categoryId: 'food',
      date: '2026-10-29',
      note: 'Grocery store',
      createdAt: Date.now(),
    };
    nativeStore.set(PENDING_KEY, JSON.stringify([pendingItem]));

    render(<App />);

    await act(async () => {
      await wait(350);
    });

    await waitFor(() => {
      expect(screen.getByText(/1 expense\(s\) added from Shortcut/)).toBeInTheDocument();
    });

    // Check stored app data in nativeStore
    const savedDataJson = nativeStore.get(STORAGE_KEY);
    expect(savedDataJson).toBeTruthy();
    const savedData = JSON.parse(savedDataJson!);
    const importedExpense = savedData.expenses.find((e: any) => e.title === 'Grocery store');
    expect(importedExpense).toBeDefined();
    expect(importedExpense.payer).toBe('الزوج');
    expect(importedExpense.payer).not.toBe('Husband');
  });
});
