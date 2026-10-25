import React from 'react';
import {
  Wallet,
  TrendingDown,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  Bell,
} from 'lucide-react';
import { Category, Expense, RecurringBill, BudgetSettings } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { translations } from '../../utils/i18n';

interface DashboardTabProps {
  categories: Category[];
  expenses: Expense[];
  bills: RecurringBill[];
  settings: BudgetSettings;
  onOpenAddExpense: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenCategoryManager: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  categories,
  expenses,
  bills,
  settings,
  onOpenAddExpense,
  onNavigateToTab,
  onOpenCategoryManager,
}) => {
  const currentMonth = settings.selectedMonth;

  // Filter expenses for selected month
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Total budget calculation based on settings
  const totalBudget =
    settings.budgetMode === 'custom_total'
      ? settings.totalMonthlyBudget
      : categories.reduce((sum, c) => sum + c.monthlyLimit, 0);

  const remainingBudget = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999) : 0;

  // Days in month & remaining days
  const now = new Date();
  const year = parseInt(currentMonth.split('-')[0], 10);
  const month = parseInt(currentMonth.split('-')[1], 10);
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  const currentDay = now.getMonth() + 1 === month ? now.getDate() : 1;
  const remainingDays = Math.max(totalDaysInMonth - currentDay + 1, 1);
  const dailySuggestedSpend = remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0;

  // Today's expenses
  const todayStr = now.toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const todaySpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Unpaid bills due this month
  const unpaidBills = bills.filter((b) => !b.isPaid);
  const urgentBills = unpaidBills.filter((b) => Math.abs(b.dueDay - currentDay) <= 4);

  // Over-budget categories
  const categorySpendMap = new Map<string, number>();
  monthlyExpenses.forEach((e) => {
    categorySpendMap.set(e.categoryId, (categorySpendMap.get(e.categoryId) || 0) + e.amount);
  });

  const overBudgetCategories = categories.filter((c) => {
    const spent = categorySpendMap.get(c.id) || 0;
    return c.monthlyLimit > 0 && spent > c.monthlyLimit;
  });

  // Category map
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const lang = settings.language || 'ar';
  const t = translations[lang];
  const isEn = lang === 'en';

  const monthNamesArabic = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  const monthNamesEnglish = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthFormatted = isEn
    ? `${monthNamesEnglish[month - 1]} ${year}`
    : `${monthNamesArabic[month - 1]} ${year}`;

  // Gauge color logic
  const isDanger = percentageSpent >= 100;
  const isWarning = percentageSpent >= 80 && !isDanger;
  const gaugeColor = isDanger ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981';

  // SVG ring math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentageSpent, 100) / 100) * circumference;

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Top Header Card */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#8E8E93] flex items-center gap-1">
            <Calendar size={13} />
            <span>{t.monthlyBudgetTitle} {monthFormatted}</span>
          </span>
          <h1 className="text-xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
            {t.dashboardHeading}
          </h1>
        </div>

        <button
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenCategoryManager();
          }}
          className="p-2 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="تعديل الميزانية والتصنيفات"
        >
          <Sliders size={14} />
          <span>{t.categoriesBtn}</span>
        </button>
      </div>

      {/* Main Apple Budget Health Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#1C1C1E] shadow-xs border border-slate-200/60 dark:border-slate-800/80 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Circular Gauge */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="currentColor"
                strokeWidth="13"
                className="text-[#E5E5EA] dark:text-[#2C2C2E]"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="13"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums tracking-tight">
                {percentageSpent}%
              </span>
              <span className="text-[11px] font-bold text-[#8E8E93]">
                {isDanger ? 'تجاوزت الميزانية' : isWarning ? 'قريب من الحد' : 'في النطاق الآمن'}
              </span>
            </div>
          </div>

          {/* Budget Numbers */}
          <div className="flex-1 w-full space-y-3 text-right">
            <div>
              <span className="text-xs text-[#8E8E93] font-medium">المصروف الفعلي حتى الآن</span>
              <div className="text-2xl font-black text-[#1C1C1E] dark:text-white tabular-nums">
                {formatMoney(totalSpent, settings.currency)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div>
                <span className="text-[11px] text-[#8E8E93]">الميزانية الكلية</span>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatMoney(totalBudget, settings.currency)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-[#8E8E93]">المتبقي من الميزانية</span>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    remainingBudget < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatMoney(remainingBudget, settings.currency)}
                </div>
              </div>
            </div>

            {/* Daily spend advice */}
            <div className="p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between text-xs">
              <span className="text-[#8E8E93] font-medium">معدل الصرف اليومي المتاح:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatMoney(dailySuggestedSpend, settings.currency)} / يوم ({remainingDays} يوم متبقي)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenAddExpense();
          }}
          className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus size={18} strokeWidth={2.8} />
          </div>
          <span className="text-xs font-bold">{t.recordExpense}</span>
        </button>

        <button
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onNavigateToTab('bills_groceries');
          }}
          className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
          <span className="text-xs font-bold">{t.groceryShortage}</span>
        </button>

        <button
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onNavigateToTab('budgets');
          }}
          className="p-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <span className="text-xs font-bold">{t.budgetEnvelopes}</span>
        </button>
      </div>

      {/* Warnings & Alerts */}
      {(overBudgetCategories.length > 0 || urgentBills.length > 0) && (
        <div className="space-y-2">
          {overBudgetCategories.map((cat) => {
            const spent = categorySpendMap.get(cat.id) || 0;
            const diff = spent - cat.monthlyLimit;
            return (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3 text-red-700 dark:text-red-300"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={18} className="shrink-0 text-red-500" />
                  <div className="text-xs">
                    <span className="font-bold">تجاوز ميزانية {cat.name}!</span>
                    <div className="text-[11px] opacity-80 tabular-nums">
                      المصروف: {spent} {settings.currency} (الحد: {cat.monthlyLimit} - زيادة {diff})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToTab('budgets')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600 text-white shrink-0 cursor-pointer"
                >
                  تفاصيل
                </button>
              </div>
            );
          })}

          {urgentBills.map((b) => (
            <div
              key={b.id}
              className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>فاتورة تستحق السداد قريباً</span>
                    {b.reminderEnabled !== false && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5">
                        <Bell size={10} /> مجدولة
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {b.title} ({formatMoney(b.amount, settings.currency)}) - يوم {b.dueDay} من الشهر
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('bills_groceries')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white shrink-0 cursor-pointer"
              >
                سداد
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#8E8E93] font-medium">مصاريف اليوم</span>
            <TrendingDown size={14} className="text-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
            {formatMoney(todaySpent, settings.currency)}
          </div>
          <span className="text-[10px] text-[#8E8E93]">{todayExpenses.length} عمليات مسجلة</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#8E8E93] font-medium">فواتير متبقية</span>
            <CheckCircle2 size={14} className="text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
            {unpaidBills.length} فواتير
          </div>
          <span className="text-[10px] text-[#8E8E93]">
            بإجمالي {formatMoney(unpaidBills.reduce((s, b) => s + b.amount, 0), settings.currency)}
          </span>
        </div>
      </div>

      {/* Recent Household Transactions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
            آخر نفقات المنزل
          </h2>
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>عرض الكل</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
          {monthlyExpenses.slice(0, 4).map((exp) => {
            const cat = catMap.get(exp.categoryId);
            return (
              <div
                key={exp.id}
                className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon
                    iconName={cat?.icon || 'Tag'}
                    color={cat?.color || '#3B82F6'}
                    bgColor={cat?.bgColor}
                    size="md"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {exp.title}
                    </div>
                    <div className="text-[11px] text-[#8E8E93] flex items-center gap-1.5">
                      <span>{cat?.name || 'تصنيف عام'}</span>
                      <span>·</span>
                      <span>{exp.payer}</span>
                      <span>·</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
                    -{formatMoney(exp.amount, settings.currency)}
                  </span>
                </div>
              </div>
            );
          })}

          {monthlyExpenses.length === 0 && (
            <div className="p-6 text-center text-xs text-[#8E8E93]">
              لا توجد مصاريف مسجلة لهذا الشهر بعد. اضغط على زر "+" لتسجيل أول مصروف.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
