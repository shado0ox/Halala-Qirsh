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
  source?: 'manual' | 'sms' | 'quick_intent' | 'apple_pay' | 'jamiyya';
  isAutoLogged?: boolean;
  type?: 'expense' | 'income';
  jamiyyaId?: string;
  jamiyyaCycleNumber?: number;
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
  annualBudget?: number;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  billId?: string;
  timestamp: number;
}

export type SubscriptionFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'detected' | 'confirmed' | 'dismissed';

export interface PriceIncreaseInfo {
  oldAmount: number;
  newAmount: number;
  difference: number;
  percentage: number;
  date: string;
}

export interface DetectedSubscription {
  id: string;
  merchant: string;
  merchantName?: string;
  normalizedMerchant: string;
  typicalAmount: number;
  detectedFrequency: SubscriptionFrequency;
  frequency?: SubscriptionFrequency;
  lastChargeDate: string; // YYYY-MM-DD
  nextExpectedRenewalDate: string; // YYYY-MM-DD
  status: SubscriptionStatus;
  detectedAt?: number;
  chargeCount?: number;
  priceHistory?: Array<{ date: string; amount: number; expenseId?: string }>;
  previousAmount?: number;
  priceIncrease?: PriceIncreaseInfo;
  notes?: string;
  reminderDaysBefore?: number;
  categoryId?: string;
  isUserEdited?: boolean;
  autoDetected?: boolean;
}

export type JamiyyaFrequency = 'monthly' | 'weekly' | 'biweekly';
export type JamiyyaStatus = 'active' | 'completed' | 'cancelled';

export interface JamiyyaMember {
  id: string;
  name: string;
  phone?: string;
  payoutTurn: number; // 1-based cycle index when this member receives the pot
  isOrganizer?: boolean;
  isCurrentUser?: boolean; // Is this the app user ("Me")
  notes?: string;
  hasTakenTurn?: boolean;
}

export interface JamiyyaPaymentRecord {
  memberId: string;
  cycleNumber: number; // 1-based cycle index
  isPaid: boolean;
  paidDate?: string; // YYYY-MM-DD
  amountPaid: number;
  linkedExpenseId?: string;
  notes?: string;
}

export interface JamiyyaCycle {
  cycleNumber: number; // 1, 2, 3 ...
  dueDate: string; // YYYY-MM-DD
  recipientMemberId: string; // Member who receives the pot
  expectedAmount: number; // Total pot amount
  payoutReceived: boolean;
  payoutDate?: string;
  linkedIncomeExpenseId?: string;
}

export interface JamiyyaDiscrepancy {
  id: string;
  date: string;
  type: 'missed_payment' | 'member_replaced' | 'amount_shortage' | 'other';
  description: string;
  affectedMemberId?: string;
  resolved: boolean;
}

export interface JamiyyaGroup {
  id: string;
  name: string;
  totalPayout: number; // The pot amount each recipient gets
  installmentAmount: number; // Amount each member pays per cycle
  membersCount: number; // derived or explicit
  frequency: JamiyyaFrequency;
  startDate: string; // YYYY-MM-DD
  status: JamiyyaStatus;
  organizerId?: string;
  bankAccountInfo?: string; // Payment destination info (IBAN, STC Pay, etc.)
  notes?: string;
  reminderDaysBefore?: number;
  members: JamiyyaMember[];
  payments: JamiyyaPaymentRecord[];
  cycles: JamiyyaCycle[];
  discrepancies?: JamiyyaDiscrepancy[];
  createdAt: number;
  updatedAt?: number;
}

export interface AppData {
  categories: Category[];
  expenses: Expense[];
  bills: RecurringBill[];
  groceries: GroceryItem[];
  settings: BudgetSettings;
  subscriptions?: DetectedSubscription[];
  dismissedSubscriptionMerchants?: string[];
  jamiyyas?: JamiyyaGroup[];
}
