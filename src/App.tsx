/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Lock, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AppData,
  Category,
  Expense,
  RecurringBill,
  GroceryItem,
  BudgetSettings,
  DetectedSubscription,
  JamiyyaGroup,
} from './types';
import {
  loadAppData,
  loadAppDataFromPreferences,
  saveAppData,
} from './utils/storage';
import { nativeHaptics } from './utils/nativeHaptics';
import { NativeNotificationService } from './utils/nativeNotifications';
import { SecurityService } from './utils/security';
import { fades, useMotionConfig } from './utils/motion';
import { translations } from './utils/i18n';
import { detectSubscriptionsFromExpenses } from './utils/subscriptionDetector';
import {
  createJamiyyaGroup,
  CreateJamiyyaInput,
} from './utils/jamiyyaEngine';
import { ICloudSyncService } from './utils/icloudSync';

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { TabBar, TabId } from './components/TabBar';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import { SmartSmsSheet } from './components/SmartSmsSheet';
import { getLocalToday } from './utils/smsParser';
import { ApplePaySetupModal } from './components/ApplePaySetupModal';
import { ApplePayReviewModal } from './components/ApplePayReviewModal';
import { syncQuickCategories } from './utils/quickExpenseQueue';
import { IOSNotificationBanner } from './components/IOSNotificationBanner';
import { PasscodeLockModal } from './components/PasscodeLockModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';
import { LaunchSplash } from './components/LaunchSplash';
import { HalalaQirshLogo } from './components/HalalaQirshLogo';
import { CoinFlightProvider, useCoinFlight } from './context/CoinFlightContext';

import { DashboardTab } from './components/tabs/DashboardTab';
import { ExpensesTab } from './components/tabs/ExpensesTab';
import { BudgetsTab } from './components/tabs/BudgetsTab';
import { BillsAndGroceriesTab } from './components/tabs/BillsAndGroceriesTab';
import {
  usePasscode,
  useNotificationsSync,
  useQuickQueue,
  useAutoCapture,
  ConfirmDialogState,
} from './hooks';

// Lazy-load heavy modals & settings to reduce initial bundle chunk size
const AnalyticsSettingsTab = React.lazy(() =>
  import('./components/tabs/AnalyticsSettingsTab').then((m) => ({ default: m.AnalyticsSettingsTab }))
);
const OnboardingModal = React.lazy(() =>
  import('./components/OnboardingModal').then((m) => ({ default: m.OnboardingModal }))
);
const ConfettiBurst = React.lazy(() =>
  import('./components/ConfettiBurst').then((m) => ({ default: m.ConfettiBurst }))
);
const CategoryManagerModal = React.lazy(() =>
  import('./components/CategoryManagerModal').then((m) => ({ default: m.CategoryManagerModal }))
);
const PrivacyPolicyModal = React.lazy(() =>
  import('./components/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);

const TAB_ORDER: TabId[] = [
  'dashboard',
  'expenses',
  'budgets',
  'bills_groceries',
  'analytics_settings',
];

function AppContent() {
  const { flyCoin, setHighlightedExpenseId } = useCoinFlight();
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [prevTab, setPrevTab] = useState<TabId>('dashboard');
  const [billsInitialSubTab, setBillsInitialSubTab] = useState<'bills' | 'subscriptions' | 'jamiyya' | 'groceries'>('bills');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState<boolean>(false);

  // App-wide Alert & Toast Dialogs
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  }, []);

  const handleUpdateSettings = useCallback((newSettings: Partial<BudgetSettings>) => {
    if (newSettings.autoCaptureMode && Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'autoCaptureMode', value: newSettings.autoCaptureMode }).catch(() => {});
    }
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  }, []);

  // Becomes true once data was loaded from Capacitor Preferences. Saving is blocked until then.
  const hasHydratedRef = useRef<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const dataRef = useRef<AppData>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 1. Passcode & Security Hook
  const {
    isLocked,
    setIsLocked,
    isLockedRef,
    passcodeModalMode,
    setPasscodeModalMode,
    verifyConfig,
    requestSecurityVerification,
    isAppInactive,
    isSplashActive,
    setIsSplashActive,
    handlePasscodeSuccess,
    handleDisablePasscode,
  } = usePasscode({
    settings: data.settings,
    onUpdateSettings: handleUpdateSettings,
    showToast,
    setConfirmDialog,
    onAppForeground: () => {
      runBillNotificationCheck();
      importQuickExpensesRef.current();
      importBankSmsRef.current();
    },
  });

  // 2. Notifications & Bill Reminders Hook
  const {
    notificationPermission,
    currentNotification,
    setCurrentNotification,
    runBillNotificationCheck,
    handleRequestNotificationPermission,
    handleSendTestNotification,
  } = useNotificationsSync({
    bills: data.bills,
    settings: data.settings,
    subscriptions: data.subscriptions || [],
    jamiyyas: data.jamiyyas || [],
    showToast,
  });

  // 3. Quick Queue (iOS AppIntent Shortcuts) Hook
  const {
    importQuickExpensesRef,
  } = useQuickQueue({
    categories: data.categories,
    expenses: data.expenses,
    settings: data.settings,
    setData,
    showToast,
    hasHydratedRef,
  });

  // 4. Auto Capture (Bank SMS, Apple Pay deep links & deduplication) Hook
  const {
    isSmartSmsOpen,
    setIsSmartSmsOpen,
    currentReviewSmsText,
    handleCloseSmartSms,
    handleCrossMatchExisting,
    isApplePaySetupOpen,
    setIsApplePaySetupOpen,
    applePayPendingReview,
    setApplePayPendingReview,
    processApplePayPayloadRef,
    importBankSmsRef,
    pendingApplePayPayloadRef,
    pendingSmartSmsOpenRef,
  } = useAutoCapture({
    categories: data.categories,
    expenses: data.expenses,
    settings: data.settings,
    setData,
    showToast,
    isLocked,
    isLockedRef,
    hasHydratedRef,
  });

  // Month-end celebration state
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string>('');

  const motionConfig = useMotionConfig(data.settings.animations);
  const isReduced = motionConfig.isReduced;
  const isEn = data.settings.language === 'en';
  const isRTL = data.settings.language !== 'en';
  const t = translations[data.settings.language || 'ar'];

  // Hydrate from Capacitor Preferences with Keychain migration
  useEffect(() => {
    loadAppDataFromPreferences().then(async (prefData) => {
      // Check for automatic iCloud restore if local is empty and iCloud has records
      let effectiveData = prefData;
      try {
        const autoRestoreCheck = await ICloudSyncService.checkForAutoRestore(prefData);
        if (autoRestoreCheck.shouldRestore && autoRestoreCheck.backupData) {
          effectiveData = autoRestoreCheck.backupData;
          saveAppData(effectiveData);
          showToast(
            effectiveData.settings.language === 'en'
              ? 'Data automatically restored from your Apple iCloud backup'
              : 'تمت استعادة بياناتك تلقائياً من نسختك الاحتياطية في iCloud',
            'success'
          );
        }
      } catch (err) {
        console.warn('Auto iCloud restore check error:', err);
      }

      setData(effectiveData);
      hasHydratedRef.current = true;
      setIsHydrated(true);
      await SecurityService.migrateIfNeeded();
      const hasPass = await SecurityService.hasPasscode();
      if (effectiveData.settings.isPasscodeEnabled && hasPass) {
        setIsLocked(true);
      } else if (!effectiveData.settings.isPasscodeEnabled) {
        setIsLocked(false);
      }

      // Check for Month-End Celebration
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (effectiveData.settings.lastCelebratedMonth !== prevMonthStr) {
        const prevExpenses = effectiveData.expenses.filter((e) => e.type !== 'income' && e.date.startsWith(prevMonthStr));
        const prevTotalSpent = prevExpenses.reduce((s, e) => s + e.amount, 0);
        const budgetLimit =
          effectiveData.settings.budgetMode === 'custom_total'
            ? effectiveData.settings.totalMonthlyBudget
            : effectiveData.categories.reduce((s, c) => s + c.monthlyLimit, 0);

        if (prevExpenses.length > 0 && prevTotalSpent <= budgetLimit) {
          setShowCelebration(true);
          setCelebrationMessage(
            effectiveData.settings.language === 'en'
              ? `Congratulations! You stayed under budget last month and saved successfully.`
              : `تهانينا! لقد أنهيت الشهر الماضي بنجاح تحت حد الميزانية المحددة.`
          );
          setData((curr) => ({
            ...curr,
            settings: { ...curr.settings, lastCelebratedMonth: prevMonthStr },
          }));
        }
      }

      // Sync categories to preferences for AppIntent
      syncQuickCategories(effectiveData.categories, effectiveData.settings.language || 'ar');
      if (Capacitor.isNativePlatform()) {
        Preferences.set({
          key: 'autoCaptureMode',
          value: effectiveData.settings.autoCaptureMode || 'apple_pay',
        }).catch(() => {});
      }

      if (pendingApplePayPayloadRef.current && (!effectiveData.settings.isPasscodeEnabled || !hasPass)) {
        const payload = pendingApplePayPayloadRef.current;
        pendingApplePayPayloadRef.current = null;
        processApplePayPayloadRef.current(payload);
      }
      if (pendingSmartSmsOpenRef.current && (!effectiveData.settings.isPasscodeEnabled || !hasPass)) {
        pendingSmartSmsOpenRef.current = false;
        setIsSmartSmsOpen(true);
      }
    });
  }, [setIsLocked, setIsSmartSmsOpen, pendingApplePayPayloadRef, pendingSmartSmsOpenRef, processApplePayPayloadRef, showToast]);

  // Initial import effect after hydration
  useEffect(() => {
    if (isHydrated) {
      importQuickExpensesRef.current();
      importBankSmsRef.current();
    }
  }, [isHydrated, importQuickExpensesRef, importBankSmsRef]);

  // Periodic check every 3s while app is active
  useEffect(() => {
    if (!isHydrated || isAppInactive) return;
    const interval = setInterval(() => {
      importQuickExpensesRef.current();
      importBankSmsRef.current();
    }, 3000);
    return () => clearInterval(interval);
  }, [isHydrated, isAppInactive, importQuickExpensesRef, importBankSmsRef]);

  // Sync document RTL/LTR and language attribute
  useLayoutEffect(() => {
    const lang = data.settings.language || 'ar';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [data.settings.language]);

  // Sync to Capacitor Preferences & localStorage whenever data changes
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    saveAppData(data);
    if (data.settings.icloudSyncEnabled !== false) {
      ICloudSyncService.scheduleAutoBackup(data);
    }
  }, [data]);

  // iCloud sync listeners (flushes debounced backup on app background, listens for remote iCloud updates)
  useEffect(() => {
    const cleanup = ICloudSyncService.setupSyncListeners(
      () => dataRef.current,
      (remoteData) => {
        setData(remoteData);
        saveAppData(remoteData);
        showToast(
          remoteData.settings.language === 'en'
            ? 'Updated from iCloud'
            : 'تم التحديث من iCloud',
          'info'
        );
      }
    );
    return () => {
      cleanup();
    };
  }, [showToast]);

  // Live dark mode handling
  useEffect(() => {
    const applyTheme = (dark: boolean) => {
      setIsDarkMode(dark);
      if (typeof document !== 'undefined') {
        if (dark) {
          document.documentElement.classList.add('dark');
          document.body.style.backgroundColor = '#000000';
        } else {
          document.documentElement.classList.remove('dark');
          document.body.style.backgroundColor = '#F4FAF7';
        }
      }
      try {
        StatusBar.setStyle({
          style: dark ? Style.Dark : Style.Light,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    if (data.settings.themeMode === 'system') {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(match.matches);

      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
      match.addEventListener('change', listener);
      return () => match.removeEventListener('change', listener);
    } else {
      applyTheme(data.settings.themeMode === 'dark');
    }
  }, [data.settings.themeMode]);

  // Sync quick categories whenever categories or language change
  useEffect(() => {
    if (!isHydrated) return;
    syncQuickCategories(data.categories, data.settings.language || 'ar');
  }, [isHydrated, data.categories, data.settings.language]);

  // Auto-detect recurring subscriptions whenever expenses change
  useEffect(() => {
    if (!isHydrated) return;
    const currentSubs = data.subscriptions || [];
    const dismissed = data.dismissedSubscriptionMerchants || [];
    const updatedSubs = detectSubscriptionsFromExpenses(data.expenses, currentSubs, dismissed);

    // Only update if signature has changed
    const signature = (list: DetectedSubscription[]) =>
      list
        .map(
          (s) =>
            `${s.id}:${s.status}:${s.detectedFrequency || s.frequency}:${s.typicalAmount}:${s.nextExpectedRenewalDate}:${
              s.priceIncrease?.newAmount || 0
            }`
        )
        .join('|');

    if (signature(currentSubs) !== signature(updatedSubs)) {
      setData((prev) => ({
        ...prev,
        subscriptions: updatedSubs,
      }));
    }
  }, [isHydrated, data.expenses, data.dismissedSubscriptionMerchants, data.subscriptions]);

  const handleSaveExpense = (
    expenseData: Omit<Expense, 'id' | 'createdAt'>,
    sourceRect?: DOMRect
  ) => {
    if (editingExpense && editingExpense.id) {
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === editingExpense.id
            ? { ...expenseData, id: e.id, createdAt: e.createdAt }
            : e
        ),
      }));
      setEditingExpense(null);
      showToast(data.settings.language === 'en' ? 'Expense updated' : 'تم تحديث المصروف');
    } else {
      if (editingExpense) {
        setEditingExpense(null);
      }
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };
      setData((prev) => ({
        ...prev,
        expenses: [newExp, ...prev.expenses],
      }));

      // Signature fly-to-target coin animation
      const targetName = activeTab === 'dashboard' ? 'dashboard-remaining' : 'expenses-first-row';
      if (sourceRect) {
        flyCoin(
          sourceRect,
          targetName,
          () => {
            setHighlightedExpenseId(newExp.id);
            setTimeout(() => setHighlightedExpenseId(null), 1200);
          },
          isReduced,
          data.settings.soundEnabled
        );
      } else {
        nativeHaptics.success(data.settings.soundEnabled);
        setHighlightedExpenseId(newExp.id);
        setTimeout(() => setHighlightedExpenseId(null), 1200);
      }

      showToast(data.settings.language === 'en' ? 'Expense recorded' : 'تم تسجيل المصروف بنجاح');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Expense' : 'حذف المصروف',
      message: data.settings.language === 'en' ? 'Are you sure you want to delete this expense?' : 'هل أنت متأكد من حذف هذا المصروف؟',
      isDestructive: true,
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          expenses: prev.expenses.filter((e) => e.id !== expenseId),
        }));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Expense deleted' : 'تم حذف المصروف');
      },
    });
  };

  const handleSaveCategory = (catToSave: Category) => {
    nativeHaptics.success(data.settings.soundEnabled);
    setData((prev) => {
      const exists = prev.categories.some((c) => c.id === catToSave.id);
      if (exists) {
        return {
          ...prev,
          categories: prev.categories.map((c) => (c.id === catToSave.id ? catToSave : c)),
        };
      } else {
        return {
          ...prev,
          categories: [...prev.categories, catToSave],
        };
      }
    });
    showToast(data.settings.language === 'en' ? 'Category saved' : 'تم حفظ التصنيف');
  };

  // Cascading Deletion: Migrates expenses, recurring bills, and subscriptions to fallback category
  const handleDeleteCategory = (categoryId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Category' : 'حذف التصنيف',
      message:
        data.settings.language === 'en'
          ? 'Are you sure you want to delete this category? Associated expenses, bills, and subscriptions will move to General.'
          : 'هل أنت متأكد من حذف هذا التصنيف؟ سيتم نقل مصاريفه وفواتيره واشتراكاته للتصنيف العام.',
      isDestructive: true,
      onConfirm: () => {
        setData((prev) => {
          const remainingCategories = prev.categories.filter((c) => c.id !== categoryId);
          const fallbackCatId = remainingCategories[0]?.id || 'food';
          return {
            ...prev,
            categories: remainingCategories,
            expenses: prev.expenses.map((e) =>
              e.categoryId === categoryId ? { ...e, categoryId: fallbackCatId } : e
            ),
            bills: (prev.bills || []).map((b) =>
              b.categoryId === categoryId ? { ...b, categoryId: fallbackCatId } : b
            ),
            subscriptions: (prev.subscriptions || []).map((s) =>
              s.categoryId === categoryId ? { ...s, categoryId: fallbackCatId } : s
            ),
          };
        });
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Category deleted' : 'تم حذف التصنيف');
      },
    });
  };

  const handleUpdateCategoryLimit = (categoryId: string, newLimit: number) => {
    nativeHaptics.tap(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId ? { ...c, monthlyLimit: newLimit } : c
      ),
    }));
  };

  const handleBatchUpdateCategoryLimits = (limits: Record<string, number>) => {
    nativeHaptics.success(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        limits[c.id] !== undefined ? { ...c, monthlyLimit: limits[c.id] } : c
      ),
    }));
    showToast(data.settings.language === 'en' ? 'Budget updated and distributed' : 'تم تحديث الميزانية وتوزيعها بنجاح');
  };

  const handleToggleBill = (billId: string) => {
    nativeHaptics.success(data.settings.soundEnabled);
    setData((prev) => {
      const updated = prev.bills.map((b) => (b.id === billId ? { ...b, isPaid: !b.isPaid } : b));
      const target = updated.find((b) => b.id === billId);
      if (target?.isPaid) {
        NativeNotificationService.cancelBillNotification(billId);
      }
      return { ...prev, bills: updated };
    });
  };

  const handleToggleBillReminder = (billId: string) => {
    nativeHaptics.tap(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId ? { ...b, reminderEnabled: b.reminderEnabled === false } : b
      ),
    }));
  };

  const handleAddBill = (billData: Omit<RecurringBill, 'id'>) => {
    nativeHaptics.success(data.settings.soundEnabled);
    const newBill: RecurringBill = {
      ...billData,
      id: `bill-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      bills: [...prev.bills, newBill],
    }));
    showToast(data.settings.language === 'en' ? 'Bill added' : 'تمت إضافة الفاتورة');
  };

  const handleDeleteBill = (billId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Bill' : 'حذف الفاتورة',
      message: data.settings.language === 'en' ? 'Delete this recurring bill reminder?' : 'هل تريد حذف هذه الفاتورة الدورية؟',
      isDestructive: true,
      onConfirm: () => {
        NativeNotificationService.cancelBillNotification(billId);
        setData((prev) => ({
          ...prev,
          bills: prev.bills.filter((b) => b.id !== billId),
        }));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Bill deleted' : 'تم حذف الفاتورة');
      },
    });
  };

  const handleToggleGrocery = (itemId: string) => {
    nativeHaptics.tap(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      groceries: prev.groceries.map((g) => (g.id === itemId ? { ...g, isBought: !g.isBought } : g)),
    }));
  };

  const handleAddGrocery = (itemData: Omit<GroceryItem, 'id'>) => {
    nativeHaptics.success(data.settings.soundEnabled);
    const newGroc: GroceryItem = {
      ...itemData,
      id: `groc-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      groceries: [newGroc, ...prev.groceries],
    }));
    showToast(data.settings.language === 'en' ? 'Item added to grocery list' : 'تمت إضافة السلعة للقائمة');
  };

  const handleDeleteGrocery = (itemId: string) => {
    nativeHaptics.tap(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      groceries: prev.groceries.filter((g) => g.id !== itemId),
    }));
  };

  const handleConvertBoughtToExpense = (items: GroceryItem[]) => {
    nativeHaptics.success(data.settings.soundEnabled);
    const totalAmount = items.reduce((sum, i) => sum + i.estimatedPrice * i.quantity, 0);
    const isEnLang = data.settings.language === 'en';
    const itemNames = items.map((i) => i.name).join(isEnLang ? ', ' : '، ');

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: isEnLang ? 'Household Grocery Purchase' : 'مشتريات ونواقص تموين البيت',
      amount: totalAmount > 0 ? totalAmount : 150,
      categoryId: data.categories[0]?.id || 'food',
      date: getLocalToday(),
      paymentMethod: 'card',
      payer: 'مشترك',
      notes: `${isEnLang ? 'Purchased items:' : 'أصناف مشتراة:'} ${itemNames}`,
      createdAt: Date.now(),
    };

    setData((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      groceries: prev.groceries.filter((g) => !g.isBought),
    }));

    handleTabChange('expenses');
    showToast(data.settings.language === 'en' ? 'Groceries recorded as expense' : 'تم ترحيل المشتريات كمصروف');
  };

  // Subscription Handlers
  const handleConfirmSubscription = (subId: string) => {
    nativeHaptics.success(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      subscriptions: (prev.subscriptions || []).map((s) =>
        s.id === subId ? { ...s, status: 'confirmed' as const } : s
      ),
    }));
    showToast(data.settings.language === 'en' ? 'Subscription confirmed' : 'تم تأكيد الاشتراك وبدء متابعته');
  };

  const handleDismissSubscription = (subId: string) => {
    nativeHaptics.impactLight(data.settings.soundEnabled);
    const subToDismiss = (data.subscriptions || []).find((s) => s.id === subId);
    const merchantNorm = subToDismiss ? subToDismiss.normalizedMerchant : '';

    setData((prev) => {
      const existingDismissed = prev.dismissedSubscriptionMerchants || [];
      const updatedDismissed =
        merchantNorm && !existingDismissed.includes(merchantNorm)
          ? [...existingDismissed, merchantNorm]
          : existingDismissed;

      return {
        ...prev,
        dismissedSubscriptionMerchants: updatedDismissed,
        subscriptions: (prev.subscriptions || []).filter((s) => s.id !== subId),
      };
    });
    showToast(
      data.settings.language === 'en'
        ? 'Subscription dismissed'
        : 'تم تجاهل الاشتراك ولن يتم اقتراحه مجدداً'
    );
  };

  const handleSaveSubscription = (savedSub: DetectedSubscription) => {
    nativeHaptics.success(data.settings.soundEnabled);
    setData((prev) => {
      const subs = prev.subscriptions || [];
      const exists = subs.some((s) => s.id === savedSub.id);
      const updatedList = exists
        ? subs.map((s) => (s.id === savedSub.id ? { ...savedSub, isUserEdited: true } : s))
        : [{ ...savedSub, isUserEdited: true }, ...subs];

      return {
        ...prev,
        subscriptions: updatedList,
      };
    });
    showToast(data.settings.language === 'en' ? 'Subscription saved' : 'تم حفظ بيانات الاشتراك');
  };

  const handleDeleteSubscription = (subId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Subscription' : 'حذف الاشتراك',
      message:
        data.settings.language === 'en'
          ? 'Are you sure you want to remove this subscription from tracking?'
          : 'هل أنت متأكد من حذف هذا الاشتراك من المتابعة؟',
      isDestructive: true,
      onConfirm: () => {
        nativeHaptics.impactLight(data.settings.soundEnabled);
        setData((prev) => ({
          ...prev,
          subscriptions: (prev.subscriptions || []).filter((s) => s.id !== subId),
        }));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Subscription removed' : 'تم حذف الاشتراك');
      },
    });
  };

  // Jam'iyya Handlers
  const handleCreateJamiyya = (input: CreateJamiyyaInput) => {
    nativeHaptics.success(data.settings.soundEnabled);
    const newGroup = createJamiyyaGroup(input);
    setData((prev) => ({
      ...prev,
      jamiyyas: [newGroup, ...(prev.jamiyyas || [])],
    }));
    showToast(
      data.settings.language === 'en'
        ? 'Jam\'iyya created successfully!'
        : 'تم إنشاء الجمعية وبدء جدول الأدوار بنجاح!'
    );
  };

  const handleUpdateJamiyya = (updatedGroup: JamiyyaGroup) => {
    nativeHaptics.tap(data.settings.soundEnabled);
    setData((prev) => ({
      ...prev,
      jamiyyas: (prev.jamiyyas || []).map((j) => (j.id === updatedGroup.id ? updatedGroup : j)),
    }));
  };

  const handleDeleteJamiyya = (groupId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Jam\'iyya' : 'حذف الجمعية',
      message:
        data.settings.language === 'en'
          ? 'Are you sure you want to delete this Jam\'iyya and all its cycle payment records?'
          : 'هل أنت متأكد من حذف هذه الجمعية وسجل الدفعات الخاص بها؟',
      isDestructive: true,
      onConfirm: () => {
        nativeHaptics.impactLight(data.settings.soundEnabled);
        setData((prev) => ({
          ...prev,
          jamiyyas: (prev.jamiyyas || []).filter((j) => j.id !== groupId),
        }));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Jam\'iyya deleted' : 'تم حذف الجمعية بنجاح');
      },
    });
  };

  const handleLogJamiyyaExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>): string => {
    nativeHaptics.success(data.settings.soundEnabled);
    const newId = `exp-jamiyya-${Date.now()}`;
    const newExp: Expense = {
      ...expenseData,
      id: newId,
      source: 'jamiyya',
      type: 'expense',
      createdAt: Date.now(),
    };
    setData((prev) => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
    }));
    showToast(
      data.settings.language === 'en'
        ? 'Jam\'iyya installment logged as expense'
        : 'تم تسجيل قسط الجمعية كمصروف في الميزانية'
    );
    return newId;
  };

  const handleLogJamiyyaIncome = (
    amount: number,
    title: string,
    date: string,
    notes?: string
  ): string => {
    nativeHaptics.success(data.settings.soundEnabled);
    const newId = `inc-jamiyya-${Date.now()}`;
    const newExp: Expense = {
      id: newId,
      title,
      amount,
      categoryId: 'income',
      date,
      paymentMethod: 'transfer',
      payer: 'مشترك',
      source: 'jamiyya',
      type: 'income',
      notes,
      createdAt: Date.now(),
    };
    setData((prev) => ({
      ...prev,
      expenses: [newExp, ...prev.expenses],
    }));
    showToast(
      data.settings.language === 'en'
        ? 'Jam\'iyya payout logged as income'
        : 'تم تسجيل استلام الجمعية كدخل إضافي بنجاح'
    );
    return newId;
  };

  const handleImportData = (imported: AppData) => {
    setData(imported);
    showToast(data.settings.language === 'en' ? 'Backup restored successfully' : 'تمت استعادة البيانات بنجاح');
  };

  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Erase All Data' : 'مسح كافة البيانات',
      message:
        data.settings.language === 'en'
          ? 'Warning: All expenses, bills, and grocery items will be permanently erased. Proceed?'
          : 'تحذير: سيتم مسح كافة المصاريف والفواتير وقوائم النواقص نهائياً من الجهاز. هل أنت متأكد؟',
      isDestructive: true,
      confirmText: data.settings.language === 'en' ? 'Erase All' : 'مسح الكل',
      onConfirm: () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        const executeErase = () => {
          setData((prev) => ({
            ...prev,
            expenses: [],
            bills: [],
            groceries: [],
            subscriptions: [],
            jamiyyas: [],
          }));
          showToast(data.settings.language === 'en' ? 'All data erased' : 'تم مسح كافة البيانات', 'info');
        };

        if (data.settings.isPasscodeEnabled) {
          requestSecurityVerification(
            data.settings.language === 'en' ? 'Authorize Erase All Data' : 'توثيق مسح كافة البيانات',
            data.settings.language === 'en'
              ? 'Verify your identity to permanently erase all data'
              : 'أثبت هويتك لتأكيد مسح كافة البيانات نهائياً',
            executeErase
          );
        } else {
          executeErase();
        }
      },
    });
  };

  // Tab navigation with direction-aware transitions
  const handleTabChange = (nextTab: TabId) => {
    setPrevTab(activeTab);
    setActiveTab(nextTab);
  };

  const prevIdx = TAB_ORDER.indexOf(prevTab);
  const nextIdx = TAB_ORDER.indexOf(activeTab);
  const isMovingForward = nextIdx >= prevIdx;
  const slideX = isRTL ? (isMovingForward ? -20 : 20) : (isMovingForward ? 20 : -20);

  const unpaidBillsCount = data.bills.filter((b) => !b.isPaid).length;

  return (
    <div className="min-h-screen h-[100dvh] w-full flex flex-col bg-[#F4FAF7] dark:bg-black text-[#0B2319] dark:text-white pt-safe pl-safe pr-safe overflow-hidden select-none relative">
      {/* Ambient Luminous Emerald Glow for Light Theme */}
      <div className="pointer-events-none absolute -top-24 inset-x-0 h-72 bg-gradient-to-b from-emerald-400/20 via-teal-200/10 to-transparent blur-3xl dark:hidden z-0" />

      {/* Short Branded Launch Splash */}
      {isSplashActive && (
        <LaunchSplash
          onFinish={() => setIsSplashActive(false)}
          isReduced={isReduced}
          isEnglish={isEn}
        />
      )}

      {/* Lightweight Month-End Celebration Confetti Burst */}
      <Suspense fallback={null}>
        <ConfettiBurst
          active={showCelebration}
          onComplete={() => setShowCelebration(false)}
          isReduced={isReduced}
        />
      </Suspense>

      {/* App Switcher Multitasking Privacy Cover */}
      {isAppInactive && (
        <div className="fixed inset-0 z-100 bg-[#F4FAF7] dark:bg-black flex flex-col items-center justify-center p-6 select-none">
          <div className="relative mb-3 flex items-center justify-center">
            <HalalaQirshLogo size="lg" isEnglish={isEn} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Lock size={12} />
            </div>
          </div>
          <p className="text-base font-black text-slate-800 dark:text-white">
            {t.appTitle}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t.securedOfflineTracker}
          </p>
        </div>
      )}

      {/* If locked, render ONLY the lock screen over a plain background */}
      {isLocked ? (
        <div className="flex-1 w-full flex items-center justify-center">
          <PasscodeLockModal
            isOpen={true}
            mode="unlock"
            onSuccess={() => setIsLocked(false)}
            isDark={isDarkMode}
            soundEnabled={data.settings.soundEnabled}
            isEnglish={isEn}
          />
        </div>
      ) : (
        <>
          {/* iOS Dropdown Notification Banner */}
          <IOSNotificationBanner
            notification={currentNotification}
            onDismiss={() => setCurrentNotification(null)}
            onAction={() => {
              setCurrentNotification(null);
              handleTabChange('bills_groceries');
            }}
            language={data.settings.language}
          />

          {/* Month-End Congratulatory Banner Card */}
          {showCelebration && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="mx-4 mt-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg flex items-center justify-between gap-3 z-40 relative"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-emerald-200 shrink-0" />
                <span className="text-xs font-bold leading-snug">{celebrationMessage}</span>
              </div>
              <button
                onClick={() => setShowCelebration(false)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}

          {/* App-wide Toast Notification */}
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />

          {/* App-wide Native Confirmation Modal */}
          <ConfirmModal
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            isDestructive={confirmDialog.isDestructive}
            onConfirm={confirmDialog.onConfirm}
            onCancel={() => setConfirmDialog((c) => ({ ...c, isOpen: false }))}
            isEnglish={isEn}
          />

          {/* Active Tab View with Direction-Aware Page Transitions */}
          <main key={`main-${data.settings.language}`} className="flex-1 w-full flex flex-col overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={isReduced ? { opacity: 0 } : { opacity: 0, x: slideX }}
                animate={{ opacity: 1, x: 0 }}
                exit={isReduced ? { opacity: 0 } : { opacity: 0, x: -slideX }}
                transition={fades.fast}
                className="flex-1 w-full flex flex-col overflow-hidden"
              >
                {activeTab === 'dashboard' && (
                  <DashboardTab
                    categories={data.categories}
                    expenses={data.expenses}
                    bills={data.bills}
                    settings={data.settings}
                    jamiyyas={data.jamiyyas || []}
                    onOpenAddExpense={() => {
                      setEditingExpense(null);
                      setIsAddExpenseOpen(true);
                    }}
                    onNavigateToTab={handleTabChange}
                    onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                    onOpenSmartSms={() => setIsSmartSmsOpen(true)}
                    onUpdateSettings={handleUpdateSettings}
                    onOpenJamiyya={(_group) => {
                      setBillsInitialSubTab('jamiyya');
                      handleTabChange('bills_groceries');
                    }}
                  />
                )}

                {activeTab === 'expenses' && (
                  <ExpensesTab
                    categories={data.categories}
                    expenses={data.expenses}
                    settings={data.settings}
                    onEditExpense={handleEditExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onOpenAddExpense={() => {
                      setEditingExpense(null);
                      setIsAddExpenseOpen(true);
                    }}
                  />
                )}

                {activeTab === 'budgets' && (
                  <BudgetsTab
                    categories={data.categories}
                    expenses={data.expenses}
                    settings={data.settings}
                    onUpdateSettings={handleUpdateSettings}
                    onUpdateCategoryLimit={handleUpdateCategoryLimit}
                    onBatchUpdateCategoryLimits={handleBatchUpdateCategoryLimits}
                    onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                  />
                )}

                {activeTab === 'bills_groceries' && (
                  <BillsAndGroceriesTab
                    bills={data.bills}
                    groceries={data.groceries}
                    categories={data.categories}
                    settings={data.settings}
                    subscriptions={data.subscriptions}
                    jamiyyas={data.jamiyyas || []}
                    onToggleBill={handleToggleBill}
                    onAddBill={handleAddBill}
                    onDeleteBill={handleDeleteBill}
                    onToggleBillReminder={handleToggleBillReminder}
                    onToggleGrocery={handleToggleGrocery}
                    onAddGrocery={handleAddGrocery}
                    onDeleteGrocery={handleDeleteGrocery}
                    onConvertBoughtToExpense={handleConvertBoughtToExpense}
                    onRequestNotificationPermission={handleRequestNotificationPermission}
                    onSendTestNotification={handleSendTestNotification}
                    notificationPermission={notificationPermission}
                    onUpdateSettings={handleUpdateSettings}
                    onConfirmSubscription={handleConfirmSubscription}
                    onDismissSubscription={handleDismissSubscription}
                    onSaveSubscription={handleSaveSubscription}
                    onDeleteSubscription={handleDeleteSubscription}
                    onCreateJamiyya={handleCreateJamiyya}
                    onUpdateJamiyya={handleUpdateJamiyya}
                    onDeleteJamiyya={handleDeleteJamiyya}
                    onLogJamiyyaExpense={handleLogJamiyyaExpense}
                    onLogJamiyyaIncome={handleLogJamiyyaIncome}
                    initialSubTab={billsInitialSubTab}
                  />
                )}

                {activeTab === 'analytics_settings' && (
                  <Suspense fallback={<div className="flex-1 w-full bg-transparent" />}>
                    <AnalyticsSettingsTab
                      categories={data.categories}
                      expenses={data.expenses}
                      settings={data.settings}
                      fullData={data}
                      onUpdateSettings={handleUpdateSettings}
                      onImportData={handleImportData}
                      onClearAllData={handleClearAllData}
                      onRequestNotificationPermission={handleRequestNotificationPermission}
                      onSendTestNotification={handleSendTestNotification}
                      notificationPermission={notificationPermission}
                      onOpenPasscodeModal={(mode) => setPasscodeModalMode(mode)}
                      onDisablePasscode={handleDisablePasscode}
                      onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
                      onShowToast={showToast}
                      onOpenApplePaySetup={() => setIsApplePaySetupOpen(true)}
                    />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* iOS Native TabBar with Shared Layout Pill */}
          <TabBar
            key={`tabbar-${data.settings.language}`}
            activeTab={activeTab}
            onChangeTab={handleTabChange}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            isAddExpenseOpen={isAddExpenseOpen}
            unpaidBillsCount={unpaidBillsCount}
            soundEnabled={data.settings.soundEnabled}
            language={data.settings.language}
          />

          {/* Bottom Sheet for Adding/Editing Expense */}
          <AddExpenseSheet
            isOpen={isAddExpenseOpen}
            onClose={() => {
              setIsAddExpenseOpen(false);
              setEditingExpense(null);
            }}
            categories={data.categories}
            currency={data.settings.currency}
            onSaveExpense={handleSaveExpense}
            initialExpense={editingExpense}
            soundEnabled={data.settings.soundEnabled}
            language={data.settings.language}
          />

          {/* Smart Bank SMS Parser Bottom Sheet */}
          <SmartSmsSheet
            isOpen={isSmartSmsOpen}
            onClose={handleCloseSmartSms}
            categories={data.categories}
            currency={data.settings.currency}
            initialText={currentReviewSmsText}
            existingExpenses={data.expenses}
            onCrossMatchExisting={handleCrossMatchExisting}
            onSaveExpense={(exp) => {
              handleSaveExpense(exp);
              showToast(
                data.settings.language === 'en'
                  ? 'Expense imported from bank SMS successfully!'
                  : 'تم استيراد وحفظ العملية البنكية بنجاح!'
              );
              handleCloseSmartSms();
            }}
            soundEnabled={data.settings.soundEnabled}
            language={data.settings.language}
          />

          {/* Apple Pay Setup & Diagnostics Modal */}
          <ApplePaySetupModal
            isOpen={isApplePaySetupOpen}
            onClose={() => setIsApplePaySetupOpen(false)}
            onSimulateTest={() => {
              setIsApplePaySetupOpen(false);
              const isEnLang = data.settings.language === 'en';
              setApplePayPendingReview({
                amount: 42.50,
                merchant: isEnLang ? 'Starbucks Coffee' : 'ستاربكس كافيه',
                card: 'mada **4128',
                note: isEnLang ? 'Apple Pay Auto-Log Test' : 'تجربة تسجيل Apple Pay التلقائي',
              });
            }}
            onOpenManualEntry={() => {
              setEditingExpense({
                id: '',
                title: '',
                amount: 0,
                categoryId: data.categories[0]?.id || '',
                date: getLocalToday(),
                paymentMethod: 'digital',
                payer: 'الزوج',
                createdAt: Date.now(),
                source: 'apple_pay',
              });
              setIsAddExpenseOpen(true);
            }}
            soundEnabled={data.settings.soundEnabled}
            language={data.settings.language}
          />

          {/* Apple Pay Transaction Review / Confirmation Modal */}
          <ApplePayReviewModal
            isOpen={Boolean(applePayPendingReview)}
            onClose={() => setApplePayPendingReview(null)}
            transaction={applePayPendingReview}
            categories={data.categories}
            currency={data.settings.currency}
            onSaveExpense={(exp) => {
              handleSaveExpense(exp);
              showToast(
                data.settings.language === 'en'
                  ? 'Pay: Expense recorded successfully!'
                  : 'Pay: تم تسجيل العملية بنجاح!'
              );
            }}
            onEditInFullSheet={(prefill) => {
              setEditingExpense({
                id: '',
                title: prefill.merchant,
                amount: prefill.amount,
                categoryId: prefill.categoryId,
                date: getLocalToday(),
                paymentMethod: 'digital',
                payer: 'الزوج',
                notes: prefill.notes,
                source: 'apple_pay',
                isAutoLogged: true,
                createdAt: Date.now(),
              });
              setIsAddExpenseOpen(true);
            }}
            soundEnabled={data.settings.soundEnabled}
            language={data.settings.language}
          />

          {/* Lazy-Loaded Category Manager Modal */}
          <Suspense fallback={null}>
            {isCategoryManagerOpen && (
              <CategoryManagerModal
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                categories={data.categories}
                currency={data.settings.currency}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                soundEnabled={data.settings.soundEnabled}
                onShowToast={showToast}
                language={data.settings.language}
                hideAmounts={Boolean(data.settings.hideAmounts)}
              />
            )}
          </Suspense>

          {/* Passcode Set / Change / Verify Modal */}
          {passcodeModalMode && (
            <PasscodeLockModal
              isOpen={true}
              mode={passcodeModalMode}
              verifyTitle={verifyConfig?.title}
              verifySubtitle={verifyConfig?.subtitle}
              onSuccess={handlePasscodeSuccess}
              onCancel={() => setPasscodeModalMode(null)}
              isDark={isDarkMode}
              soundEnabled={data.settings.soundEnabled}
              isEnglish={isEn}
            />
          )}

          {/* Lazy-Loaded Privacy Policy Modal */}
          <Suspense fallback={null}>
            {isPrivacyPolicyOpen && (
              <PrivacyPolicyModal
                isOpen={isPrivacyPolicyOpen}
                onClose={() => setIsPrivacyPolicyOpen(false)}
                isEnglish={isEn}
                soundEnabled={data.settings.soundEnabled}
              />
            )}
          </Suspense>

          {/* Lazy-Loaded Onboarding Flow (first launch only) */}
          <Suspense fallback={null}>
            {data.settings.hasCompletedOnboarding === false && (
              <OnboardingModal
                isOpen={data.settings.hasCompletedOnboarding === false}
                onComplete={(updated) => handleUpdateSettings({ ...updated, hasCompletedOnboarding: true })}
                soundEnabled={data.settings.soundEnabled}
                currentLanguage={data.settings.language}
              />
            )}
          </Suspense>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CoinFlightProvider>
      <AppContent />
    </CoinFlightProvider>
  );
}