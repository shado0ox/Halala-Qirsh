import { Preferences } from '@capacitor/preferences';
import { AppData, Category, Expense, RecurringBill, GroceryItem, CurrencyCode } from '../types';
import { NativeShareService } from './nativeShare';

const STORAGE_KEY = 'ios_home_expenses_store_v1';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, { symbol: string; name: string; nameEn: string }> = {
  SAR: { symbol: 'ر.س', name: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  EGP: { symbol: 'ج.م', name: 'جنيه مصري', nameEn: 'Egyptian Pound' },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي', nameEn: 'UAE Dirham' },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي', nameEn: 'Kuwaiti Dinar' },
  QAR: { symbol: 'ر.ق', name: 'ريال قطري', nameEn: 'Qatari Riyal' },
  USD: { symbol: '$', name: 'دولار أمريكي', nameEn: 'US Dollar' },
  EUR: { symbol: '€', name: 'يورو', nameEn: 'Euro' },
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'البقالة والسوبرماركت',
    nameEn: 'Groceries & Food',
    icon: 'ShoppingCart',
    color: '#10B981',
    bgColor: '#ECFDF5',
    monthlyLimit: 2500,
  },
  {
    id: 'bills',
    name: 'فواتير وخدمات المنزل',
    nameEn: 'Utilities & Bills',
    icon: 'Zap',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    monthlyLimit: 900,
  },
  {
    id: 'housing',
    name: 'إيجار وسكن',
    nameEn: 'Rent & Housing',
    icon: 'Home',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    monthlyLimit: 4000,
  },
  {
    id: 'kids',
    name: 'الأطفال والمدارس',
    nameEn: 'Kids & School',
    icon: 'Baby',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    monthlyLimit: 1200,
  },
  {
    id: 'maintenance',
    name: 'صيانة وتجهيزات البيت',
    nameEn: 'Home Maintenance',
    icon: 'Wrench',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    monthlyLimit: 600,
  },
  {
    id: 'health',
    name: 'الصحة والأدوية',
    nameEn: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    monthlyLimit: 500,
  },
  {
    id: 'transport',
    name: 'بنزين ومواصلات',
    nameEn: 'Transport & Fuel',
    icon: 'Car',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    monthlyLimit: 800,
  },
  {
    id: 'entertainment',
    name: 'ترفيه ومطاعم عائلية',
    nameEn: 'Outings & Dining',
    icon: 'Coffee',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    monthlyLimit: 700,
  },
  {
    id: 'emergency',
    name: 'طوارئ ومتفرقات',
    nameEn: 'Emergency & Misc',
    icon: 'Shield',
    color: '#64748B',
    bgColor: '#F8FAFC',
    monthlyLimit: 800,
  },
];

export const getCurrentMonthString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Clean default app state for new App Store users:
 * Zero seeded transactions, zero seeded bills, zero seeded groceries.
 * Only default categories and sensible default settings.
 */
export const getDefaultAppData = (): AppData => ({
  categories: DEFAULT_CATEGORIES,
  expenses: [],
  bills: [],
  groceries: [],
  settings: {
    budgetMode: 'sum_categories',
    totalMonthlyBudget: 12000,
    salaryDay: 27,
    currency: 'SAR',
    soundEnabled: true,
    themeMode: 'system',
    selectedMonth: getCurrentMonthString(),
    notificationsEnabled: true,
    notificationLeadDays: 1,
    dailyReminderEnabled: true,
    dailyReminderTime: '21:00',
    language: 'ar',
    isPasscodeEnabled: false,
    biometricsEnabled: false,
  },
});

/**
 * Validates the structure of imported JSON backup
 */
export const validateBackupData = (raw: unknown): raw is AppData => {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<AppData>;

  if (!Array.isArray(candidate.categories) || candidate.categories.length === 0) {
    return false;
  }
  if (!Array.isArray(candidate.expenses)) {
    return false;
  }
  if (!Array.isArray(candidate.bills)) {
    return false;
  }
  if (!Array.isArray(candidate.groceries)) {
    return false;
  }
  if (!candidate.settings || typeof candidate.settings !== 'object') {
    return false;
  }

  return true;
};

/**
 * Synchronous memory cache & fallback loader
 */
export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') return getDefaultAppData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultAppData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const defaultData = getDefaultAppData();

    return {
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      bills: Array.isArray(parsed.bills) ? parsed.bills : [],
      groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
      settings: {
        ...defaultData.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load local storage data:', err);
    return getDefaultAppData();
  }
};

/**
 * Asynchronously loads from Capacitor Preferences (Native iOS NSUserDefaults)
 * with automatic migration from localStorage if needed.
 */
export const loadAppDataFromPreferences = async (): Promise<AppData> => {
  const defaultData = getDefaultAppData();
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });

    if (value) {
      const parsed = JSON.parse(value) as Partial<AppData>;
      const merged: AppData = {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
        settings: {
          ...defaultData.settings,
          ...(parsed.settings || {}),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    // Migration step: If not in Preferences, check localStorage
    const localRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (localRaw) {
      console.log('Migrating existing localStorage data into Capacitor Preferences...');
      const parsed = JSON.parse(localRaw) as Partial<AppData>;
      const merged: AppData = {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        bills: Array.isArray(parsed.bills) ? parsed.bills : [],
        groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
        settings: {
          ...defaultData.settings,
          ...(parsed.settings || {}),
        },
      };
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(merged) });
      return merged;
    }

    // If completely new user, save empty default to Preferences
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(defaultData) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  } catch (err) {
    console.error('Preferences read error, using localStorage fallback:', err);
    return loadAppData();
  }
};

/**
 * Saves both to Capacitor Preferences (persistent against iOS eviction)
 * and to localStorage.
 */
export const saveAppData = (data: AppData): void => {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(data);
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }

  Preferences.set({ key: STORAGE_KEY, value: json }).catch((err) => {
    console.error('Failed to save to Capacitor Preferences:', err);
  });
};

/**
 * Exports full app data as JSON and triggers native iOS Share Sheet
 */
export const exportDataAsJSON = async (data: AppData): Promise<boolean> => {
  const json = JSON.stringify(data, null, 2);
  const fileName = `home_expenses_backup_${new Date().toISOString().split('T')[0]}.json`;
  return await NativeShareService.shareFile(fileName, json, 'application/json');
};

/**
 * Exports expenses as CSV with UTF-8 BOM and triggers native iOS Share Sheet
 */
export const exportExpensesToCSV = async (
  expenses: Expense[],
  categories: Category[],
  currencySymbol: string,
  isEnglish: boolean = false
): Promise<boolean> => {
  const catMap = new Map(categories.map((c) => [c.id, isEnglish && c.nameEn ? c.nameEn : c.name]));
  const headers = isEnglish
    ? ['Date', 'Item', 'Amount', 'Currency', 'Category', 'Payment Method', 'Payer', 'Notes']
    : ['التاريخ', 'البند', 'المبلغ', 'العملة', 'الفئة', 'طريقة الدفع', 'المسؤول', 'ملاحظات'];

  const rows = expenses.map((e) => [
    `"${e.date}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    e.amount,
    `"${currencySymbol}"`,
    `"${catMap.get(e.categoryId) || (isEnglish ? 'General' : 'غير محدد')}"`,
    `"${e.paymentMethod}"`,
    `"${e.payer}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `expenses_report_${new Date().toISOString().split('T')[0]}.csv`;

  return await NativeShareService.shareFile(fileName, csvContent, 'text/csv');
};

export const formatMoney = (amount: number, currency: CurrencyCode, lang: 'ar' | 'en' = 'ar'): string => {
  const sym = CURRENCY_SYMBOLS[currency]?.symbol || 'ر.س';
  const formattedNum = amount.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return lang === 'ar' ? `${formattedNum} ${sym}` : `${sym} ${formattedNum}`;
};
