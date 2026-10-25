/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AppData,
  Category,
  Expense,
  RecurringBill,
  GroceryItem,
  BudgetSettings,
  InAppNotification,
} from './types';
import { loadAppData, saveAppData, getDefaultAppData } from './utils/storage';
import { sound } from './utils/audio';
import {
  getNotificationPermission,
  requestNotificationPermission,
  checkAndScheduleBillReminders,
  sendTestBillNotification,
  NotificationPermissionState,
} from './utils/notifications';

import { IPhoneFrame } from './components/IPhoneFrame';
import { TabBar, TabId } from './components/TabBar';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { IOSNotificationBanner } from './components/IOSNotificationBanner';

import { DashboardTab } from './components/tabs/DashboardTab';
import { ExpensesTab } from './components/tabs/ExpensesTab';
import { BudgetsTab } from './components/tabs/BudgetsTab';
import { BillsAndGroceriesTab } from './components/tabs/BillsAndGroceriesTab';
import { AnalyticsSettingsTab } from './components/tabs/AnalyticsSettingsTab';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Local Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => getNotificationPermission()
  );
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);

  // Sync to localStorage whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Handle system dark mode preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const match = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(match.matches);
    }
  }, []);

  // Update notification permission state on mount
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
  }, []);

  // Evaluate and schedule local bill notifications
  const runBillNotificationCheck = useCallback(() => {
    if (!data.settings.notificationsEnabled) return;
    const reminders = checkAndScheduleBillReminders(data.bills, data.settings);
    if (reminders.length > 0 && !currentNotification) {
      setCurrentNotification(reminders[0]);
    }
  }, [data.bills, data.settings, currentNotification]);

  useEffect(() => {
    // Check reminders on mount and every 30 seconds
    runBillNotificationCheck();
    const interval = setInterval(runBillNotificationCheck, 30000);
    return () => clearInterval(interval);
  }, [runBillNotificationCheck]);

  // Request browser Notification API permission
  const handleRequestNotificationPermission = async () => {
    sound.playTap(data.settings.soundEnabled);
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      sound.playSuccess(data.settings.soundEnabled);
      runBillNotificationCheck();
    }
  };

  // Send a test notification
  const handleSendTestNotification = () => {
    sound.playSuccess(data.settings.soundEnabled);
    const res = sendTestBillNotification(data.settings.currency);
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
    if (editingExpense) {
      // Edit
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === editingExpense.id
            ? { ...expenseData, id: e.id, createdAt: e.createdAt }
            : e
        ),
      }));
      setEditingExpense(null);
    } else {
      // Create
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: Date.now(),
      };
      setData((prev) => ({
        ...prev,
        expenses: [newExp, ...prev.expenses],
      }));
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId),
    }));
  };

  // Categories
  const handleSaveCategory = (catToSave: Category) => {
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
  };

  const handleDeleteCategory = (categoryId: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== categoryId),
      // fallback expenses category to food or first available
      expenses: prev.expenses.map((e) =>
        e.categoryId === categoryId ? { ...e, categoryId: prev.categories[0]?.id || 'food' } : e
      ),
    }));
  };

  const handleUpdateCategoryLimit = (categoryId: string, newLimit: number) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === categoryId ? { ...c, monthlyLimit: newLimit } : c
      ),
    }));
  };

  // Bills
  const handleToggleBill = (billId: string) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === billId ? { ...b, isPaid: !b.isPaid } : b)),
    }));
  };

  const handleToggleBillReminder = (billId: string) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.map((b) =>
        b.id === billId ? { ...b, reminderEnabled: b.reminderEnabled === false ? true : false } : b
      ),
    }));
  };

  const handleAddBill = (billData: Omit<RecurringBill, 'id'>) => {
    const newBill: RecurringBill = {
      ...billData,
      id: `bill-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      bills: [...prev.bills, newBill],
    }));
  };

  const handleDeleteBill = (billId: string) => {
    setData((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== billId),
    }));
  };

  // Groceries
  const handleToggleGrocery = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      groceries: prev.groceries.map((g) => (g.id === itemId ? { ...g, isBought: !g.isBought } : g)),
    }));
  };

  const handleAddGrocery = (itemData: Omit<GroceryItem, 'id'>) => {
    const newGroc: GroceryItem = {
      ...itemData,
      id: `groc-${Date.now()}`,
    };
    setData((prev) => ({
      ...prev,
      groceries: [newGroc, ...prev.groceries],
    }));
  };

  const handleDeleteGrocery = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      groceries: prev.groceries.filter((g) => g.id !== itemId),
    }));
  };

  const handleConvertBoughtToExpense = (items: GroceryItem[]) => {
    const totalAmount = items.reduce((sum, i) => sum + i.estimatedPrice * i.quantity, 0);
    const itemNames = items.map((i) => i.name).join('، ');

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: 'مشتريات ونواقص تموين البيت',
      amount: totalAmount > 0 ? totalAmount : 150,
      categoryId: data.categories[0]?.id || 'food',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'card',
      payer: 'مشترك',
      notes: `أصناف مشتراة: ${itemNames}`,
      createdAt: Date.now(),
    };

    // Remove bought items from list and add expense
    setData((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
      groceries: prev.groceries.filter((g) => !g.isBought),
    }));

    setActiveTab('expenses');
  };

  // Data management
  const handleImportData = (imported: AppData) => {
    setData(imported);
  };

  const handleResetData = () => {
    const defaultData = getDefaultAppData();
    setData(defaultData);
  };

  const handleClearAllData = () => {
    setData((prev) => ({
      ...prev,
      expenses: [],
      bills: [],
      groceries: [],
    }));
  };

  // Unpaid bills count for TabBar badge
  const unpaidBillsCount = data.bills.filter((b) => !b.isPaid).length;

  return (
    <IPhoneFrame
      frameMode={data.settings.deviceFrameMode}
      onToggleFrameMode={() =>
        handleUpdateSettings({ deviceFrameMode: !data.settings.deviceFrameMode })
      }
      soundEnabled={data.settings.soundEnabled}
      onToggleSound={() =>
        handleUpdateSettings({ soundEnabled: !data.settings.soundEnabled })
      }
      isDark={isDarkMode}
      onToggleDark={() => setIsDarkMode((prev) => !prev)}
    >
      {/* iOS Dropdown Notification Banner */}
      <IOSNotificationBanner
        notification={currentNotification}
        onDismiss={() => setCurrentNotification(null)}
        onAction={() => {
          setCurrentNotification(null);
          setActiveTab('bills_groceries');
        }}
      />

      {/* Active Tab View */}
      <div className="flex-1 w-full flex flex-col overflow-hidden">
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
            onResetData={handleResetData}
            onClearAllData={handleClearAllData}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            onSendTestNotification={handleSendTestNotification}
            notificationPermission={notificationPermission}
          />
        )}
      </div>

      {/* iOS TabBar */}
      <TabBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenAddExpense={() => {
          setEditingExpense(null);
          setIsAddExpenseOpen(true);
        }}
        unpaidBillsCount={unpaidBillsCount}
        soundEnabled={data.settings.soundEnabled}
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
      />
    </IPhoneFrame>
  );
}
