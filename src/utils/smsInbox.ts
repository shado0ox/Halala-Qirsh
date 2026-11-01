import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Category, Expense } from '../types';
import { parseBankSms, getLocalToday } from './smsParser';

export interface PendingSmsItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface ProcessedSmsResult {
  toAdd: Array<Omit<Expense, 'id' | 'createdAt'> & { source: 'sms'; isAutoLogged: true; candidateAt: number }>;
  toReview: Array<{ id: string; text: string; createdAt: number; candidateAt: number }>;
  ignoredIds: string[];
}

const PENDING_SMS_KEY = 'pendingSms';

/**
 * Safely reads queued SMS messages captured by the native ImportBankSmsIntent.
 * Validates text length (<= 4000) and id. Corrupted data returns [] without clearing.
 * Privacy guarantee: Raw texts and amounts are NEVER logged to console.
 */
export async function readPendingSms(): Promise<PendingSmsItem[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const { value } = await Preferences.get({ key: PENDING_SMS_KEY });
    if (!value || typeof value !== 'string') {
      return [];
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is PendingSmsItem => {
      if (!item || typeof item !== 'object') return false;
      const hasValidId = typeof item.id === 'string' && item.id.trim().length > 0;
      const hasValidText =
        typeof item.text === 'string' &&
        item.text.trim().length > 0 &&
        item.text.length <= 4000;
      const hasValidCreatedAt = typeof item.createdAt === 'number' && !isNaN(item.createdAt);

      return Boolean(hasValidId && hasValidText && hasValidCreatedAt);
    });
  } catch {
    return [];
  }
}

/**
 * Acknowledges processed SMS messages by removing only specified IDs from native Preferences,
 * minimizing race conditions with Swift enqueues.
 */
export async function ackPendingSms(ids: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || !ids || ids.length === 0) {
    return;
  }

  try {
    const { value } = await Preferences.get({ key: PENDING_SMS_KEY });
    if (!value || typeof value !== 'string') {
      return;
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return;
    }

    const idSet = new Set(ids);
    const remaining = parsed.filter(
      (item) => item && typeof item === 'object' && !idSet.has(item.id)
    );

    await Preferences.set({
      key: PENDING_SMS_KEY,
      value: JSON.stringify(remaining),
    });
  } catch {
    // Fail silently without exposing message contents
  }
}

/**
 * Processes a batch of pending SMS items:
 * 1. Deduplicates identical message texts within the same batch (keeping only the first).
 * 2. Parses bank SMS locally using parseBankSms.
 * 3. Categorizes items into toAdd, toReview, or ignoredIds (deposits / invalid amounts).
 * Privacy rule: Never log raw SMS texts or extracted amounts to console!
 */
export function processPendingSms(
  items: PendingSmsItem[],
  categories: Category[],
  learnedRules?: Record<string, string>
): ProcessedSmsResult {
  const toAdd: ProcessedSmsResult['toAdd'] = [];
  const toReview: ProcessedSmsResult['toReview'] = [];
  const ignoredIds: string[] = [];

  const seenBatchTexts = new Set<string>();

  for (const item of items) {
    const trimmedText = item.text.trim();

    // Deduplicate identical message text within same batch
    if (seenBatchTexts.has(trimmedText)) {
      ignoredIds.push(item.id);
      continue;
    }
    seenBatchTexts.add(trimmedText);

    // Normalizing timestamp: if in seconds, convert to ms
    const candidateAt = item.createdAt > 1e11 ? item.createdAt : item.createdAt * 1000;

    const parsed = parseBankSms(trimmedText, categories, learnedRules);

    // If deposit or parse error or amount <= 0, ignore
    if (!parsed.success) {
      ignoredIds.push(item.id);
      continue;
    }

    if (!parsed.data || parsed.data.amount <= 0) {
      ignoredIds.push(item.id);
      continue;
    }

    const { amount, merchant, date, paymentMethod, categoryId, needsCategory } = parsed.data;

    // Check if category is known and exists in categories
    const matchingCat = categoryId ? categories.find((c) => c.id === categoryId) : undefined;

    if (!needsCategory && matchingCat && categoryId) {
      toAdd.push({
        title: merchant || 'عملية بنكية',
        amount,
        categoryId,
        date: date || getLocalToday(),
        paymentMethod,
        payer: 'الزوج',
        source: 'sms',
        isAutoLogged: true,
        candidateAt,
      });
    } else {
      // Needs user review (unknown merchant or category not identified)
      toReview.push({
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        candidateAt,
      });
    }
  }

  return {
    toAdd,
    toReview,
    ignoredIds,
  };
}
