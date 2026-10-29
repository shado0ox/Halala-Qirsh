import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';

const listeners: Record<string, (arg?: any) => void> = {};

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((name: string, cb: (arg?: any) => void) => {
      listeners[name] = cb;
      return Promise.resolve({
        remove: () => {
          if (listeners[name] === cb) {
            delete listeners[name];
          }
          return Promise.resolve();
        },
      });
    }),
    getLaunchUrl: vi.fn(() => Promise.resolve(undefined)),
  },
}));

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
    get: vi.fn(({ key }: { key: string }) => {
      if (key === 'auth_passcode_hash') {
        return Promise.resolve({ value: 'stored-hash' });
      }
      return Promise.reject(new Error('nf'));
    }),
    set: vi.fn(() => Promise.resolve({ value: true })),
    remove: vi.fn(() => Promise.resolve({ value: true })),
  },
}));

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: {
    checkBiometry: vi.fn(() =>
      Promise.resolve({ isAvailable: true, biometryTypes: [2] })
    ),
    authenticate: vi.fn(() => Promise.resolve()),
  },
  BiometryType: { none: 0, touchId: 1, faceId: 2 },
}));

import App from '../App';
import { getDefaultAppData } from '../utils/storage';

const STORAGE_KEY = 'ios_home_expenses_store_v1';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Auto Lock Loop with timeout 0 (immediate lock)', () => {
  beforeEach(() => {
    nativeStore.clear();
    localStorage.clear();
    const d = getDefaultAppData();
    d.settings = {
      ...d.settings,
      isPasscodeEnabled: true,
      autoLockTimeout: 0,
      hasCompletedOnboarding: true,
      animations: 'off',
      language: 'ar',
    } as any;
    const json = JSON.stringify(d);
    nativeStore.set(STORAGE_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  });

  it('does not re-lock on appStateChange (Face ID sheet), and locks on real pause/resume', async () => {
    const { container } = render(<App />);

    // 1. Wait until lock screen disappears (auto biometric unlock) within 4 seconds
    await waitFor(
      () => {
        expect(container.querySelector('[class*="064E3B"]')).toBeNull();
      },
      { timeout: 4000 }
    );

    // 2. Wait 1400ms for systemFlow grace period to fully expire
    await act(async () => {
      await wait(1400);
    });

    // 3. Simulate Face ID dismissing or transient system dialog triggering inactive -> active
    await act(async () => {
      listeners.appStateChange?.({ isActive: false });
      await wait(50);
      listeners.appStateChange?.({ isActive: true });
      await wait(50);
    });

    // 4. Verify lock screen did NOT appear
    expect(container.querySelector('[class*="064E3B"]')).toBeNull();

    // 5. Trigger real background -> foreground trip via pause & resume
    await act(async () => {
      listeners.pause?.();
      await wait(50);
      listeners.resume?.();
      await wait(50);
    });

    // 6. Wait until lock screen appears
    await waitFor(
      () => {
        expect(container.querySelector('[class*="064E3B"]')).not.toBeNull();
      },
      { timeout: 3000 }
    );
  }, 15000);
});
