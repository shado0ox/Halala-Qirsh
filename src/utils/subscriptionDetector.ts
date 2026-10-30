/**
 * Subscription & Recurring Expense Detection Engine (Pure JavaScript/TypeScript)
 * Runs 100% offline and privately on stored device transaction history.
 */

import { Expense, DetectedSubscription, SubscriptionFrequency, PriceIncreaseInfo } from '../types';

/**
 * Normalizes merchant names to match slight variations:
 * e.g. "NETFLIX.COM", "Netflix", "Netflix Inc.", "Spotify AB", "Apple Services"
 */
export function normalizeSubscriptionMerchant(rawName: string): string {
  if (!rawName || typeof rawName !== 'string') return '';

  let name = rawName.trim().toLowerCase();

  // Remove common protocols & domain prefixes
  name = name.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  // Remove domain extensions (.com, .sa, .net, .org, .app, .io, .co, .tv, .plus, etc.)
  name = name.replace(/\.(com|sa|net|org|app|io|co|tv|plus|me|ai|cloud|site|xyz|online|shop)(\/.*)?$/i, '');
  name = name.replace(/\/bill|\/help|\/pay|\/subscription|\/sub$/i, '');

  // Remove common payment & transaction noise prefixes only if there is text after
  name = name.replace(/^(pos|mada|visa|mastercard|card|apple\s*pay|urpay)\s*[-:]?\s+/i, '');
  name = name.replace(/^(purchase\s*(?:at|from)?|payment\s*(?:to)?|auto\s*debit|direct\s*debit|transfer\s*to)\s*[:：]?\s+/i, '');
  name = name.replace(/^(شراء\s*(?:من|لدى)?|خصم\s*(?:من)?|سداد\s*فاتورة|سداد|فاتورة|دفع\s*لـ|اشتراك\s*(?:في)?|رسوم)\s*[:：]?\s+/i, '');
  name = name.replace(/^(gym|club|نادي)\s*[-:]?\s+/i, '');

  // Canonical alias mappings (checked early)
  if (/netflix/i.test(name)) return 'netflix';
  if (/spotify/i.test(name)) return 'spotify';
  if (/apple|itunes|icloud/i.test(name)) return 'apple';
  if (/^stc/i.test(name)) return 'stc';
  if (/mobily|موبايلي/i.test(name)) return 'mobily';
  if (/zain|زين/i.test(name)) return 'zain';
  if (/shahid|شاهد/i.test(name)) return 'shahid';
  if (/osn/i.test(name)) return 'osn';
  if (/youtube/i.test(name)) return 'youtube';
  if (/chatgpt|openai/i.test(name)) return 'chatgpt';
  if (/amazon\s*prime|prime\s*video/i.test(name)) return 'amazon prime';
  if (/fitness\s*time|وقت\s*اللياقة/i.test(name)) return 'fitness time';
  if (/^playstation|^psn/i.test(name)) return 'playstation';
  if (/^xbox|^microsoft/i.test(name)) return 'xbox';
  if (/^disney/i.test(name)) return 'disney';

  // Remove common corporate suffixes (inc, llc, ltd, corp, ab, gmbh, co, etc.)
  name = name.replace(/\s+(inc\.?|llc\.?|ltd\.?|corp\.?|ab|gmbh|co\.?|sa|s\.a\.?)$/i, '');

  // Remove common subscription suffixes
  name = name.replace(/\s+(subscription|sub|premium|plus|\+|vip|مفوتر|شهري|سنوي|باقة)\b/gi, '');

  // Clean trailing punctuation and digits
  name = name.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  // Canonical alias mappings
  if (/^netflix/i.test(name)) return 'netflix';
  if (/^spotify/i.test(name)) return 'spotify';
  if (/^apple|^itunes|^icloud/i.test(name)) return 'apple';
  if (/^stc|^اس تي سي/i.test(name)) return 'stc';
  if (/^mobily|^موبايلي/i.test(name)) return 'mobily';
  if (/^zain|^زين/i.test(name)) return 'zain';
  if (/^shahid|^شاهد/i.test(name)) return 'shahid';
  if (/^osn/i.test(name)) return 'osn';
  if (/^youtube|^google\s*youtube/i.test(name)) return 'youtube';
  if (/^chatgpt|^openai/i.test(name)) return 'chatgpt';
  if (/^amazon\s*prime|^prime\s*video/i.test(name)) return 'amazon prime';
  if (/^fitness\s*time|^وقت\s*اللياقة/i.test(name)) return 'fitness time';
  if (/^playstation|^psn/i.test(name)) return 'playstation';
  if (/^xbox|^microsoft/i.test(name)) return 'xbox';
  if (/^disney/i.test(name)) return 'disney';

  return name || rawName.trim().toLowerCase();
}

/**
 * Calculates day difference between two YYYY-MM-DD dates
 */
export function getDaysBetweenDates(d1: string, d2: string): number {
  const [y1, m1, day1] = d1.split('-').map(Number);
  const [y2, m2, day2] = d2.split('-').map(Number);

  const t1 = Date.UTC(y1, m1 - 1, day1);
  const t2 = Date.UTC(y2, m2 - 1, day2);

  const diffMs = Math.abs(t2 - t1);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Checks whether two amounts are within acceptable tolerance
 * (5-10% or absolute difference <= 3.0 for small rounding / taxes / VAT)
 */
export function isAmountSimilar(a: number, b: number, tolerancePct: number = 0.10): boolean {
  if (a <= 0 || b <= 0) return false;
  const absDiff = Math.abs(a - b);
  if (absDiff <= 3.0) return true; // tax / exchange rounding
  const max = Math.max(a, b);
  return absDiff / max <= tolerancePct;
}

/**
 * Evaluates a sequence of intervals to match a regular cadence.
 * Returns the matched frequency or null if random / variable.
 */
interface CadenceMatchResult {
  frequency: SubscriptionFrequency;
  confidence: number;
}

const FREQUENCY_TARGETS: Array<{
  frequency: SubscriptionFrequency;
  targetDays: number;
  minDays: number;
  maxDays: number;
  missedCycleTolerance: number;
}> = [
  { frequency: 'weekly', targetDays: 7, minDays: 5, maxDays: 9, missedCycleTolerance: 3 },
  { frequency: 'biweekly', targetDays: 14, minDays: 11, maxDays: 17, missedCycleTolerance: 4 },
  { frequency: 'monthly', targetDays: 30, minDays: 25, maxDays: 35, missedCycleTolerance: 7 },
  { frequency: 'quarterly', targetDays: 90, minDays: 80, maxDays: 102, missedCycleTolerance: 14 },
  { frequency: 'yearly', targetDays: 365, minDays: 345, maxDays: 385, missedCycleTolerance: 25 },
];

export function detectCadence(intervals: number[]): CadenceMatchResult | null {
  if (intervals.length === 0) return null;

  let bestMatch: CadenceMatchResult | null = null;
  let highestConfidence = 0;

  for (const target of FREQUENCY_TARGETS) {
    let matches = 0;
    let missedCyclesHandled = 0;

    for (const interval of intervals) {
      // Direct cycle match with date drift tolerance
      if (interval >= target.minDays && interval <= target.maxDays) {
        matches++;
      }
      // Single missed cycle handling: ~2x target (e.g. missed month 55-65 days)
      else if (
        interval >= target.targetDays * 2 - target.missedCycleTolerance &&
        interval <= target.targetDays * 2 + target.missedCycleTolerance
      ) {
        matches += 0.85;
        missedCyclesHandled++;
      }
      // Double missed cycle handling: ~3x target
      else if (
        interval >= target.targetDays * 3 - target.missedCycleTolerance &&
        interval <= target.targetDays * 3 + target.missedCycleTolerance
      ) {
        matches += 0.7;
        missedCyclesHandled++;
      }
    }

    const confidence = matches / intervals.length;

    // We require at least 60% confidence and that either direct match or valid missed cycle covers it
    if (confidence >= 0.6 && confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = {
        frequency: target.frequency,
        confidence,
      };
    }
  }

  return bestMatch;
}

/**
 * Calculates next expected renewal date from last charge date and frequency
 */
export function calculateNextRenewalDate(
  lastChargeDate: string,
  frequency: SubscriptionFrequency,
  referenceDateStr?: string
): string {
  const [y, m, d] = lastChargeDate.split('-').map(Number);
  const nextDate = new Date(y, m - 1, d);

  const advanceOnce = () => {
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly': {
        const targetMonth = nextDate.getMonth() + 1;
        nextDate.setMonth(targetMonth);
        // Handle month end overflow (e.g. Jan 31 -> Feb 28)
        if (nextDate.getMonth() > targetMonth % 12) {
          nextDate.setDate(0);
        }
        break;
      }
      case 'quarterly': {
        const targetMonth = nextDate.getMonth() + 3;
        nextDate.setMonth(targetMonth);
        if (nextDate.getMonth() > targetMonth % 12) {
          nextDate.setDate(0);
        }
        break;
      }
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }
  };

  advanceOnce();

  // If nextDate is already in the past relative to referenceDate, advance until >= referenceDate
  if (referenceDateStr) {
    const [refY, refM, refD] = referenceDateStr.split('-').map(Number);
    const refDate = new Date(refY, refM - 1, refD);

    let safetyCount = 0;
    while (nextDate < refDate && safetyCount < 36) {
      advanceOnce();
      safetyCount++;
    }
  }

  return formatDateToYmd(nextDate);
}

/**
 * Detects if a price increase occurred between historical charges and the latest charge
 */
export function detectPriceIncrease(
  charges: Array<{ date: string; amount: number }>
): PriceIncreaseInfo | undefined {
  if (charges.length < 2) return undefined;

  // Sorted chronologically
  const sorted = [...charges].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  // Look at baseline amount from preceding charges
  const preceding = sorted.slice(0, sorted.length - 1);
  if (preceding.length === 0) return undefined;

  // Calculate median or most frequent amount in preceding history
  const precedingAmounts = preceding.map((c) => c.amount);
  const baseline = precedingAmounts[precedingAmounts.length - 1]; // most recent preceding

  // Price increase flag when latest is higher by at least 4% and more than 1.5 units
  const diff = latest.amount - baseline;
  if (diff > 1.5 && diff / baseline >= 0.04) {
    const percentage = Math.round((diff / baseline) * 100);
    return {
      oldAmount: baseline,
      newAmount: latest.amount,
      difference: Math.round(diff * 100) / 100,
      percentage,
      date: latest.date,
    };
  }

  return undefined;
}

export interface DetectionOptions {
  currentDate?: string;
  minOccurrences?: number;
  amountTolerancePct?: number;
  dismissedMerchants?: string[];
  existingSubscriptions?: DetectedSubscription[];
}

/**
 * Main Detection Algorithm: Analyzes stored transactions and outputs detected subscriptions
 */
export function detectSubscriptionsFromExpenses(
  expenses: Expense[],
  optionsOrExisting: DetectionOptions | DetectedSubscription[] = {},
  dismissedMerchantsArg: string[] = []
): DetectedSubscription[] {
  let options: DetectionOptions;
  if (Array.isArray(optionsOrExisting)) {
    options = {
      existingSubscriptions: optionsOrExisting,
      dismissedMerchants: dismissedMerchantsArg,
    };
  } else {
    options = optionsOrExisting;
  }

  const {
    currentDate = formatDateToYmd(new Date()),
    minOccurrences = 2,
    amountTolerancePct = 0.12,
    dismissedMerchants = [],
    existingSubscriptions = [],
  } = options;

  const dismissedSet = new Set(
    dismissedMerchants.map((m) => normalizeSubscriptionMerchant(m).toLowerCase())
  );

  // Map of existing subscriptions by normalized merchant
  const existingMap = new Map<string, DetectedSubscription>();
  for (const sub of existingSubscriptions) {
    existingMap.set(sub.normalizedMerchant, sub);
    if (sub.status === 'dismissed') {
      dismissedSet.add(sub.normalizedMerchant);
    }
  }

  // 1. Group expenses by normalized merchant
  const groups = new Map<string, Array<{ expense: Expense; date: string; amount: number }>>();

  for (const exp of expenses) {
    // Ignore invalid, zero, or transfer-like expenses
    if (typeof exp.amount !== 'number' || exp.amount <= 0) continue;

    const rawMerchant = exp.title || exp.notes || '';
    const norm = normalizeSubscriptionMerchant(rawMerchant);

    if (!norm || norm.length < 2) continue;
    if (dismissedSet.has(norm)) continue;

    const entry = {
      expense: exp,
      date: exp.date,
      amount: exp.amount,
    };

    const group = groups.get(norm) || [];
    group.push(entry);
    groups.set(norm, group);
  }

  const results: DetectedSubscription[] = [];

  // 2. Analyze each candidate group
  for (const [normMerchant, entries] of groups.entries()) {
    if (entries.length < minOccurrences) continue;

    // Sort chronologically
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // Collapse charges occurring within <= 2 days (e.g. duplicate or retry)
    const collapsedEntries: typeof entries = [];
    for (const item of entries) {
      if (collapsedEntries.length === 0) {
        collapsedEntries.push(item);
      } else {
        const prev = collapsedEntries[collapsedEntries.length - 1];
        const days = getDaysBetweenDates(prev.date, item.date);
        if (days <= 2) {
          // If close, keep the higher or primary charge to not disrupt cadence
          if (item.amount > prev.amount) {
            collapsedEntries[collapsedEntries.length - 1] = item;
          }
        } else {
          collapsedEntries.push(item);
        }
      }
    }

    if (collapsedEntries.length < minOccurrences) continue;

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < collapsedEntries.length; i++) {
      const days = getDaysBetweenDates(collapsedEntries[i - 1].date, collapsedEntries[i].date);
      intervals.push(days);
    }

    // Check cadence match
    const cadence = detectCadence(intervals);
    if (!cadence) {
      // If no cadence matches, check if user had already confirmed this subscription
      const existing = existingMap.get(normMerchant);
      if (existing && existing.status === 'confirmed') {
        // Keep confirmed subscriptions even if cadence drifted slightly
        const last = collapsedEntries[collapsedEntries.length - 1];
        const priceIncrease = detectPriceIncrease(collapsedEntries);
        results.push({
          ...existing,
          lastChargeDate: last.date,
          typicalAmount: last.amount,
          chargeCount: collapsedEntries.length,
          priceHistory: collapsedEntries.map((c) => ({
            date: c.date,
            amount: c.amount,
            expenseId: c.expense.id,
          })),
          nextExpectedRenewalDate: calculateNextRenewalDate(
            last.date,
            existing.detectedFrequency,
            currentDate
          ),
          priceIncrease,
        });
      }
      continue;
    }

    // Amount Consistency check
    // Ensure this is not a noisy merchant with high random variance (like supermarket Panda)
    const amounts = collapsedEntries.map((e) => e.amount);
    const meanAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, a) => sum + Math.pow(a - meanAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // If coefficient of variation is high (> 25%) and amounts aren't in a step/price increase
    const priceIncrease = detectPriceIncrease(collapsedEntries);
    const hasConsistentAmounts = amounts.every((amt) =>
      isAmountSimilar(amt, meanAmount, amountTolerancePct)
    );

    if (!hasConsistentAmounts && !priceIncrease && stdDev / meanAmount > 0.22) {
      // Discard noisy merchant
      continue;
    }

    const lastEntry = collapsedEntries[collapsedEntries.length - 1];
    const displayMerchant =
      entries[entries.length - 1].expense.title.trim() ||
      entries[0].expense.title.trim() ||
      normMerchant;

    const nextRenewal = calculateNextRenewalDate(
      lastEntry.date,
      cadence.frequency,
      currentDate
    );

    const existing = existingMap.get(normMerchant);
    const status = existing ? existing.status : 'detected';

    // Build detected subscription
    const detected: DetectedSubscription = {
      id: existing ? existing.id : `sub-${normMerchant}-${Date.now()}`,
      merchant: existing?.merchant || displayMerchant,
      normalizedMerchant: normMerchant,
      typicalAmount: lastEntry.amount,
      detectedFrequency: existing?.detectedFrequency || cadence.frequency,
      lastChargeDate: lastEntry.date,
      nextExpectedRenewalDate: nextRenewal,
      status,
      detectedAt: existing?.detectedAt || Date.now(),
      chargeCount: collapsedEntries.length,
      priceHistory: collapsedEntries.map((c) => ({
        date: c.date,
        amount: c.amount,
        expenseId: c.expense.id,
      })),
      previousAmount: priceIncrease ? priceIncrease.oldAmount : undefined,
      priceIncrease,
      notes: existing?.notes,
      reminderDaysBefore: existing?.reminderDaysBefore ?? 3,
      categoryId: lastEntry.expense.categoryId,
    };

    results.push(detected);
  }

  // Preserve any confirmed manual subscriptions that might not have matching recent expenses
  for (const [key, existing] of existingMap.entries()) {
    if (existing.status === 'confirmed' && !results.some((r) => r.normalizedMerchant === key)) {
      results.push(existing);
    }
  }

  return results;
}
