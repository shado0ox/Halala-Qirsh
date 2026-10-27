import { describe, it, expect } from 'vitest';
import { isSmartSmsDeepLink } from '../deepLink';

describe('isSmartSmsDeepLink unit tests', () => {
  it('returns true for halalaqirsh://sms and halalaqirsh://sms?x=1', () => {
    expect(isSmartSmsDeepLink('halalaqirsh://sms')).toBe(true);
    expect(isSmartSmsDeepLink('halalaqirsh://sms?x=1')).toBe(true);
    expect(isSmartSmsDeepLink('halalaqirsh://sms/')).toBe(true);
    expect(isSmartSmsDeepLink('halalaqirsh://sms?source=back_tap&amount=10')).toBe(true);
    expect(isSmartSmsDeepLink('HALALAQIRSH://SMS')).toBe(true);
    expect(isSmartSmsDeepLink(' halalaqirsh://sms?x=1 ')).toBe(true);
  });

  it('returns false for anything else', () => {
    expect(isSmartSmsDeepLink('halalaqirsh://other')).toBe(false);
    expect(isSmartSmsDeepLink('halalaqirsh://settings')).toBe(false);
    expect(isSmartSmsDeepLink('halalaqirsh://smsextra')).toBe(false);
    expect(isSmartSmsDeepLink('https://halalaqirsh.app/sms')).toBe(false);
    expect(isSmartSmsDeepLink('https://google.com')).toBe(false);
    expect(isSmartSmsDeepLink('')).toBe(false);
    expect(isSmartSmsDeepLink(null as any)).toBe(false);
    expect(isSmartSmsDeepLink(undefined as any)).toBe(false);
    expect(isSmartSmsDeepLink(123 as any)).toBe(false);
  });
});
