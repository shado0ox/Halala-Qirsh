/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  AppData,
  Category,
  Expense,
  RecurringBill,
  GroceryItem,
  BudgetSettings,
  InAppNotification,
} from './types';
import {
  loadAppData,
  loadAppDataFromPreferences,
  saveAppData,
  getDefaultAppData,
} from './utils/storage';
import { nativeHaptics } from './utils/nativeHaptics';
import {
  getNotificationPermission,
  NotificationPermissionState,
} from './utils/notifications';
import { NativeNotificationService } from './utils/nativeNotifications';
import { SecurityService } from './utils/security';

import { TabBar, TabId } from './components/TabBar';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { IOSNotificationBanner } from './components/IOSNotificationBanner';
import { PasscodeLockModal } from './components/PasscodeLockModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';

import { DashboardTab } from './components/tabs/DashboardTab';
import { ExpensesTab } from './components/tabs/ExpensesTab';
import { BudgetsTab } from './components/tabs/BudgetsTab';
import { BillsAndGroceriesTab } from './components/tabs/BillsAndGroceriesTab';
import { AnalyticsSettingsTab } from './components/tabs/AnalyticsSettingsTab';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Native Passcode Lock & Privacy Modal state
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [passcodeModalMode, setPasscodeModalMode] = useState<'set' | 'change' | null>(null);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState<boolean>(false);

  // App-wide Alert & Toast Dialogs
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState>({
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

  // Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermission()
  );
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);

  // Hydrate from Capacitor Preferences with plain-text passcode migration
  useEffect(() => {
    loadAppDataFromPreferences().then(async (prefData) => {
      setData(prefData);
      // Check if secure passcode exists
      const hasPass = await SecurityService.hasPasscode();
      if (prefData.settings.isPasscodeEnabled && hasPass) {
        setIsLocked(true);
      }
    });
  }, []);

  // Sync document RTL/LTR and language attribute
  useEffect(() => {
    const lang = data.settings.language || 'ar';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [data.settings.language]);

  // Sync to Capacitor Preferences & localStorage whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Live dark mode handling (system listener or user preference)
  useEffect(() => {
    const applyTheme = (dark: boolean) => {
      setIsDarkMode(dark);
      if (typeof document !== 'undefined') {
        if (dark) {
          document.documentElement.classList.add('dark');
          document.body.style.backgroundColor = '#000000';
        } else {
          document.documentElement.classList.remove('dark');
          document.body.style.backgroundColor = '#F2F2F7';
        }
      }
      // Adapt native iOS status bar text color
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

  // Lock the app again when it returns from background (Guideline 4.2 native security)
  useEffect(() => {
    const listenerPromise = CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        if (data.settings.isPasscodeEnabled) {
          setIsLocked(true);
        }
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [data.settings.isPasscodeEnabled]);

  // Update notification permission state on mount
  useEffect(() => {
    NativeNotificationService.checkPermissions().then((status) => {
      setNotificationPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'default');
    });
  }, []);

  // Schedule daily expense reminder whenever settings change
  useEffect(() => {
    NativeNotificationService.scheduleDailyReminder(data.settings);
  }, [data.settings.dailyReminderEnabled, data.settings.dailyReminderTime, data.settings.language]);

  // Evaluate bill notifications once on data change
  const runBillNotificationCheck = useCallback(async () => {
    if (!data.settings.notificationsEnabled) return;
    const reminders = await NativeNotificationService.scheduleBillReminders(data.bills, data.settings);
    if (reminders.length > 0 && !currentNotification) {
      setCurrentNotification(reminders[0]);
    }
  }, [data.bills, data.settings, currentNotification]);

  useEffect(() => {
    runBillNotificationCheck();
  }, [runBillNotificationCheck]);

  // Request native Notification permission
  const handleRequestNotificationPermission = async () => {
    nativeHaptics.tap(data.settings.soundEnabled);
    const granted = await NativeNotificationService.requestPermissions();
    setNotificationPermission(granted ? 'granted' : 'denied');
    if (granted) {
      nativeHaptics.success(data.settings.soundEnabled);
      showToast(data.settings.language === 'en' ? 'Notifications enabled' : 'تم تفعيل التنبيهات بنجاح');
      runBillNotificationCheck();
      NativeNotificationService.scheduleDailyReminder(data.settings);
    }
  };

  // Send a test notification
  const handleSendTestNotification = async () => {
    nativeHaptics.success(data.settings.soundEnabled);
    const res = await NativeNotificationService.sendTest(data.settings);
    setCurrentNotification({
      id: `test-${Date.now()}`,
      title: res.title,
      body: res.body,
      timestamp: Date.now(),
    });
  };

  // Update specific settings
  const handleUpdateSettings = (newSettings: Partial<BudgetSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
  };

  // Add or Edit Expense
  const handleSaveExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    nativeHaptics.success(data.settings.soundEnabled);
    if (editingExpense) {
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
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: Date.now(),
      };
      setData((prev) => ({
        ...prev,
        expenses: [newExp, ...prev.expenses],
      }));
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

  // Categories
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

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Delete Category' : 'حذف التصنيف',
      message: data.settings.language === 'en' ? 'Are you sure you want to delete this category? Associated expenses will move to General.' : 'هل أنت متأكد من حذف هذا التصنيف؟ سيتم نقل مصاريفه للتصنيف العام.',
      isDestructive: true,
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== categoryId),
          expenses: prev.expenses.map((e) =>
            e.categoryId === categoryId ? { ...e, categoryId: prev.categories[0]?.id || 'food' } : e
          ),
        }));
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

  // Bills
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

  // Groceries
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
    const itemNames = items.map((i) => i.name).join('، ');

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: data.settings.language === 'en' ? 'Household Grocery Purchase' : 'مشتريات ونواقص تموين البيت',
      amount: totalAmount > 0 ? totalAmount : 150,
      categoryId: data.categories[0]?.id || 'food',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'card',
      payer: 'مشترك',
      notes: `${data.settings.language === 'en' ? 'Purchased items:' : 'أصناف مشتراة:'} ${itemNames}`,
      createdAt: Date.now(),
    };

    setData((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      groceries: prev.groceries.filter((g) => !g.isBought),
    }));

    setActiveTab('expenses');
    showToast(data.settings.language === 'en' ? 'Groceries recorded as expense' : 'تم ترحيل المشتريات كمصروف');
  };

  // Data management
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
        setData((prev) => ({
          ...prev,
          expenses: [],
          bills: [],
          groceries: [],
        }));
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'All data erased' : 'تم مسح كافة البيانات', 'info');
      },
    });
  };

  // Passcode modal success handlers
  const handlePasscodeSuccess = () => {
    if (isLocked) {
      setIsLocked(false);
    } else {
      handleUpdateSettings({ isPasscodeEnabled: true });
      setPasscodeModalMode(null);
      showToast(data.settings.language === 'en' ? 'Passcode enabled' : 'تم تفعيل رمز الدخول بنجاح');
    }
  };

  const handleDisablePasscode = () => {
    setConfirmDialog({
      isOpen: true,
      title: data.settings.language === 'en' ? 'Remove Passcode' : 'إلغاء رمز الدخول',
      message: data.settings.language === 'en' ? 'Disable passcode security for this app?' : 'هل تريد تعطيل قفل الرمز السري للتطبيق؟',
      isDestructive: true,
      onConfirm: async () => {
        await SecurityService.removePasscode();
        handleUpdateSettings({ isPasscodeEnabled: false });
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        showToast(data.settings.language === 'en' ? 'Passcode removed' : 'تم إلغاء رمز الدخول');
      },
    });
  };

  const isEn = data.settings.language === 'en';
  const unpaidBillsCount = data.bills.filter((b) => !b.isPaid).length;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F2F2F7] dark:bg-black text-[#1C1C1E] dark:text-white pt-safe pb-safe overflow-hidden select-none">
      {/* iOS Dropdown Notification Banner */}
      <IOSNotificationBanner
        notification={currentNotification}
        onDismiss={() => setCurrentNotification(null)}
        onAction={() => {
          setCurrentNotification(null);
          setActiveTab('bills_groceries');
        }}
      />

      {/* App-wide Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onClose={() => setToastMessage(null)}
      />

      {/* App-wide Native-styled Confirmation Modal */}
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

      {/* Active Tab View */}
      <main className="flex-1 w-full flex flex-col overflow-hidden">
        {activeTab === 'dashboard' && (
          <DashboardTab
            categories={data.categories}
            expenses={data.expenses}
            bills={data.bills}
            settings={data.settings}
            onOpenAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            onNavigateToTab={(tab: TabId) => setActiveTab(tab)}
            onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
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
            onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          />
        )}

        {activeTab === 'bills_groceries' && (
          <BillsAndGroceriesTab
            bills={data.bills}
            groceries={data.groceries}
            categories={data.categories}
            settings={data.settings}
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
          />
        )}

        {activeTab === 'analytics_settings' && (
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
          />
        )}
      </main>

      {/* iOS Native TabBar with Safe Area Padding */}
      <TabBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
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
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={data.categories}
        currency={data.settings.currency}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        soundEnabled={data.settings.soundEnabled}
        onShowToast={showToast}
      />

      {/* Passcode Unlock Screen (shown if app is locked) */}
      <PasscodeLockModal
        isOpen={isLocked}
        mode="unlock"
        onSuccess={() => setIsLocked(false)}
        isDark={isDarkMode}
        soundEnabled={data.settings.soundEnabled}
        isEnglish={isEn}
      />

      {/* Passcode Set / Change Modal */}
      {passcodeModalMode && (
        <PasscodeLockModal
          isOpen={true}
          mode={passcodeModalMode}
          onSuccess={handlePasscodeSuccess}
          onCancel={() => setPasscodeModalMode(null)}
          isDark={isDarkMode}
          soundEnabled={data.settings.soundEnabled}
          isEnglish={isEn}
        />
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
        isEnglish={isEn}
        soundEnabled={data.settings.soundEnabled}
      />
    </div>
  );
}
