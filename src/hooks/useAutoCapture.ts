/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  AppData,
  Category,
  Expense,
  BudgetSettings,
} from '../types';
import { cleanMoneyAmount } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { getLocalToday, categorizeMerchant, getLearnedRules } from '../utils/smsParser';
import {
  isSmartSmsDeepLink,
  isApplePayDeepLink,
  parseApplePayDeepLink,
  ApplePayTransactionPayload,
} from '../utils/deepLink';
import { readPendingSms, ackPendingSms, processPendingSms } from '../utils/smsInbox';
import { findCrossSourceMatch, applyCrossMatch } from '../utils/crossSourceDedupe';

interface UseAutoCaptureProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isLocked: boolean;
  isLockedRef: React.RefObject<boolean>;
  hasHydratedRef: React.RefObject<boolean>;
}

export function useAutoCapture({
  categories,
  expenses,
  settings,
  setData,
  showToast,
  isLocked,
  isLockedRef,
  hasHydratedRef,
}: UseAutoCaptureProps) {
  const [isSmartSmsOpen, setIsSmartSmsOpen] = useState<boolean>(false);
  const [currentReviewSmsText, setCurrentReviewSmsText] = useState<string | undefined>(undefined);
  const [isApplePaySetupOpen, setIsApplePaySetupOpen] = useState<boolean>(false);
  const [applePayPendingReview, setApplePayPendingReview] = useState<
    (ApplePayTransactionPayload & { amount: number; merchant: string }) | null
  >(null);

  const pendingSmartSmsOpenRef = useRef<boolean>(false);
  const pendingApplePayPayloadRef = useRef<ApplePayTransactionPayload | null>(null);
  const pendingSmsReviewQueueRef = useRef<Array<{ id: string; text: string; createdAt: number }>>([]);
  const hasHandledLaunchUrlRef = useRef<boolean>(false);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const advanceSmsReviewQueue = useCallback(() => {
    if (pendingSmsReviewQueueRef.current.length > 0) {
      const nextItem = pendingSmsReviewQueueRef.current.shift()!;
      setCurrentReviewSmsText(nextItem.text);
      setIsSmartSmsOpen(true);
    } else {
      setCurrentReviewSmsText(undefined);
    }
  }, []);

  const handleCloseSmartSms = useCallback(() => {
    setIsSmartSmsOpen(false);
    setCurrentReviewSmsText(undefined);
    if (pendingSmsReviewQueueRef.current.length > 0) {
      setTimeout(() => {
        advanceSmsReviewQueue();
      }, 300);
    }
  }, [advanceSmsReviewQueue]);

  const handleCrossMatchExisting = useCallback((matchedExpenseId: string) => {
    const currentSettings = settingsRef.current;
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === matchedExpenseId ? { ...e, crossMatched: true } : e
      ),
    }));
    nativeHaptics.success(currentSettings.soundEnabled);
    showToast(
      currentSettings.language === 'en'
        ? 'Duplicate expense merged with existing record'
        : 'تم دمج المصروف مع العملية المسجلة مسبقاً',
      'success'
    );
  }, [setData, showToast]);

  const processApplePayPayload = useCallback(
    (payload: ApplePayTransactionPayload) => {
      const currentSettings = settingsRef.current;
      const currentCategories = categoriesRef.current;

      if (typeof payload.amount === 'number' && payload.amount > 0) {
        // Gating: If bank_sms only, ignore Apple Pay transaction
        if (currentSettings.autoCaptureMode === 'bank_sms') {
          return;
        }

        const isAutoCaptureActive =
          currentSettings.autoCaptureMode === 'apple_pay' ||
          currentSettings.autoCaptureMode === 'both';

        // Auto-log directly if autoLog is true OR if autoCapture is active (unless explicitly disabled)
        const shouldAutoLog =
          payload.autoLog === true ||
          (payload.autoLog !== false && isAutoCaptureActive);

        if (shouldAutoLog) {
          // Direct auto-log without modal prompt
          const isEnLang = currentSettings.language === 'en';
          const merchant = payload.merchant?.trim() || (isEnLang ? 'Apple Pay' : 'عملية Apple Pay');
          const { categoryId: predictedCatId } = categorizeMerchant(merchant, currentCategories);
          const rawCatId = payload.categoryId || payload.category || '';
          const explicitCat = rawCatId ? currentCategories.find((c) => c.id === rawCatId) : undefined;
          const predictedCat = predictedCatId ? currentCategories.find((c) => c.id === predictedCatId) : undefined;
          const targetCat = explicitCat || predictedCat || currentCategories[0];
          const targetCatId = targetCat?.id || 'food';
          const catName = isEnLang && targetCat?.nameEn ? targetCat.nameEn : (targetCat?.name || 'عام');
          const title = merchant.trim() || catName;

          const safeAmount = cleanMoneyAmount(payload.amount);

          // Same-source deduplication: prevent double-logging same Apple Pay transaction within 60s
          const isDuplicateApplePay = expensesRef.current.some(
            (e) =>
              e.source === 'apple_pay' &&
              Math.round(e.amount * 100) === Math.round(safeAmount * 100) &&
              e.date === getLocalToday() &&
              Math.abs(Date.now() - (e.createdAt || 0)) < 60_000
          );
          if (isDuplicateApplePay) {
            return;
          }

          // Cross-source deduplication: check if existing SMS expense matches
          const existingMatch = findCrossSourceMatch(
            {
              amount: safeAmount,
              date: getLocalToday(),
              at: Date.now(),
              source: 'apple_pay',
            },
            expensesRef.current,
            { requireWindow: true }
          );

          if (existingMatch) {
            const merged = applyCrossMatch(existingMatch, {
              amount: safeAmount,
              date: getLocalToday(),
              at: Date.now(),
              source: 'apple_pay',
              title,
            });
            setData((prev) => ({
              ...prev,
              expenses: prev.expenses.map((e) => (e.id === existingMatch.id ? merged : e)),
            }));
            nativeHaptics.success(currentSettings.soundEnabled);
            showToast(
              isEnLang
                ? `Pay: Transaction merged with bank SMS (${safeAmount})`
                : `Pay: تم دمج العملية مع رسالة البنك (${safeAmount})`,
              'success'
            );
            return;
          }

          const newExp: Expense = {
            id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title,
            amount: safeAmount,
            categoryId: targetCatId,
            date: getLocalToday(),
            paymentMethod: 'digital',
            payer: 'الزوج',
            notes: payload.note || merchant || undefined,
            source: 'apple_pay',
            isAutoLogged: true,
            createdAt: Date.now(),
          };

          setData((prev) => ({
            ...prev,
            expenses: [newExp, ...prev.expenses],
          }));
          nativeHaptics.success(currentSettings.soundEnabled);
          showToast(
            isEnLang
              ? `Pay: ${safeAmount} logged automatically`
              : `Pay: تم قيد ${safeAmount} تلقائياً`,
            'success'
          );
        } else {
          // Open review modal for user confirmation / details tweak
          setApplePayPendingReview({
            amount: payload.amount,
            merchant: payload.merchant || (currentSettings.language === 'en' ? 'Apple Pay Merchant' : 'متجر عبر Apple Pay'),
            ...payload,
          });
        }
      } else {
        // Missing amount or guide trigger: open setup modal
        setIsApplePaySetupOpen(true);
      }
    },
    [setData, showToast]
  );

  const processApplePayPayloadRef = useRef(processApplePayPayload);
  processApplePayPayloadRef.current = processApplePayPayload;
  useEffect(() => {
    processApplePayPayloadRef.current = processApplePayPayload;
  }, [processApplePayPayload]);

  // Deep Link listener for halalaqirsh://sms and halalaqirsh://applepay
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleDeepLink = (url?: string | null) => {
      if (!url) return;
      if (isSmartSmsDeepLink(url)) {
        if (isLockedRef.current) {
          pendingSmartSmsOpenRef.current = true;
        } else {
          setIsSmartSmsOpen(true);
        }
      } else if (isApplePayDeepLink(url)) {
        const payload = parseApplePayDeepLink(url);
        if (payload) {
          if (isLockedRef.current || !hasHydratedRef.current) {
            pendingApplePayPayloadRef.current = payload;
          } else {
            processApplePayPayloadRef.current(payload);
          }
        }
      }
    };

    // 1. Check launch URL upon cold start (only once)
    if (!hasHandledLaunchUrlRef.current) {
      hasHandledLaunchUrlRef.current = true;
      CapApp.getLaunchUrl()
        .then((launchUrl) => {
          if (launchUrl?.url) {
            handleDeepLink(launchUrl.url);
          }
        })
        .catch(() => {});
    }

    // 2. Listen for URL opens while app is running / foregrounded
    let listenerHandle: PluginListenerHandle | null = null;
    let isMounted = true;

    const registerListener = async () => {
      try {
        const handle = await CapApp.addListener('appUrlOpen', (event) => {
          handleDeepLink(event.url);
        });
        if (!isMounted) {
          await handle.remove();
        } else {
          listenerHandle = handle;
        }
      } catch {
        // Fallback for non-supported environments
      }
    };

    registerListener();

    return () => {
      isMounted = false;
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [hasHydratedRef, isLockedRef]);

  // Drain pending review queue or pending deep links when unlocked
  useEffect(() => {
    if (!isLocked) {
      if (pendingSmartSmsOpenRef.current) {
        pendingSmartSmsOpenRef.current = false;
        setIsSmartSmsOpen(true);
      }
      if (pendingApplePayPayloadRef.current && hasHydratedRef.current) {
        const payload = pendingApplePayPayloadRef.current;
        pendingApplePayPayloadRef.current = null;
        processApplePayPayloadRef.current(payload);
      }
      if (pendingSmsReviewQueueRef.current.length > 0 && !isSmartSmsOpen) {
        advanceSmsReviewQueue();
      }
    }
  }, [isLocked, isSmartSmsOpen, advanceSmsReviewQueue, hasHydratedRef]);

  // Bank SMS Queue processing
  const processedBankSmsIdsRef = useRef<Set<string>>(new Set());
  const isImportingBankSmsRef = useRef<boolean>(false);

  const importBankSms = useCallback(async () => {
    if (!hasHydratedRef.current || isImportingBankSmsRef.current) return;
    if (!Capacitor.isNativePlatform()) return;

    isImportingBankSmsRef.current = true;
    try {
      const pending = await readPendingSms();
      if (!pending || pending.length === 0) return;

      const toProcess = pending.filter(
        (item) => !processedBankSmsIdsRef.current.has(item.id)
      );

      if (toProcess.length === 0) {
        await ackPendingSms(pending.map((p) => p.id));
        return;
      }

      const currentSettings = settingsRef.current;
      const currentCategories = categoriesRef.current;
      const captureMode = currentSettings.autoCaptureMode || 'apple_pay';

      // If mode is 'apple_pay', discard bank SMS immediately without processing
      if (captureMode === 'apple_pay') {
        for (const item of toProcess) {
          processedBankSmsIdsRef.current.add(item.id);
        }
        await ackPendingSms(pending.map((p) => p.id));
        return;
      }

      for (const item of toProcess) {
        processedBankSmsIdsRef.current.add(item.id);
      }

      const learnedRules = getLearnedRules();
      const { toAdd, toReview } = processPendingSms(
        toProcess,
        currentCategories,
        learnedRules
      );

      let addedCount = 0;
      let mergedCount = 0;
      const newExpensesToAdd: Expense[] = [];
      let currentExpenses = [...expensesRef.current];

      for (const item of toAdd) {
        const match = findCrossSourceMatch(
          {
            amount: item.amount,
            date: item.date,
            at: item.candidateAt,
            source: 'sms',
          },
          currentExpenses,
          { requireWindow: true }
        );

        if (match) {
          const merged = applyCrossMatch(match, {
            amount: item.amount,
            date: item.date,
            at: item.candidateAt,
            source: 'sms',
            title: item.title,
          });
          currentExpenses = currentExpenses.map((e) => (e.id === match.id ? merged : e));
          mergedCount++;
        } else {
          const newExp: Expense = {
            id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            title: item.title,
            amount: cleanMoneyAmount(item.amount),
            categoryId: item.categoryId,
            date: item.date,
            paymentMethod: item.paymentMethod,
            payer: item.payer,
            source: 'sms',
            isAutoLogged: true,
            crossMatched: false,
            createdAt: item.candidateAt || Date.now(),
          };
          newExpensesToAdd.push(newExp);
          currentExpenses = [newExp, ...currentExpenses];
          addedCount++;
        }
      }

      if (addedCount > 0 || mergedCount > 0) {
        setData((prev) => ({
          ...prev,
          expenses: currentExpenses,
        }));
        nativeHaptics.success(currentSettings.soundEnabled);
      }

      // Handle items that need review (unknown merchant or category not identified)
      if (toReview.length > 0) {
        pendingSmsReviewQueueRef.current.push(...toReview);
        if (!isLockedRef.current && !isSmartSmsOpen) {
          advanceSmsReviewQueue();
        }
      }

      // Acknowledge all processed IDs in this batch
      await ackPendingSms(pending.map((p) => p.id));

      const isEnLang = currentSettings.language === 'en';
      if (addedCount > 0 && mergedCount > 0) {
        showToast(
          isEnLang
            ? `${addedCount} bank transaction(s) logged, ${mergedCount} duplicate(s) merged with Apple Pay`
            : `تم تسجيل ${addedCount} عملية بنكية تلقائياً ودُمجت ${mergedCount} عملية مكررة مع Apple Pay`,
          'success'
        );
      } else if (addedCount > 0) {
        showToast(
          isEnLang
            ? `${addedCount} bank transaction(s) logged automatically`
            : `تم تسجيل ${addedCount} عملية بنكية تلقائياً`,
          'success'
        );
      } else if (mergedCount > 0) {
        showToast(
          isEnLang
            ? `${mergedCount} transaction(s) merged with Apple Pay to prevent duplicates`
            : `تم دمج ${mergedCount} عملية من رسائل البنك مع عمليات Apple Pay المسجلة مسبقاً لمنع التكرار`,
          'success'
        );
      }
    } catch {
      // Fail safely
    } finally {
      isImportingBankSmsRef.current = false;
    }
  }, [
    advanceSmsReviewQueue,
    hasHydratedRef,
    isLockedRef,
    isSmartSmsOpen,
    setData,
    showToast,
  ]);

  const importBankSmsRef = useRef(importBankSms);
  importBankSmsRef.current = importBankSms;
  useEffect(() => {
    importBankSmsRef.current = importBankSms;
  }, [importBankSms]);

  return {
    isSmartSmsOpen,
    setIsSmartSmsOpen,
    currentReviewSmsText,
    handleCloseSmartSms,
    handleCrossMatchExisting,
    isApplePaySetupOpen,
    setIsApplePaySetupOpen,
    applePayPendingReview,
    setApplePayPendingReview,
    processApplePayPayload,
    processApplePayPayloadRef,
    importBankSms,
    importBankSmsRef,
    pendingApplePayPayloadRef,
    pendingSmartSmsOpenRef,
    pendingSmsReviewQueueRef,
  };
}
