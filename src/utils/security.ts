import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const SECURE_PASSCODE_KEY = 'home_expenses_passcode_hash';
const SECURE_SALT_KEY = 'home_expenses_passcode_salt';
const LOCKOUT_KEY = 'home_expenses_lockout_until';
const FAILED_ATTEMPTS_KEY = 'home_expenses_failed_attempts';

export interface BiometryStatus {
  isAvailable: boolean;
  biometryType: string; // 'faceId' | 'touchId' | 'none'
}

export class SecurityService {
  private static isNative(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
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
   * Prompt real native Face ID / Touch ID authentication
   */
  static async authenticateBiometric(reason: string = 'Unlock Home Expenses'): Promise<boolean> {
    try {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
      });
      this.resetFailedAttempts();
      return true;
    } catch (err) {
      console.warn('Biometric authentication cancelled or failed:', err);
      return false;
    }
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
    const data = encoder.encode(salt + pin + 'home_expenses_secure_app');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Save a new 4-digit passcode securely (salted SHA-256)
   */
  static async setPasscode(pin: string): Promise<void> {
    const salt = this.generateSalt();
    const hash = await this.hashPin(pin, salt);

    await Preferences.set({ key: SECURE_SALT_KEY, value: salt });
    await Preferences.set({ key: SECURE_PASSCODE_KEY, value: hash });
    await this.resetFailedAttempts();
  }

  /**
   * Remove stored passcode
   */
  static async removePasscode(): Promise<void> {
    await Preferences.remove({ key: SECURE_PASSCODE_KEY });
    await Preferences.remove({ key: SECURE_SALT_KEY });
    await this.resetFailedAttempts();
  }

  /**
   * Verify an entered PIN against stored salted hash
   */
  static async verifyPasscode(enteredPin: string): Promise<boolean> {
    const { value: storedHash } = await Preferences.get({ key: SECURE_PASSCODE_KEY });
    const { value: salt } = await Preferences.get({ key: SECURE_SALT_KEY });

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
    const { value: lockoutUntil } = await Preferences.get({ key: LOCKOUT_KEY });
    if (!lockoutUntil) return 0;

    const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
    if (remaining <= 0) {
      await Preferences.remove({ key: LOCKOUT_KEY });
      return 0;
    }
    return remaining;
  }

  static async recordFailedAttempt(): Promise<number> {
    const { value } = await Preferences.get({ key: FAILED_ATTEMPTS_KEY });
    const attempts = (parseInt(value || '0', 10) || 0) + 1;
    await Preferences.set({ key: FAILED_ATTEMPTS_KEY, value: String(attempts) });

    if (attempts >= 5) {
      // 30 seconds lockout for 5 attempts, doubling after that
      const lockoutSeconds = attempts === 5 ? 30 : 60;
      const lockoutUntil = Date.now() + lockoutSeconds * 1000;
      await Preferences.set({ key: LOCKOUT_KEY, value: String(lockoutUntil) });
    }

    return attempts;
  }

  static async resetFailedAttempts(): Promise<void> {
    await Preferences.remove({ key: FAILED_ATTEMPTS_KEY });
    await Preferences.remove({ key: LOCKOUT_KEY });
  }

  /**
   * Migration from existing plain-text passcode
   */
  static async migratePlainPasscode(rawPin: string): Promise<void> {
    if (rawPin && rawPin.length === 4) {
      console.log('Migrating plain-text passcode to salted secure hash...');
      await this.setPasscode(rawPin);
    }
  }

  static async hasPasscode(): Promise<boolean> {
    const { value } = await Preferences.get({ key: SECURE_PASSCODE_KEY });
    return Boolean(value);
  }
}
