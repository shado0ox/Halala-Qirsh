import { Category, PaymentMethod } from '../types';

export interface ParsedBankSms {
  amount: number;
  merchant: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  categoryId: string; // empty string '' if unknown
  categoryName?: string;
  isLearned?: boolean;
  needsCategory?: boolean; // true when merchant is unknown and categoryId is ''
}

export interface SmsParseResult {
  success: boolean;
  isDeposit?: boolean;
  errorMessage?: string;
  data?: ParsedBankSms;
}

const LEARNED_RULES_KEY = 'halala_qirsh_learned_merchant_categories';

/**
 * Returns YYYY-MM-DD using local time (avoids UTC timezone shift of toISOString)
 */
export function getLocalToday(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const getLocalDateString = getLocalToday;

/**
 * Retrieve user-corrected merchant-to-category mappings from local storage.
 * Completely offline, private, and on-device.
 */
export function getLearnedRules(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LEARNED_RULES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save a new user correction to the local dictionary to learn for future parses.
 * Only saves when merchant is meaningful and not a generic placeholder.
 */
export function saveLearnedRule(merchant: string, categoryId: string): void {
  const normalized = normalizeMerchantKey(merchant);
  if (!normalized || normalized === 'عملية بنكية' || !categoryId) return;
  try {
    const current = getLearnedRules();
    current[normalized] = categoryId;
    localStorage.setItem(LEARNED_RULES_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clean & normalize merchant strings for lookup and learning
 */
export function normalizeMerchantKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep letters & numbers in any language
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Keywords dictionary mapping common Saudi merchant terms to standard category IDs
 */
const DEFAULT_KEYWORD_MAP: Array<{ keywords: string[]; categoryId: string }> = [
  {
    categoryId: 'groceries',
    keywords: [
      'بنده', 'panda', 'hyper panda', 'هايبر بنده',
      'العثيم', 'othaim', 'أسواق العثيم',
      'التميمي', 'tamimi',
      'الدانوب', 'danube',
      'لولو', 'lulu',
      'كارفور', 'carrefour',
      'بقالة', 'grocery', 'سوبرماركت', 'supermarket', 'market',
      'تمور', 'خضار', 'فواكه', 'لحوم', 'ملحمة', 'مخبز', 'bakery',
      'أسواق', 'ميني ماركت', 'ماركت'
    ],
  },
  {
    categoryId: 'entertainment',
    keywords: [
      'ماكدونالدز', 'mcdonalds', 'mcdonald', 'ماك',
      'ستاربكس', 'starbucks',
      'بارنيز', 'barns', 'barn cafe',
      'دانكن', 'dunkin',
      'هاف مليون', 'half million',
      'البيك', 'albaik', 'al baik',
      'شاورما', 'shawarma', 'برجر', 'burger', 'بيتزا', 'pizza',
      'مطعم', 'restaurant', 'كافيه', 'cafe', 'قهوة', 'coffee',
      'هنقرستيشن', 'hungerstation',
      'جاهز', 'jahez',
      'تويو', 'toyou',
      'مرسول', 'mrsool',
      'كيتا', 'keeta',
      'شيفز', 'طازج', 'كنتاكي', 'kfc', 'هارديز', 'hardees',
      'سينما', 'cinema', 'vox', 'فوكس', 'موڤي', 'muvi'
    ],
  },
  {
    categoryId: 'transport',
    keywords: [
      'بترومين', 'petromin',
      'ساسكو', 'sasko', 'sasco',
      'نفط', 'naft', 'الدريس', 'aldrees', 'drees',
      'محطة', 'وقود', 'بنزين', 'gas station', 'fuel',
      'أوبر', 'uber',
      'كريم', 'careem',
      'بولت', 'bolt',
      'قطار', 'سار', 'sar train', 'مترو', 'metro',
      'مواقف', 'parking', 'مواقف سيارات', 'تاكسي', 'taxi'
    ],
  },
  {
    categoryId: 'health',
    keywords: [
      'النهدي', 'nahdi',
      'الدواء', 'dawaa', 'al-dawaa',
      'صيدلية', 'pharmacy',
      'مستشفى', 'hospital',
      'مستوصف', 'عيادة', 'clinic', 'دكتور', 'doctor',
      'مختبر', 'تحاليل', 'نظارات', 'بصريات', 'optics', 'dental', 'أسنان'
    ],
  },
  {
    categoryId: 'bills',
    keywords: [
      'كهرباء', 'electricity', 'sec',
      'مياه', 'water', 'nwc',
      'إس تي سي', 'stc', 'stc pay',
      'موبايلي', 'mobily',
      'زين', 'zain',
      'سلام', 'salam',
      'فاتورة', 'سداد', 'sadad', 'bill', 'اشتراك', 'subscription',
      'نتفلكس', 'netflix', 'شاهد', 'shahid', 'spotify', 'سبوتيفاي'
    ],
  },
  {
    categoryId: 'housing',
    keywords: [
      'إيجار', 'rent', 'عقار', 'صيانة منزل', 'سباكة', 'كهربائي',
      'إيكيا', 'ikea', 'هوم سنتر', 'home centre', 'أثاث'
    ],
  },
  {
    categoryId: 'emergency',
    keywords: [
      'أمازون', 'amazon',
      'نون', 'noon',
      'جرير', 'jarir',
      'إكسترا', 'extra',
      'شي إن', 'shein',
      'نمشي', 'namshi',
      'تصليح', 'ورشة', 'صيانة'
    ],
  },
];

/**
 * Detect deposit, salary, or incoming transfer messages to ignore them
 */
export function isDepositOrIncomingMessage(text: string): boolean {
  const depositRegex = /(إيداع|راتب|حوالة\s*واردة|تحويل\s*وارد|تم\s*إضافة|أودع\s*في\s*حسابك|استرداد|استرجاع|عكس\s*عملية|deposit|salary|incoming\s*transfer|refund|credited\s*to|received\s*from|added\s*to\s*your\s*account)/i;
  return depositRegex.test(text);
}

/**
 * Extracts amount from bank SMS text in Saudi Riyals (SAR / ر.س)
 * Converts ٫ (U+066B) -> . and ٬ (U+066C) -> removed before extracting
 */
export function extractAmount(text: string): number | null {
  const normalizedText = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/٫/g, '.') // Arabic decimal separator U+066B -> dot
    .replace(/٬/g, '')  // Arabic thousands separator U+066C -> remove
    .replace(/،/g, ',');

  const patterns = [
    // Preceded by currency: SAR 120.50, ر.س 120, ريال 50
    /(?:SAR|SR|ر\.?س|ريال(?:\s*سعودي)?)\s*[:\s]?\s*([0-9]+(?:[,.][0-9]+)?)/i,
    // Followed by currency: 120.50 SAR, 120.50 ر.س, 120 رس
    /([0-9]+(?:[,.][0-9]+)?)\s*(?:SAR|SR|ر\.?س|رس|ريال(?:\s*سعودي)?)/i,
    // Preceded by action indicators: بمبلغ 120.50, بـ 120.50, خصم 120.50, purchase of 120.50
    /(?:بمبلغ|بـ|مبلغ|شراء|خصم|دفع|سحب|purchase\s+of|purchase|amount|paid)\s*[:\s]?\s*([0-9]+(?:[,.][0-9]+)?)/i,
  ];

  for (const pat of patterns) {
    const match = normalizedText.match(pat);
    if (match && match[1]) {
      let numStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        return Math.round(parsed * 100) / 100;
      }
    }
  }

  return null;
}

/**
 * Extracts merchant name from bank SMS text
 * Uses Arabic-compatible lookahead (?=\s|$) and cuts at first occurrence of (بتاريخ، من بطاقة، الرصيد، مدى، بطاقة، عبر، بواسطة)
 */
export function extractMerchant(text: string): string {
  const merchantPatterns = [
    /لدى\s*:\s*([^\n\r,.;]+)/i,
    /من\s*:\s*([^\n\r,.;]+)/i,
    /لدى\s+([^\n\r,.;]+)/i,
    /في\s+([^\n\r,.;]+)/i,
    /من\s+([^\n\r,.;]+)/i,
    /إلى\s+([^\n\r,.;]+)/i,
    /عبر\s+([^\n\r,.;]+)/i,
    /متجر\s+([^\n\r,.;]+)/i,
    /at\s*:\s*([^\n\r,.;]+)/i,
    /at\s+([^\n\r,.;]+)/i,
    /to\s*:\s*([^\n\r,.;]+)/i,
    /to\s+([^\n\r,.;]+)/i,
    /from\s*:\s*([^\n\r,.;]+)/i,
    /from\s+([^\n\r,.;]+)/i,
    /pos\s*-\s*([^\n\r,.;]+)/i,
  ];

  for (const pat of merchantPatterns) {
    const match = text.match(pat);
    if (match && match[1]) {
      let candidate = match[1].trim();

      // Cut name at the first occurrence of: بتاريخ، من بطاقة، الرصيد، مدى، بطاقة، عبر، بواسطة
      candidate = candidate.replace(/\s+(?:بتاريخ|من\s+بطاقة|الرصيد|مدى|بطاقة|عبر|بواسطة)(?=\s|$).*$/i, '');
      candidate = candidate.replace(/\s+(?:on|via|using|card|ending|account|balance|avail|date)(?=\s|$).*$/i, '');

      // Remove artifacts
      candidate = candidate
        .replace(/\*+\d+/g, '') // remove *1234
        .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, '') // remove YYYY-MM-DD
        .replace(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/g, '') // remove DD/MM/YY or DD/MM/YYYY
        .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '') // remove time
        .replace(/[0-9]+(?:[,.][0-9]+)?\s*(?:SAR|SR|ر\.?س|ريال)/gi, '') // remove inline amounts
        .replace(/["'«»]/g, '')
        .trim();

      if (candidate.length >= 2 && candidate.length <= 40) {
        return candidate;
      }
    }
  }

  return 'عملية بنكية';
}

/**
 * Extracts transaction date from SMS or defaults to local current date (YYYY-MM-DD)
 * Supports YYYY-MM-DD, DD/MM/YYYY, and DD/MM/YY
 */
export function extractDate(text: string): string {
  const normalizedText = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = normalizedText.match(/\b(202[4-9]|203[0-9])[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12][0-9]|3[01])(?=\s|[.,;]|$)/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = normalizedText.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[0-2])[-/.](202[4-9]|203[0-9])(?=\s|[.,;]|$)/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Pattern 3: DD/MM/YY or DD-MM-YY (e.g. 15/04/26 -> 2026-04-15)
  const dmyShortMatch = normalizedText.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|1[0-2])[-/.](2[4-9]|3[0-9])(?=\s|[.,;]|$)/);
  if (dmyShortMatch) {
    const d = String(parseInt(dmyShortMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(dmyShortMatch[2], 10)).padStart(2, '0');
    const y = `20${dmyShortMatch[3]}`;
    return `${y}-${m}-${d}`;
  }

  // Fallback to today in local device time
  return getLocalToday();
}

/**
 * Determines payment method from SMS text
 */
export function extractPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();

  if (
    lower.includes('apple pay') ||
    lower.includes('أبل باي') ||
    lower.includes('stc pay') ||
    lower.includes('urpay') ||
    lower.includes('مدى باي') ||
    lower.includes('mada pay')
  ) {
    return 'digital';
  }

  if (
    lower.includes('سحب نقدي') ||
    lower.includes('صراف') ||
    lower.includes('atm') ||
    lower.includes('cash withdrawal')
  ) {
    return 'cash';
  }

  if (
    lower.includes('حوالة صادرة') ||
    lower.includes('تحويل إلى') ||
    lower.includes('تحويل') ||
    lower.includes('transfer to')
  ) {
    return 'transfer';
  }

  return 'card';
}

/**
 * Categorizes a merchant using learned user corrections first, then the built-in dictionary.
 * If the merchant is unknown, it does NOT choose a category automatically (returns categoryId: '').
 */
export function categorizeMerchant(
  merchant: string,
  categories: Category[],
  learnedRules?: Record<string, string>
): { categoryId: string; isLearned: boolean } {
  const normalized = normalizeMerchantKey(merchant);
  if (!normalized) {
    return { categoryId: '', isLearned: false };
  }

  const rules = learnedRules || getLearnedRules();

  // 1. Check learned user rules
  if (rules[normalized]) {
    const matchedCategory = categories.find((c) => c.id === rules[normalized]);
    if (matchedCategory) {
      return { categoryId: matchedCategory.id, isLearned: true };
    }
  }

  // Substring match in learned rules
  for (const [key, catId] of Object.entries(rules)) {
    if (key.length >= 3 && (normalized.includes(key) || key.includes(normalized))) {
      const matchedCategory = categories.find((c) => c.id === catId);
      if (matchedCategory) {
        return { categoryId: matchedCategory.id, isLearned: true };
      }
    }
  }

  // 2. Check keyword dictionary
  for (const mapping of DEFAULT_KEYWORD_MAP) {
    for (const kw of mapping.keywords) {
      const normalizedKw = normalizeMerchantKey(kw);
      if (normalized.includes(normalizedKw)) {
        const found = categories.find((c) => c.id === mapping.categoryId);
        if (found) {
          return { categoryId: found.id, isLearned: false };
        }
      }
    }
  }

  // 3. Unknown merchant -> Return empty categoryId (Do NOT choose automatically)
  return { categoryId: '', isLearned: false };
}

/**
 * Main parser entry point: parses Saudi bank SMS, checks deposit, extracts data.
 * NOTE: The raw text is NOT stored anywhere and is discarded by the caller.
 */
export function parseBankSms(
  text: string,
  categories: Category[],
  learnedRules?: Record<string, string>
): SmsParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      errorMessage: 'نص الرسالة فارغ، يرجى لصق نص الرسالة البنكية.',
    };
  }

  // Check deposit / incoming
  if (isDepositOrIncomingMessage(trimmed)) {
    return {
      success: false,
      isDeposit: true,
      errorMessage: 'تم تجاهل الرسالة لأنها عملية إيداع أو حوالة واردة وليست مصروفاً.',
    };
  }

  // Extract amount
  const amount = extractAmount(trimmed);
  if (!amount || amount <= 0) {
    return {
      success: false,
      errorMessage: 'لم نتمكن من استخراج المبلغ بالريال من الرسالة. تأكد من احتواء الرسالة على مبلغ صحيح.',
    };
  }

  // Extract merchant
  const merchant = extractMerchant(trimmed);

  // Extract date
  const date = extractDate(trimmed);

  // Extract payment method
  const paymentMethod = extractPaymentMethod(trimmed);

  // Categorize (returns '' if unknown)
  const { categoryId, isLearned } = categorizeMerchant(merchant, categories, learnedRules);
  const category = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const needsCategory = !categoryId;

  return {
    success: true,
    data: {
      amount,
      merchant,
      date,
      paymentMethod,
      categoryId,
      categoryName: category?.name,
      isLearned,
      needsCategory,
    },
  };
}
