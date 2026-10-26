import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Preferences } from '@capacitor/preferences';
import { withSystemFlow } from './systemFlow';

const SECURE_PASSCODE_KEY = 'auth_passcode_hash';
const SECURE_SALT_KEY = 'auth_passcode_salt';
const LOCKOUT_KEY = 'auth_lockout_until';
const FAILED_ATTEMPTS_KEY = 'auth_failed_attempts';

export interface BiometryStatus {
  isAvailable: boolean;
  biometryType: string; // 'faceId' | 'touchId' | 'none'
}

export class SecurityService {
  /**
   * Helper to retrieve a key from iOS Keychain (SecureStoragePlugin)
   * with fallback to Preferences if not found or in development mode.
   */
  private static async getSecure(key: string): Promise<string | null> {
    try {
      const res = await SecureStoragePlugin.get({ key });
      return res?.value ?? null;
    } catch {
      try {
        const { value } = await Preferences.get({ key });
        return value ?? null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Helper to set a key securely in iOS Keychain with fallback to Preferences.
   */
  private static async setSecure(key: string, value: string): Promise<void> {
    try {
      await SecureStoragePlugin.set({ key, value });
    } catch {
      try {
        await Preferences.set({ key, value });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Helper to remove a key securely from Keychain and Preferences.
   */
  private static async removeSecure(key: string): Promise<void> {
    try {
      await SecureStoragePlugin.remove({ key });
    } catch {
      // ignore
    }
    try {
      await Preferences.remove({ key });
    } catch {
      // ignore
    }
  }

  /**
   * Automatic migration of any credentials previously stored in plain Preferences
   * into the native iOS Keychain.
   */
  static async migrateIfNeeded(): Promise<void> {
    try {
      const legacyKeys = [
        'home_expenses_passcode_hash',
        'home_expenses_passcode_salt',
        'home_expenses_failed_attempts',
        'home_expenses_lockout_until',
      ];
      for (const oldKey of legacyKeys) {
        const { value } = await Preferences.get({ key: oldKey });
        if (value) {
          const newKey = oldKey.replace('home_expenses_', 'auth_');
          await this.setSecure(newKey, value);
          await Preferences.remove({ key: oldKey });
        }
      }
    } catch (e) {
      console.warn('Keychain migration warning:', e);
    }
  }

  /**
   * Check if real device biometrics (Face ID or Touch ID) is available
   */
  static async checkBiometrics(): Promise<BiometryStatus> {
    try {
      const info = await BiometricAuth.checkBiometry();
      return {
        isAvailable: info.isAvailable,
        biometryType: info.biometryTypes?.includes(1) ? 'touchId' : info.biometryTypes?.includes(2) ? 'faceId' : 'none',
      };
    } catch {
      return { isAvailable: false, biometryType: 'none' };
    }
  }

  /**
   * Prompt real native Face ID / Touch ID authentication.
   * Tracks system flow so the app does not lock upon dismissal of system UI.
   * Accepts localized cancelTitle.
   */
  static async authenticateBiometric(
    reason: string = 'Unlock Halala & Qirsh',
    cancelTitle: string = 'Cancel'
  ): Promise<boolean> {
    return withSystemFlow(async () => {
      try {
        await BiometricAuth.authenticate({
          reason,
          cancelTitle,
          allowDeviceCredential: true,
        });
        await this.resetFailedAttempts();
        return true;
      } catch (err) {
        console.warn('Biometric authentication cancelled or failed:', err);
        return false;
      }
    });
  }

  /**
   * Generates a random cryptographic salt
   */
  private static generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hashes a 4-digit PIN with a salt using Web Crypto SHA-256
   */
  private static async hashPin(pin: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + pin + 'home_expenses_secure_app_v2');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Save a new 4-digit passcode securely in Keychain (salted SHA-256)
   */
  static async setPasscode(pin: string): Promise<void> {
    const salt = this.generateSalt();
    const hash = await this.hashPin(pin, salt);

    await this.setSecure(SECURE_SALT_KEY, salt);
    await this.setSecure(SECURE_PASSCODE_KEY, hash);
    await this.resetFailedAttempts();
  }

  /**
   * Remove stored passcode from Keychain
   */
  static async removePasscode(): Promise<void> {
    await this.removeSecure(SECURE_PASSCODE_KEY);
    await this.removeSecure(SECURE_SALT_KEY);
    await this.resetFailedAttempts();
  }

  /**
   * Verify an entered PIN against stored salted hash in Keychain
   */
  static async verifyPasscode(enteredPin: string): Promise<boolean> {
    await this.migrateIfNeeded();
    const storedHash = await this.getSecure(SECURE_PASSCODE_KEY);
    const salt = await this.getSecure(SECURE_SALT_KEY);

    if (!storedHash || !salt) {
      return false;
    }

    const computedHash = await this.hashPin(enteredPin, salt);
    const isMatch = computedHash === storedHash;

    if (isMatch) {
      await this.resetFailedAttempts();
    } else {
      await this.recordFailedAttempt();
    }

    return isMatch;
  }

  /**
   * Check if app is locked out due to >= 5 failed attempts
   */
  static async getLockoutRemainingSeconds(): Promise<number> {
    await this.migrateIfNeeded();
    const lockoutUntil = await this.getSecure(LOCKOUT_KEY);
    if (!lockoutUntil) return 0;

    const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
    if (remaining <= 0) {
      await this.removeSecure(LOCKOUT_KEY);
      return 0;
    }
    return remaining;
  }

  /**
   * Escalating lockout:
   * 5 failed attempts: 30 seconds
   * 6 failed attempts: 60 seconds (1 minute)
   * 7 failed attempts: 300 seconds (5 minutes)
   * 8+ failed attempts: 900 seconds (15 minutes)
   */
  static async recordFailedAttempt(): Promise<number> {
    const value = await this.getSecure(FAILED_ATTEMPTS_KEY);
    const attempts = (parseInt(value || '0', 10) || 0) + 1;
    await this.setSecure(FAILED_ATTEMPTS_KEY, String(attempts));

    if (attempts >= 5) {
      let lockoutSeconds = 30; // 5 attempts = 30s
      if (attempts === 6) lockoutSeconds = 60; // 6 attempts = 1m
      else if (attempts === 7) lockoutSeconds = 300; // 7 attempts = 5m
      else if (attempts >= 8) lockoutSeconds = 900; // 8+ attempts = 15m

      const lockoutUntil = Date.now() + lockoutSeconds * 1000;
      await this.setSecure(LOCKOUT_KEY, String(lockoutUntil));
    }

    return attempts;
  }

  static async resetFailedAttempts(): Promise<void> {
    await this.removeSecure(FAILED_ATTEMPTS_KEY);
    await this.removeSecure(LOCKOUT_KEY);
  }

  /**
   * Migration from existing plain-text passcode
   */
  static async migratePlainPasscode(rawPin: string): Promise<void> {
    if (rawPin && rawPin.length === 4) {
      console.log('Migrating plain-text passcode to salted Keychain hash...');
      await this.setPasscode(rawPin);
    }
  }

  static async hasPasscode(): Promise<boolean> {
    await this.migrateIfNeeded();
    const hash = await this.getSecure(SECURE_PASSCODE_KEY);
    return Boolean(hash);
  }
}
