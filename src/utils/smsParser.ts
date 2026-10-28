import { Category, PaymentMethod } from '../types';

export interface ParsedBankSms {
  amount: number;
  merchant: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  categoryId: string;
  categoryName?: string;
  isLearned?: boolean;
  /** true when the merchant is unknown: the UI must make the user pick a category */
  needsCategory?: boolean;
}

export interface SmsParseResult {
  success: boolean;
  isDeposit?: boolean;
  errorMessage?: string;
  data?: ParsedBankSms;
}

const LEARNED_RULES_KEY = 'halala_qirsh_learned_merchant_categories';

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
 */
export function saveLearnedRule(merchant: string, categoryId: string): void {
  const normalized = normalizeMerchantKey(merchant);
  if (!normalized || !categoryId) return;
  if (merchant.trim() === 'عملية بنكية') return; // generic placeholder is never learned
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
 * Local (device) date as YYYY-MM-DD. Never use toISOString() for this: it is UTC,
 * so between 00:00 and 03:00 Saudi time it returns yesterday.
 */
export function getLocalToday(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Arabic-Indic / Persian digits -> Latin, Arabic decimal (٫) -> '.', Arabic thousands (٬) and comma (،) -> ','
 */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[٬،]/g, ',');
}

/**
 * Detect deposit, salary, or incoming transfer messages to ignore them
 */
export function isDepositOrIncomingMessage(text: string): boolean {
  const depositRegex = /(إيداع|راتب|حوالة\s*واردة|تحويل\s*وارد|تم\s*إضافة|أودع\s*في\s*حسابك|استرداد|استرجاع|عكس\s*عملية|deposit|salary|incoming\s*transfer|refund|credited\s*to|received\s*from|added\s*to\s*your\s*account)/i;
  return depositRegex.test(text);
}

const CUR = '(?:SAR|SR|ر\\.?\\s?س|رس|ريال(?:\\s*سعودي)?|﷼)';
// 1,250.75 | 1250.75 | 120,50 | 3000
const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d{1,2})?)';

function parseNumber(raw: string): number {
  const s = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw) ? raw.replace(/,/g, '') : raw.replace(',', '.');
  return parseFloat(s);
}

// Remove "balance" fragments so the balance is never mistaken for the amount
const BALANCE_RE = new RegExp(
  '(?:الرصيد|رصيدك|رصيد)(?:\\s*(?:المتاح|المتبقي))?|المتاح|المتبقي|available\\s*balance|avail\\.?\\s*bal(?:ance)?|balance',
  'i'
);
function stripBalance(text: string): string {
  const re = new RegExp(`(?:${BALANCE_RE.source})\\s*[:：]?\\s*${CUR}?\\s*-?\\d[\\d,]*(?:\\.\\d+)?\\s*${CUR}?`, 'gi');
  return text.replace(re, ' ');
}

/**
 * Extracts amount from bank SMS text in Saudi Riyals (SAR / ر.س)
 */
export function extractAmount(text: string): number | null {
  const t = stripBalance(normalizeDigits(text));
  const patterns = [
    new RegExp(`${CUR}\\s*[:\\s]?\\s*${NUM}`, 'i'), // SAR 120.50, ر.س 120
    new RegExp(`${NUM}\\s*${CUR}`, 'i'), // 120.50 SAR, 120 رس
    new RegExp(`(?:بمبلغ|بـ|مبلغ|شراء|خصم|دفع|سحب|purchase\\s+of|purchase|amount|paid)\\s*[:\\s]?\\s*${NUM}`, 'i'),
  ];
  for (const pat of patterns) {
    const match = t.match(pat);
    if (match && match[1]) {
      const parsed = parseNumber(match[1]);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        return Math.round(parsed * 100) / 100;
      }
    }
  }
  return null;
}

// \b does not work with Arabic in JS, so boundaries are spelled out with lookaheads.
const MERCHANT_STOP =
  '(?:بتاريخ|التاريخ|في|من|بواسطة|عبر|بطاقة|بطاقتك|مدى|حساب|حسابك|الرصيد|رصيد|المتبقي|المتاح|بمبلغ|مبلغ|على|إلى|لدى|وقت|الساعة|on|via|using|card|ending|account|acct|balance|avail\\w*|date|ref|reference)';
const STOP_RE = new RegExp(`\\s+${MERCHANT_STOP}(?=[\\s:]|$)`, 'i');
const GENERIC_RE = /^(?:حسابك|حسابي|الحساب|حساب|بطاقتك|بطاقة|your account|account|card)$/i;

const MERCHANT_PREPS = ['لدى', 'من', 'متجر', 'merchant', 'at', 'from', 'to', 'إلى', 'عبر', 'في'];
const MERCHANT_PATTERNS: RegExp[] = [
  ...MERCHANT_PREPS.map((p) => new RegExp(`(?:^|[\\s:])${p}(?:\\s*[:：]\\s*|\\s+)([^\\n\\r;]+)`, 'i')),
  /pos\s*-\s*([^\n\r;]+)/i,
];

function cleanMerchant(raw: string): string {
  const cut = STOP_RE.exec(raw);
  const base = cut ? raw.slice(0, cut.index) : raw;
  return base
    .replace(/\*+\d+/g, '')
    .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g, '')
    .replace(/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/g, '')
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, '')
    .replace(new RegExp(`\\d+(?:[.,]\\d+)?\\s*${CUR}`, 'gi'), '')
    .replace(/["'«»]/g, '')
    .replace(/^[\s:\-–.]+|[\s:\-–.,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts merchant name from bank SMS text
 */
export function extractMerchant(text: string): string {
  const t = normalizeDigits(text);
  for (const pat of MERCHANT_PATTERNS) {
    const match = t.match(pat);
    if (!match || !match[1]) continue;
    const candidate = cleanMerchant(match[1]);
    if (
      candidate.length >= 2 &&
      candidate.length <= 40 &&
      /\p{L}/u.test(candidate) &&
      !GENERIC_RE.test(candidate)
    ) {
      return candidate;
    }
  }
  return 'عملية بنكية';
}

function validYmd(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
const ymdStr = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Extracts transaction date from SMS or defaults to the device's local date (YYYY-MM-DD)
 */
export function extractDate(text: string, now: Date = new Date()): string {
  const t = normalizeDigits(text);

  // YYYY-MM-DD / YYYY/MM/DD
  const ymd = t.match(/\b(20[2-3]\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (ymd && validYmd(+ymd[1], +ymd[2], +ymd[3])) return ymdStr(+ymd[1], +ymd[2], +ymd[3]);

  // DD/MM/YYYY
  const dmy = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20[2-3]\d)\b/);
  if (dmy && validYmd(+dmy[3], +dmy[2], +dmy[1])) return ymdStr(+dmy[3], +dmy[2], +dmy[1]);

  // Two-digit year: DD/MM/YY (e.g. 20/10/26) or YY/MM/DD (e.g. 26-10-20). Prefer a date within the last year, reject future dates.
  const short = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})\b/);
  if (short) {
    const a = +short[1], b = +short[2], c = +short[3];
    const limit = getLocalToday(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const candidates: Array<[number, number, number]> = [
      [2000 + c, b, a], // DD/MM/YY
      [2000 + a, b, c], // YY/MM/DD
    ];
    const lowest = getLocalToday(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 366));
    // Prefer the reading that lands within the last year (bank SMS are recent), then any non-future one
    for (const [y, m, d] of candidates) {
      const s = ymdStr(y, m, d);
      if (validYmd(y, m, d) && s >= lowest && s <= limit) return s;
    }
    for (const [y, m, d] of candidates) {
      if (validYmd(y, m, d) && ymdStr(y, m, d) <= limit) return ymdStr(y, m, d);
    }
  }

  return getLocalToday(now);
}

/**
 * Determines payment method from SMS text
 */
export function extractPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();
  if (
    lower.includes('apple pay') || lower.includes('أبل باي') || lower.includes('ابل باي') ||
    lower.includes('stc pay') || lower.includes('urpay') ||
    lower.includes('مدى باي') || lower.includes('mada pay')
  ) {
    return 'digital';
  }
  if (lower.includes('سحب نقدي') || lower.includes('صراف') || lower.includes('atm') || lower.includes('cash withdrawal')) {
    return 'cash';
  }
  if (lower.includes('حوالة صادرة') || lower.includes('تحويل إلى') || lower.includes('تحويل') || lower.includes('transfer to')) {
    return 'transfer';
  }
  return 'card';
}

/**
 * Categorizes a merchant: learned user corrections first, then the built-in dictionary.
 * Unknown merchants return needsCategory=true (no silent default) so the UI can ask the user.
 */
export function categorizeMerchant(
  merchant: string,
  categories: Category[],
  learnedRules?: Record<string, string>
): { categoryId: string; isLearned: boolean; needsCategory?: boolean } {
  const normalized = normalizeMerchantKey(merchant);
  const rules = learnedRules || getLearnedRules();

  if (rules[normalized]) {
    const matched = categories.find((c) => c.id === rules[normalized]);
    if (matched) return { categoryId: matched.id, isLearned: true, needsCategory: false };
  }
  if (normalized.length >= 3) {
    for (const [key, catId] of Object.entries(rules)) {
      if (key.length >= 3 && (normalized.includes(key) || key.includes(normalized))) {
        const matched = categories.find((c) => c.id === catId);
        if (matched) return { categoryId: matched.id, isLearned: true, needsCategory: false };
      }
    }
  }

  const tokens = normalized.split(' ');
  for (const mapping of DEFAULT_KEYWORD_MAP) {
    for (const kw of mapping.keywords) {
      const nk = normalizeMerchantKey(kw);
      if (!nk) continue;
      // Short keywords (sec, stc, ماك, سار...) must match a whole word, not a substring
      const hit = nk.length <= 3 ? tokens.includes(nk) : normalized.includes(nk);
      if (hit) {
        const found = categories.find((c) => c.id === mapping.categoryId);
        if (found) return { categoryId: found.id, isLearned: false, needsCategory: false };
      }
    }
  }

  return { categoryId: '', isLearned: false, needsCategory: true };
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
  const trimmed = normalizeDigits(text.trim());
  if (!trimmed) {
    return { success: false, errorMessage: 'نص الرسالة فارغ، يرجى لصق نص الرسالة البنكية.' };
  }
  if (isDepositOrIncomingMessage(trimmed)) {
    return {
      success: false,
      isDeposit: true,
      errorMessage: 'تم تجاهل الرسالة لأنها عملية إيداع أو حوالة واردة وليست مصروفاً.',
    };
  }
  const amount = extractAmount(trimmed);
  if (!amount || amount <= 0) {
    return {
      success: false,
      errorMessage: 'لم نتمكن من استخراج المبلغ بالريال من الرسالة. تأكد من احتواء الرسالة على مبلغ صحيح.',
    };
  }

  const merchant = extractMerchant(trimmed);
  const date = extractDate(trimmed);
  const paymentMethod = extractPaymentMethod(trimmed);
  const { categoryId, isLearned, needsCategory } =
    merchant === 'عملية بنكية'
      ? { categoryId: '', isLearned: false, needsCategory: true }
      : categorizeMerchant(merchant, categories, learnedRules);
  const category = categories.find((c) => c.id === categoryId);

  return {
    success: true,
    data: { amount, merchant, date, paymentMethod, categoryId, categoryName: category?.name, isLearned, needsCategory },
  };
}

export const getLocalDateString = getLocalToday;