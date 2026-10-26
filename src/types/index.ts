export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon: string;
  color: string;
  bgColor: string;
  monthlyLimit: number;
  isCustom?: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'digital';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  payer: 'الزوج' | 'الزوجة' | 'مشترك' | string;
  notes?: string;
  createdAt: number;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  dueDay: number; // 1 - 31
  isPaid: boolean;
  notes?: string;
  reminderEnabled?: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  estimatedPrice: number;
  isBought: boolean;
  quantity: number;
  unit: string;
}

export type CurrencyCode = 'SAR' | 'EGP' | 'AED' | 'KWD' | 'QAR' | 'USD' | 'EUR';

export interface BudgetSettings {
  budgetMode: 'sum_categories' | 'custom_total';
  totalMonthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  soundEnabled: boolean;
  themeMode: 'system' | 'light' | 'dark';
  selectedMonth: string; // YYYY-MM
  notificationsEnabled: boolean;
  notificationLeadDays: number;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "HH:MM" e.g. "21:00"
  language: 'ar' | 'en';
  isPasscodeEnabled: boolean;
  biometricsEnabled: boolean;
  autoLockTimeout?: number; // 0 (Immediately), 30 (30s default), 60 (1m), 300 (5m)
  lastNotificationCheckDate?: string;
  animations?: 'full' | 'reduced' | 'off';
  hideAmounts?: boolean;
  hasCompletedOnboarding?: boolean;
  lastCelebratedMonth?: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  billId?: string;
  timestamp: number;
}

export interface AppData {
  categories: Category[];
  expenses: Expense[];
  bills: RecurringBill[];
  groceries: GroceryItem[];
  settings: BudgetSettings;
}
