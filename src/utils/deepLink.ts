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
 * Matches halalaqirsh://applepay, halalaqirsh://apple-pay, halalaqirsh://pay, or halalaqirsh://transaction.
 */
export function isApplePayDeepLink(url?: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  return /^halalaqirsh:\/\/(applepay|transaction|apple-pay|pay)(\?|\/|#|$)/i.test(trimmed);
}

/**
 * Safely parses any numeric amount from a string (including Arabic digits, currency labels like SAR or ر.س, and commas)
 */
function extractNumericAmount(rawStr?: string | null): number | undefined {
  if (!rawStr || typeof rawStr !== 'string') return undefined;

  const normalizedStr = rawStr
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/,/g, '')
    .trim();

  // Extract the numeric portion (supports floats like 15.50 or integers)
  const match = normalizedStr.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed) && parsed > 0 && parsed < 1_000_000) {
      return Math.round((parsed + Number.EPSILON) * 100) / 100;
    }
  }
  return undefined;
}

/**
 * Parses query parameters and path information from an Apple Pay deep link URL.
 * Handles parameters like amount, merchant, category, card, autolog,
 * and gracefully parses varied parameter aliases from Shortcuts automations.
 */
export function parseApplePayDeepLink(url?: string | null): ApplePayTransactionPayload | null {
  if (!isApplePayDeepLink(url)) {
    return null;
  }

  try {
    const raw = (url || '').trim();
    const queryIndex = raw.indexOf('?');

    let queryString = '';
    let pathPart = raw;

    if (queryIndex !== -1) {
      queryString = raw.slice(queryIndex + 1);
      pathPart = raw.slice(0, queryIndex);
    }

    const params = new URLSearchParams(queryString);

    // 1. Amount: check query parameters (amount, value, price, total, cost, mablagh, qima, val, amt)
    const amountRaw =
      params.get('amount') ||
      params.get('value') ||
      params.get('price') ||
      params.get('total') ||
      params.get('cost') ||
      params.get('mablagh') ||
      params.get('qima') ||
      params.get('val') ||
      params.get('amt');

    let amount = extractNumericAmount(amountRaw);

    // Fallback: check path for amount (e.g. halalaqirsh://applepay/45.50)
    if (!amount) {
      const pathMatch = pathPart.match(/halalaqirsh:\/\/(?:applepay|transaction|apple-pay|pay)\/([0-9٠-٩.,٫]+)/i);
      if (pathMatch) {
        amount = extractNumericAmount(pathMatch[1]);
      }
    }

    // 2. Merchant / Title
    const merchantRaw =
      params.get('merchant') ||
      params.get('store') ||
      params.get('title') ||
      params.get('vendor') ||
      params.get('name') ||
      params.get('shop') ||
      params.get('tajer') ||
      params.get('matjar') ||
      '';
    const merchant = merchantRaw.trim() || undefined;

    // 3. Category ID
    const categoryIdRaw =
      params.get('category') ||
      params.get('categoryId') ||
      params.get('cat') ||
      params.get('tasneef') ||
      '';
    const categoryId = categoryIdRaw.trim() || undefined;

    // 4. Card Name
    const cardRaw =
      params.get('card') ||
      params.get('cardName') ||
      params.get('account') ||
      params.get('bitaqa') ||
      '';
    const card = cardRaw.trim() || undefined;

    // 5. Notes / Description
    const noteRaw =
      params.get('note') ||
      params.get('notes') ||
      params.get('desc') ||
      params.get('description') ||
      params.get('memo') ||
      params.get('bayan') ||
      '';
    const note = noteRaw.trim() || undefined;

    // 6. AutoLog flag (true if autolog=true|1, false if autolog=false|0, undefined if omitted)
    const autoLogParam =
      params.get('autolog') ||
      params.get('auto') ||
      params.get('silent') ||
      params.get('immediate');

    let autoLog: boolean | undefined = undefined;
    if (autoLogParam === 'true' || autoLogParam === '1') {
      autoLog = true;
    } else if (autoLogParam === 'false' || autoLogParam === '0') {
      autoLog = false;
    }

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
