export interface Category {
  id: string;
  name: string;
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
  reminderEnabled?: boolean; // whether local notifications are scheduled for this bill
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
  totalMonthlyBudget: number; // Used when budgetMode is 'custom_total'
  salaryDay: number;
  currency: CurrencyCode;
  soundEnabled: boolean;
  deviceFrameMode: boolean; // toggle between iPhone frame mockup on desktop and full width
  selectedMonth: string; // YYYY-MM
  notificationsEnabled: boolean;
  notificationLeadDays: number; // 0 = same day, 1 = 1 day before, 3 = 3 days before
  lastNotificationCheckDate?: string;
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
