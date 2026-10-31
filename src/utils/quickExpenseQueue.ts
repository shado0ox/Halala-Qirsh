import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Category } from '../types';

export interface PendingQuickExpense {
  id: string;
  amount: number;
  categoryId: string;
  note?: string;
  date: string;
  createdAt: number;
  merchant?: string;
  source?: 'manual' | 'sms' | 'quick_intent' | 'apple_pay';
}

export interface QuickCategoryItem {
  id: string;
  name: string;
}

const CATEGORIES_KEY = 'quickCategories';
const PENDING_KEY = 'pendingExpenses';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Synchronizes category IDs and localized names to native Preferences
 * for use by the QuickAddExpense AppIntent.
 */
export async function syncQuickCategories(
  categories: Category[],
  language: 'ar' | 'en' = 'ar'
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const list: QuickCategoryItem[] = categories.map((c) => ({
      id: c.id,
      name: language === 'en' && c.nameEn ? c.nameEn : c.name,
    }));

    await Preferences.set({
      key: CATEGORIES_KEY,
      value: JSON.stringify(list),
    });
  } catch {
    // Fail silently without exposing data
  }
}

/**
 * Safely reads and validates pending expenses queued by the native AppIntent.
 * Corrupted JSON or parsing errors return an empty array without clearing the queue.
 */
export async function readPendingQuickExpenses(): Promise<PendingQuickExpense[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const { value } = await Preferences.get({ key: PENDING_KEY });
    if (!value || typeof value !== 'string') {
      return [];
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is PendingQuickExpense => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const hasValidId = typeof item.id === 'string' && item.id.trim().length > 0;
      const hasValidAmount =
        typeof item.amount === 'number' &&
        !isNaN(item.amount) &&
        item.amount > 0 &&
        item.amount < 1_000_000;
      const hasValidCategoryId =
        typeof item.categoryId === 'string' &&
        (item.source === 'apple_pay' || item.categoryId.trim().length > 0);
      const hasValidDate = typeof item.date === 'string' && DATE_REGEX.test(item.date);

      return Boolean(hasValidId && hasValidAmount && hasValidCategoryId && hasValidDate);
    });
  } catch {
    return [];
  }
}

/**
 * Acknowledges processed expenses by re-reading the queue, removing only the specified IDs,
 * and saving remaining items back to minimize race conditions with Swift enqueues.
 */
export async function ackQuickExpenses(ids: string[]): Promise<void> {
  if (!Capacitor.isNativePlatform() || !ids || ids.length === 0) {
    return;
  }

  try {
    const { value } = await Preferences.get({ key: PENDING_KEY });
    if (!value || typeof value !== 'string') {
      return;
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return;
    }

    const idSet = new Set(ids);
    const remaining = parsed.filter((item) => item && typeof item === 'object' && !idSet.has(item.id));

    await Preferences.set({
      key: PENDING_KEY,
      value: JSON.stringify(remaining),
    });
  } catch {
    // Fail silently without exposing data
  }
}
