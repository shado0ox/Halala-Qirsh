/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppData, Category, Expense, BudgetSettings } from '../types';
import { cleanMoneyAmount } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { getLocalToday, categorizeMerchant } from '../utils/smsParser';
import { readPendingQuickExpenses, ackQuickExpenses } from '../utils/quickExpenseQueue';
import { findCrossSourceMatch, applyCrossMatch } from '../utils/crossSourceDedupe';

interface UseQuickQueueProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  hasHydratedRef: React.RefObject<boolean>;
}

export function useQuickQueue({
  categories,
  expenses,
  settings,
  setData,
  showToast,
  hasHydratedRef,
}: UseQuickQueueProps) {
  const processedQuickExpenseIdsRef = useRef<Set<string>>(new Set());
  const isImportingQuickExpensesRef = useRef<boolean>(false);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const importQuickExpenses = useCallback(async () => {
    if (!hasHydratedRef.current || isImportingQuickExpensesRef.current) return;
    if (!Capacitor.isNativePlatform()) return;

    isImportingQuickExpensesRef.current = true;
    try {
      const pending = await readPendingQuickExpenses();
      if (!pending || pending.length === 0) return;

      const toProcess = pending.filter(
        (item) => !processedQuickExpenseIdsRef.current.has(item.id)
      );

      if (toProcess.length === 0) {
        await ackQuickExpenses(pending.map((p) => p.id));
        return;
      }

      const currentSettings = settingsRef.current;
      const currentCategories = categoriesRef.current;
      const isEnLang = currentSettings.language === 'en';

      const ackIds: string[] = [];
      const newExpensesToAdd: Expense[] = [];
      let missingCategoryFound = false;
      let currentExpenses = [...expensesRef.current];
      let mergedApplePayCount = 0;

      for (const item of toProcess) {
        processedQuickExpenseIdsRef.current.add(item.id);
        ackIds.push(item.id);

        const isApplePay = item.source === 'apple_pay';
        if (isApplePay && currentSettings.autoCaptureMode === 'bank_sms') {
          // Gating: Discard Apple Pay item silently when in bank_sms only mode
          continue;
        }

        let category = currentCategories.find((c) => c.id === item.categoryId);

        if (isApplePay) {
          if (!category && item.merchant) {
            const autoCat = categorizeMerchant(item.merchant, currentCategories);
            if (autoCat.categoryId) {
              category = currentCategories.find((c) => c.id === autoCat.categoryId);
            }
          }
          if (!category) {
            category = currentCategories[0];
          }
        }

        if (!category) {
          missingCategoryFound = true;
          continue;
        }

        const categoryName = isEnLang && category.nameEn ? category.nameEn : category.name;
        const title = item.note && item.note.trim()
          ? item.note.trim()
          : item.merchant && item.merchant.trim()
          ? item.merchant.trim()
          : categoryName;

        const safeAmount = cleanMoneyAmount(item.amount);
        const normalizedCreatedAt = item.createdAt
          ? item.createdAt < 10_000_000_000
            ? item.createdAt * 1000
            : item.createdAt
          : Date.now();

        // Prevent double-logging same Apple Pay transaction within 60s
        if (isApplePay) {
          const isDuplicateApplePay = currentExpenses.some(
            (e) =>
              e.source === 'apple_pay' &&
              Math.round(e.amount * 100) === Math.round(safeAmount * 100) &&
              e.date === (item.date || getLocalToday()) &&
              Math.abs(Date.now() - (e.createdAt || 0)) < 60_000
          );
          if (isDuplicateApplePay) {
            continue;
          }
        }

        // Deduplication for Apple Pay against existing SMS expenses
        if (isApplePay) {
          const match = findCrossSourceMatch(
            {
              amount: safeAmount,
              date: item.date || getLocalToday(),
              at: normalizedCreatedAt,
              source: 'apple_pay',
            },
            currentExpenses,
            { requireWindow: true }
          );

          if (match) {
            const merged = applyCrossMatch(match, {
              amount: safeAmount,
              date: item.date || getLocalToday(),
              at: normalizedCreatedAt,
              source: 'apple_pay',
              title,
            });
            currentExpenses = currentExpenses.map((e) => (e.id === match.id ? merged : e));
            mergedApplePayCount++;
            continue;
          }
        }

        const newExp: Expense = {
          id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          amount: safeAmount,
          categoryId: category.id,
          date: item.date || getLocalToday(),
          paymentMethod: isApplePay ? 'digital' : 'card',
          payer: 'الزوج',
          notes: item.note?.trim() || item.merchant?.trim() || undefined,
          source: isApplePay ? 'apple_pay' : 'quick_intent',
          isAutoLogged: isApplePay ? true : undefined,
          crossMatched: false,
          createdAt: normalizedCreatedAt,
        };

        newExpensesToAdd.push(newExp);
        currentExpenses = [newExp, ...currentExpenses];
      }

      if (newExpensesToAdd.length > 0 || mergedApplePayCount > 0) {
        setData((prev) => ({
          ...prev,
          expenses: currentExpenses,
        }));
        nativeHaptics.success(currentSettings.soundEnabled);
      }

      if (ackIds.length > 0) {
        await ackQuickExpenses(ackIds);
      }

      if (missingCategoryFound) {
        showToast(
          isEnLang
            ? 'Failed to log expense from shortcut because category was deleted'
            : 'تعذّر تسجيل مصروف من الاختصار لأن التصنيف محذوف',
          'error'
        );
      }

      if (newExpensesToAdd.length > 0) {
        const hasApplePay = newExpensesToAdd.some((e) => e.source === 'apple_pay');
        if (hasApplePay) {
          showToast(
            isEnLang
              ? `Pay: ${newExpensesToAdd.length} expense(s) logged automatically`
              : `Pay: تم قيد ${newExpensesToAdd.length} عملية تلقائياً`,
            'success'
          );
        } else {
          showToast(
            isEnLang
              ? `${newExpensesToAdd.length} expense(s) added from Shortcut`
              : `تم تسجيل ${newExpensesToAdd.length} مصروف من الاختصار`,
            'success'
          );
        }
      } else if (mergedApplePayCount > 0) {
        showToast(
          isEnLang
            ? `Pay: ${mergedApplePayCount} transaction(s) merged with bank SMS`
            : `Pay: تم دمج ${mergedApplePayCount} عملية مع رسالة البنك لتفادي التكرار`,
          'success'
        );
      }
    } catch {
      // Fail safely
    } finally {
      isImportingQuickExpensesRef.current = false;
    }
  }, [hasHydratedRef, setData, showToast]);

  const importQuickExpensesRef = useRef(importQuickExpenses);
  importQuickExpensesRef.current = importQuickExpenses;
  useEffect(() => {
    importQuickExpensesRef.current = importQuickExpenses;
  }, [importQuickExpenses]);

  return {
    importQuickExpenses,
    importQuickExpensesRef,
    processedQuickExpenseIdsRef,
  };
}
