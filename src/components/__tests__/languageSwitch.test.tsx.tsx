import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

/**
 * Simulates the REAL iOS behaviour of Capacitor Preferences: calls cross an async native bridge,
 * so a write only becomes visible to later reads after a short delay.
 */
const nativeStore = new Map<string, string>();
const SET_LATENCY = 120;
const GET_LATENCY = 20;
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: ({ key }: { key: string }) =>
      new Promise((res) => setTimeout(() => res({ value: nativeStore.get(key) ?? null }), GET_LATENCY)),
    set: ({ key, value }: { key: string; value: string }) =>
      new Promise<void>((res) => setTimeout(() => { nativeStore.set(key, value); res(); }, SET_LATENCY)),
    remove: ({ key }: { key: string }) => { nativeStore.delete(key); return Promise.resolve(); },
  },
}));
vi.mock('capacitor-secure-storage-plugin', () => ({
  SecureStoragePlugin: {
    get: () => Promise.reject(new Error('nf')),
    set: () => Promise.resolve({ value: true }),
    remove: () => Promise.resolve({ value: true }),
  },
}));
vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: { checkBiometry: () => Promise.resolve({ isAvailable: false, biometryType: 0 }), authenticate: () => Promise.resolve() },
  BiometryType: { none: 0 },
}));

import App from '../App';
import { getDefaultAppData } from '../utils/storage';

const STORAGE_KEY = 'ios_home_expenses_store_v1';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Language switch is stable (no flip-flop / flicker)', () => {
  beforeEach(() => {
    nativeStore.clear();
    localStorage.clear();
    const d = getDefaultAppData();
    d.settings = { ...d.settings, language: 'ar', hasCompletedOnboarding: true, isPasscodeEnabled: false, animations: 'off' } as any;
    const json = JSON.stringify(d);
    nativeStore.set(STORAGE_KEY, json);
    localStorage.setItem(STORAGE_KEY, json);
  });

  it('switching to English changes the language ONCE and keeps it', async () => {
    render(<App />);
    await act(async () => { await wait(300); });          // let hydration finish
    await act(async () => { fireEvent.click(await screen.findByText('الإعدادات')); await wait(800); });
    await screen.findByText('English', {}, { timeout: 8000 });

    const changes: string[] = [];
    const obs = new MutationObserver(() => changes.push(document.documentElement.lang));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    await act(async () => { fireEvent.click(await screen.findByText('English', {}, { timeout: 8000 })); await wait(1500); });
    obs.disconnect();

    // Exactly one change (ar -> en) and it ends on English.
    expect(changes).toEqual(['en']);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    // And the persisted value is English too.
    expect(JSON.parse(nativeStore.get(STORAGE_KEY)!).settings.language).toBe('en');
  }, 20000);
});