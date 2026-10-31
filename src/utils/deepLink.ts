/**
 * Deep Link utilities for Halala & Qirsh
 */

export interface ApplePayTransactionPayload {
  amount?: number;
  merchant?: string;
  category?: string;
  categoryId?: string;
  card?: string;
  note?: string;
  autoLog?: boolean;
}

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

/**
 * Validates if an incoming deep link targets an Apple Pay / Transaction shortcut trigger.
 * Matches halalaqirsh://applepay, halalaqirsh://apple-pay, or halalaqirsh://transaction.
 */
export function isApplePayDeepLink(url?: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  return /^halalaqirsh:\/\/(applepay|transaction|apple-pay)(\?|\/|#|$)/i.test(trimmed);
}

/**
 * Parses query parameters from an Apple Pay deep link URL.
 * Handles parameters like amount, merchant, category, card, autolog.
 */
export function parseApplePayDeepLink(url?: string | null): ApplePayTransactionPayload | null {
  if (!isApplePayDeepLink(url)) {
    return null;
  }

  try {
    const raw = (url || '').trim();
    const queryIndex = raw.indexOf('?');
    if (queryIndex === -1) {
      return {};
    }

    const queryString = raw.slice(queryIndex + 1);
    const params = new URLSearchParams(queryString);

    const amountStr = params.get('amount') || params.get('value') || params.get('price');
    let amount: number | undefined;
    if (amountStr) {
      const parsed = parseFloat(amountStr.replace(/,/g, '').trim());
      if (!isNaN(parsed) && parsed > 0 && parsed < 1_000_000) {
        amount = parsed;
      }
    }

    const merchantRaw = params.get('merchant') || params.get('store') || params.get('title') || '';
    const merchant = merchantRaw.trim() || undefined;

    const categoryIdRaw = params.get('category') || params.get('categoryId') || '';
    const categoryId = categoryIdRaw.trim() || undefined;

    const cardRaw = params.get('card') || params.get('cardName') || '';
    const card = cardRaw.trim() || undefined;

    const noteRaw = params.get('note') || params.get('notes') || '';
    const note = noteRaw.trim() || undefined;

    const autoLogParam = params.get('autolog') || params.get('auto') || params.get('silent');
    const autoLog = autoLogParam === 'true' || autoLogParam === '1';

    return {
      amount,
      merchant,
      category: categoryId,
      categoryId,
      card,
      note,
      autoLog,
    };
  } catch {
    return {};
  }
}
