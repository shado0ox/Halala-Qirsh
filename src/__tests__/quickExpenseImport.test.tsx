import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

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
});
