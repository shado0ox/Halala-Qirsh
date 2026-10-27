/**
 * Deep Link utilities for Halala & Qirsh
 */

/**
 * Validates if an incoming deep link targets the Smart SMS sheet.
 * Returns true for halalaqirsh://sms, halalaqirsh://sms?x=1, etc.
 * Returns false for any other scheme, path, or non-string input.
 */
export function isSmartSmsDeepLink(url?: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  return /^halalaqirsh:\/\/sms(\?|\/|#|$)/i.test(trimmed);
}
