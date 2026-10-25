import { AppData, Category, Expense, RecurringBill, GroceryItem, CurrencyCode } from '../types';

const STORAGE_KEY = 'ios_home_expenses_store_v1';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, { symbol: string; name: string }> = {
  SAR: { symbol: 'ر.س', name: 'ريال سعودي' },
  EGP: { symbol: 'ج.م', name: 'جنيه مصري' },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي' },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي' },
  QAR: { symbol: 'ر.ق', name: 'ريال قطري' },
  USD: { symbol: '$', name: 'دولار أمريكي' },
  EUR: { symbol: '€', name: 'يورو' },
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'البقالة والسوبرماركت',
    icon: 'ShoppingCart',
    color: '#10B981',
    bgColor: '#ECFDF5',
    monthlyLimit: 2500,
  },
  {
    id: 'bills',
    name: 'فواتير وخدمات المنزل',
    icon: 'Zap',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    monthlyLimit: 900,
  },
  {
    id: 'housing',
    name: 'إيجار وسكن',
    icon: 'Home',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    monthlyLimit: 4000,
  },
  {
    id: 'kids',
    name: 'الأطفال والمدارس',
    icon: 'Baby',
    color: '#EC4899',
    bgColor: '#FDF2F8',
    monthlyLimit: 1200,
  },
  {
    id: 'maintenance',
    name: 'صيانة وتجهيزات البيت',
    icon: 'Wrench',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    monthlyLimit: 600,
  },
  {
    id: 'health',
    name: 'الصحة والأدوية',
    icon: 'HeartPulse',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    monthlyLimit: 500,
  },
  {
    id: 'transport',
    name: 'بنزين ومواصلات',
    icon: 'Car',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    monthlyLimit: 800,
  },
  {
    id: 'entertainment',
    name: 'ترفيه ومطاعم عائلية',
    icon: 'Coffee',
    color: '#14B8A6',
    bgColor: '#F0FDFA',
    monthlyLimit: 700,
  },
  {
    id: 'emergency',
    name: 'طوارئ ومتفرقات',
    icon: 'Shield',
    color: '#64748B',
    bgColor: '#F8FAFC',
    monthlyLimit: 800,
  },
];

const getCurrentMonthString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getSampleExpenses = (): Expense[] => {
  const currentMonth = getCurrentMonthString();
  return [
    {
      id: 'exp-1',
      title: 'تموين السوبرماركت الشهري',
      amount: 860,
      categoryId: 'food',
      date: `${currentMonth}-03`,
      paymentMethod: 'card',
      payer: 'الزوج',
      notes: 'شراء أساسيات الشهر من كارفور / لولو',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'exp-2',
      title: 'سداد فاتورة الكهرباء',
      amount: 420,
      categoryId: 'bills',
      date: `${currentMonth}-05`,
      paymentMethod: 'digital',
      payer: 'الزوج',
      notes: 'فاتورة الصيف عبر تطبيق سداد',
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'exp-3',
      title: 'لحوم طازجة وخضار أسبوعي',
      amount: 290,
      categoryId: 'food',
      date: `${currentMonth}-08`,
      paymentMethod: 'card',
      payer: 'الزوجة',
      notes: 'ملحمة الحي وسوق الخضار',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'exp-4',
      title: 'بنزين السيارة وصيانة سريعة',
      amount: 180,
      categoryId: 'transport',
      date: `${currentMonth}-11`,
      paymentMethod: 'card',
      payer: 'الزوج',
      notes: 'تعبئة فل بنزين 95',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'exp-5',
      title: 'مستلزمات صيدلية للأولاد',
      amount: 135,
      categoryId: 'health',
      date: `${currentMonth}-12`,
      paymentMethod: 'card',
      payer: 'الزوجة',
      notes: 'فيتامينات ومسكن للحرارة',
      createdAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'exp-6',
      title: 'عشاء مطعم عائلي في الويكند',
      amount: 230,
      categoryId: 'entertainment',
      date: `${currentMonth}-14`,
      paymentMethod: 'digital',
      payer: 'مشترك',
      notes: 'مطعم مع الأبناء بمناسبة نجاحهم',
      createdAt: Date.now() - 3600000 * 8,
    },
    {
      id: 'exp-7',
      title: 'اشتراك الإنترنت المنزلي الفايبر',
      amount: 280,
      categoryId: 'bills',
      date: `${currentMonth}-15`,
      paymentMethod: 'digital',
      payer: 'الزوج',
      notes: 'سداد شهري لخدمة 500 ميجا',
      createdAt: Date.now() - 3600000 * 3,
    },
  ];
};

const getSampleBills = (): RecurringBill[] => [
  {
    id: 'bill-1',
    title: 'إيجار المنزل الشهري',
    amount: 4000,
    categoryId: 'housing',
    dueDay: 1,
    isPaid: true,
    reminderEnabled: true,
    notes: 'تحويل للمالك أول كل شهر',
  },
  {
    id: 'bill-2',
    title: 'فاتورة الكهرباء والتكييف',
    amount: 420,
    categoryId: 'bills',
    dueDay: 25,
    isPaid: true,
    reminderEnabled: true,
    notes: 'تصدر الفاتورة يوم 25',
  },
  {
    id: 'bill-3',
    title: 'اشتراك إنترنت فايبر المنزلي',
    amount: 280,
    categoryId: 'bills',
    dueDay: 28,
    isPaid: true,
    reminderEnabled: true,
    notes: 'سداد تلقائي',
  },
  {
    id: 'bill-4',
    title: 'فاتورة المياه والصرف',
    amount: 95,
    categoryId: 'bills',
    dueDay: 18,
    isPaid: false,
    reminderEnabled: true,
    notes: 'شركة المياه الوطنية',
  },
  {
    id: 'bill-5',
    title: 'قسط باقة جوال العائلة',
    amount: 230,
    categoryId: 'bills',
    dueDay: 27,
    isPaid: false,
    reminderEnabled: true,
    notes: 'باقة مشتركة',
  },
  {
    id: 'bill-6',
    title: 'قسط باص ونشاط المدرسة للأولاد',
    amount: 450,
    categoryId: 'kids',
    dueDay: 5,
    isPaid: true,
    reminderEnabled: true,
    notes: 'اشتراك نقل ومسبح مدرسي',
  },
];

const getSampleGroceries = (): GroceryItem[] => [
  {
    id: 'groc-1',
    name: 'حليب المراعي طازج قليل الدسم',
    category: 'ألبان وأجبان',
    estimatedPrice: 18,
    isBought: true,
    quantity: 2,
    unit: 'لتر',
  },
  {
    id: 'groc-2',
    name: 'طبق بيض بلدي طازج (30 بيضة)',
    category: 'بيض وألبان',
    estimatedPrice: 24,
    isBought: true,
    quantity: 1,
    unit: 'طبق',
  },
  {
    id: 'groc-3',
    name: 'صدور دجاج مبردة ومتبلة',
    category: 'لحوم ودواجن',
    estimatedPrice: 42,
    isBought: true,
    quantity: 2,
    unit: 'كجم',
  },
  {
    id: 'groc-4',
    name: 'أرز بسمتي عنبر هندي درجة أولى',
    category: 'تموين ومؤونة',
    estimatedPrice: 78,
    isBought: false,
    quantity: 1,
    unit: 'كيس 10كجم',
  },
  {
    id: 'groc-5',
    name: 'زيت زيتون بكر ممتاز عصرة أولى',
    category: 'زيوت وتوابل',
    estimatedPrice: 38,
    isBought: false,
    quantity: 1,
    unit: 'لتر',
  },
  {
    id: 'groc-6',
    name: 'صابون غسيل ملابس أوتوماتيك + منعم',
    category: 'منظفات ومستلزمات',
    estimatedPrice: 65,
    isBought: false,
    quantity: 1,
    unit: 'علبة',
  },
  {
    id: 'groc-7',
    name: 'فواكه مشكلة (موز، تفاح، برتقال)',
    category: 'خضار وفواكه',
    estimatedPrice: 35,
    isBought: false,
    quantity: 3,
    unit: 'كجم',
  },
  {
    id: 'groc-8',
    name: 'خبز توست حبوب كاملة وشابورة',
    category: 'مخبوزات',
    estimatedPrice: 14,
    isBought: false,
    quantity: 2,
    unit: 'كيس',
  },
];

export const getDefaultAppData = (): AppData => ({
  categories: DEFAULT_CATEGORIES,
  expenses: getSampleExpenses(),
  bills: getSampleBills(),
  groceries: getSampleGroceries(),
  settings: {
    budgetMode: 'sum_categories',
    totalMonthlyBudget: 12000,
    salaryDay: 27,
    currency: 'SAR',
    soundEnabled: true,
    deviceFrameMode: true,
    selectedMonth: getCurrentMonthString(),
    notificationsEnabled: true,
    notificationLeadDays: 1,
  },
});

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
      categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
      expenses: parsed.expenses || defaultData.expenses,
      bills: parsed.bills || defaultData.bills,
      groceries: parsed.groceries || defaultData.groceries,
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

export const saveAppData = (data: AppData): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }
};

export const exportDataAsJSON = (data: AppData): void => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `home_expenses_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportExpensesToCSV = (expenses: Expense[], categories: Category[], currencySymbol: string): void => {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const headers = ['التاريخ', 'البند', 'المبلغ', 'العملة', 'الفئة', 'طريقة الدفع', 'المسؤول', 'ملاحظات'];

  const rows = expenses.map(e => [
    `"${e.date}"`,
    `"${e.title.replace(/"/g, '""')}"`,
    e.amount,
    `"${currencySymbol}"`,
    `"${catMap.get(e.categoryId) || 'غير محدد'}"`,
    `"${e.paymentMethod}"`,
    `"${e.payer}"`,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `home_expenses_report_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const formatMoney = (amount: number, currency: CurrencyCode): string => {
  const sym = CURRENCY_SYMBOLS[currency]?.symbol || 'ر.س';
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} ${sym}`;
};
