/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PasscodeLockModal } from '../components/PasscodeLockModal';
import { SecurityService } from '../utils/security';

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
    getLaunchUrl: vi.fn(() => Promise.resolve(undefined)),
  },
}));

vi.mock('@capacitor/preferences', () => {
  const store = new Map<string, string>();
  return {
    Preferences: {
      get: vi.fn(({ key }: { key: string }) => Promise.resolve({ value: store.get(key) ?? null })),
      set: vi.fn(({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      remove: vi.fn(({ key }: { key: string }) => {
        store.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

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

describe('Security Verification & Passcode Hardening Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('in change mode, requires current passcode verification before allowing new passcode', async () => {
    vi.spyOn(SecurityService, 'checkBiometrics').mockResolvedValue({ isAvailable: false, biometryType: 'none' });
    vi.spyOn(SecurityService, 'getLockoutRemainingSeconds').mockResolvedValue(0);
    const verifySpy = vi.spyOn(SecurityService, 'verifyPasscode').mockImplementation(async (pin) => pin === '1234');
    const setSpy = vi.spyOn(SecurityService, 'setPasscode').mockResolvedValue();
    const onSuccess = vi.fn();

    render(
      <PasscodeLockModal
        isOpen={true}
        mode="change"
        onSuccess={onSuccess}
        soundEnabled={false}
        isEnglish={true}
      />
    );

    const clickDigit = (digit: string) => {
      const span = screen.getByText(digit, { selector: 'span.text-2xl' });
      fireEvent.click(span.closest('button')!);
    };

    const enterPin = (pin: string) => {
      for (const digit of pin) {
        clickDigit(digit);
      }
    };

    // Initial step MUST be asking for the current passcode
    expect(screen.getByText('Enter Current Passcode')).toBeInTheDocument();

    // 1. Enter WRONG current passcode: '9999'
    enterPin('9999');

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith('9999');
      expect(screen.getByText('Incorrect current passcode')).toBeInTheDocument();
    });

    // Should STILL be on "Enter Current Passcode", not advanced!
    expect(screen.getByText('Enter Current Passcode')).toBeInTheDocument();
    expect(setSpy).not.toHaveBeenCalled();

    // Wait for the 500ms error shake & enteredPin reset
    await new Promise((r) => setTimeout(r, 600));

    // 2. Now enter the CORRECT current passcode: '1234'
    enterPin('1234');

    // Now it should advance to entering the NEW passcode
    await waitFor(() => {
      expect(screen.getByText('Enter New Passcode')).toBeInTheDocument();
    });

    // 3. Enter new passcode: '5678'
    enterPin('5678');

    // Now it should ask to confirm the NEW passcode
    await waitFor(() => {
      expect(screen.getByText('Confirm New Passcode')).toBeInTheDocument();
    });

    // 4. Confirm new passcode: '5678'
    enterPin('5678');

    await waitFor(() => {
      expect(setSpy).toHaveBeenCalledWith('5678');
      expect(onSuccess).toHaveBeenCalledWith('5678');
    });
  });

  it('in verify mode, verifies identity and calls onSuccess only when passcode matches', async () => {
    vi.spyOn(SecurityService, 'checkBiometrics').mockResolvedValue({ isAvailable: false, biometryType: 'none' });
    vi.spyOn(SecurityService, 'getLockoutRemainingSeconds').mockResolvedValue(0);
    const verifySpy = vi.spyOn(SecurityService, 'verifyPasscode').mockImplementation(async (pin) => pin === '4321');
    const onSuccess = vi.fn();

    render(
      <PasscodeLockModal
        isOpen={true}
        mode="verify"
        verifyTitle="Authorize Action"
        verifySubtitle="Enter passcode to confirm"
        onSuccess={onSuccess}
        soundEnabled={false}
        isEnglish={true}
      />
    );

    const clickDigit = (digit: string) => {
      const span = screen.getByText(digit, { selector: 'span.text-2xl' });
      fireEvent.click(span.closest('button')!);
    };

    const enterPin = (pin: string) => {
      for (const digit of pin) {
        clickDigit(digit);
      }
    };

    expect(screen.getByText('Authorize Action')).toBeInTheDocument();
    expect(screen.getByText('Enter passcode to confirm')).toBeInTheDocument();

    // Enter wrong PIN: '1111'
    enterPin('1111');

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith('1111');
      expect(screen.getByText('Incorrect passcode')).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    // Wait for the 500ms error shake & enteredPin reset
    await new Promise((r) => setTimeout(r, 600));

    // Enter correct PIN: '4321'
    enterPin('4321');

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith('4321');
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
