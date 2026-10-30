import { describe, it, expect } from 'vitest';
import { isSmartSmsDeepLink, isApplePayDeepLink, parseApplePayDeepLink } from '../deepLink';

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

describe('Apple Pay deep link unit tests', () => {
  it('validates isApplePayDeepLink URLs correctly', () => {
    expect(isApplePayDeepLink('halalaqirsh://applepay')).toBe(true);
    expect(isApplePayDeepLink('halalaqirsh://applepay?amount=25.50&merchant=Panda')).toBe(true);
    expect(isApplePayDeepLink('halalaqirsh://apple-pay?amount=10')).toBe(true);
    expect(isApplePayDeepLink('halalaqirsh://transaction?amount=100')).toBe(true);
    expect(isApplePayDeepLink('HALALAQIRSH://APPLEPAY')).toBe(true);
    expect(isApplePayDeepLink('halalaqirsh://sms')).toBe(false);
    expect(isApplePayDeepLink('https://applepay.com')).toBe(false);
    expect(isApplePayDeepLink('')).toBe(false);
    expect(isApplePayDeepLink(null)).toBe(false);
  });

  it('parses transaction parameters accurately in parseApplePayDeepLink', () => {
    const parsed = parseApplePayDeepLink('halalaqirsh://applepay?amount=78.25&merchant=Tamimi%20Markets&card=Visa%201234&note=Dinner&autolog=true');
    expect(parsed).toEqual({
      amount: 78.25,
      merchant: 'Tamimi Markets',
      category: undefined,
      categoryId: undefined,
      card: 'Visa 1234',
      note: 'Dinner',
      autoLog: true,
    });
  });

  it('handles empty or malformed parameters gracefully', () => {
    expect(parseApplePayDeepLink('halalaqirsh://applepay')).toEqual({});
    expect(parseApplePayDeepLink('halalaqirsh://applepay?amount=abc')).toEqual({
      amount: undefined,
      merchant: undefined,
      category: undefined,
      categoryId: undefined,
      card: undefined,
      note: undefined,
      autoLog: false,
    });
    expect(parseApplePayDeepLink('invalid://url')).toBeNull();
  });
});
