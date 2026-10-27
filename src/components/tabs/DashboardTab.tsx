import React, { useRef, useState, useEffect } from 'react';
import {
  Wallet,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Plus,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Category, Expense, RecurringBill, BudgetSettings } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { translations } from '../../utils/i18n';
import { AnimatedCounter } from '../AnimatedCounter';
import { Amount } from '../Amount';
import { useCoinFlight } from '../../context/CoinFlightContext';
import { cardVariants, reducedCardVariants, useMotionConfig, springs } from '../../utils/motion';
import { HalalaQirshLogo } from '../HalalaQirshLogo';

interface DashboardTabProps {
  categories: Category[];
  expenses: Expense[];
  bills: RecurringBill[];
  settings: BudgetSettings;
  onOpenAddExpense: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenCategoryManager: () => void;
  onOpenSmartSms?: () => void;
  onUpdateSettings?: (newSettings: Partial<BudgetSettings>) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  categories,
  expenses,
  bills,
  settings,
  onOpenAddExpense,
  onNavigateToTab,
  onOpenCategoryManager,
  onOpenSmartSms,
  onUpdateSettings,
}) => {
  const currentMonth = settings.selectedMonth;
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isHidden = Boolean(settings.hideAmounts);

  // Filter expenses for selected month
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Total budget calculation
  const totalBudget =
    settings.budgetMode === 'custom_total'
      ? settings.totalMonthlyBudget
      : categories.reduce((sum, c) => sum + c.monthlyLimit, 0);

  const remainingBudget = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999) : 0;
  const progressRatio = Math.min(percentageSpent, 100) / 100;

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

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const lang = settings.language || 'ar';
  const t = translations[lang];
  const isEn = lang === 'en';
  const isRTL = lang === 'ar';

  const monthFormatted = `${t.monthNames[month - 1]} ${year}`;

  // Gauge & progress color logic
  const isDanger = percentageSpent >= 100;
  const isWarning = percentageSpent >= 80 && !isDanger;

  // SVG Gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentageSpent, 100) / 100) * circumference;

  // Parallax tilt on hero card (transform only, no layout thrashing)
  const containerRef = useRef<HTMLDivElement>(null);
  const remainingTargetRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const { registerTarget } = useCoinFlight();

  useEffect(() => {
    if (remainingTargetRef.current) {
      registerTarget('dashboard-remaining', remainingTargetRef.current);
    }
    return () => {
      registerTarget('dashboard-remaining', null);
    };
  }, [registerTarget]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isReduced) {
      setScrollY(e.currentTarget.scrollTop);
    }
  };

  const heroParallaxTransform = !isReduced && scrollY > 0
    ? `translateY(${Math.min(scrollY * 0.12, 16)}px)`
    : 'none';

  const handleToggleHideAmounts = () => {
    nativeHaptics.tap(settings.soundEnabled);
    if (onUpdateSettings) {
      onUpdateSettings({ hideAmounts: !isHidden });
    }
  };

  // Double-tap on dashboard container detection (Requirement: double-tap opens smart SMS parser)
  const lastTapTimeRef = useRef<number>(0);
  const handleContainerTap = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger if user was tapping a button, link, or input
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }

    const now = Date.now();
    if (now - lastTapTimeRef.current < 350) {
      nativeHaptics.tap(settings.soundEnabled);
      if (onOpenSmartSms) {
        onOpenSmartSms();
      }
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const variants = isReduced ? reducedCardVariants : cardVariants;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onTouchEnd={handleContainerTap}
      onDoubleClick={() => onOpenSmartSms && onOpenSmartSms()}
      className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar"
    >
      {/* Top Header Row */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="flex items-center justify-between pt-1"
      >
        <div className="flex items-center gap-2.5">
          <HalalaQirshLogo size="sm" isEnglish={isEn} />
          <div>
            <span className="text-[11px] font-semibold text-[#8E8E93] flex items-center gap-1.5 leading-none">
              <Calendar size={12} className="text-emerald-600 dark:text-emerald-400" />
              <span>{t.monthlyBudgetTitle} {monthFormatted}</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight mt-0.5 leading-tight">
              {t.appTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Smart Bank SMS Quick Trigger */}
          {onOpenSmartSms && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                onOpenSmartSms();
              }}
              className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-emerald-50/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isEn ? 'Smart Bank SMS Import (or Double-Tap screen)' : 'استيراد رسالة بنكية ذكي (أو اضغط مرتين على الشاشة)'}
            >
              <Sparkles size={15} className="text-emerald-500 animate-pulse" />
              <span className="hidden xs:inline">{isEn ? 'Bank SMS' : 'رسالة بنكية'}</span>
            </motion.button>
          )}

          {/* Hide/Show Eye Toggle */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleToggleHideAmounts}
            className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isHidden ? (isEn ? 'Show amounts' : 'إظهار المبالغ') : (isEn ? 'Hide amounts' : 'إخفاء المبالغ')}
            title={isHidden ? (isEn ? 'Show amounts' : 'إظهار المبالغ') : (isEn ? 'Hide amounts' : 'إخفاء المبالغ')}
          >
            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </motion.button>

          {/* Manage Categories & Limits */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              nativeHaptics.tap(settings.soundEnabled);
              onOpenCategoryManager();
            }}
            className="p-2.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isEn ? 'Manage Categories & Limits' : 'تعديل الميزانية والتصنيفات'}
          >
            <Sliders size={15} />
            <span className="hidden xs:inline">{t.categoriesBtn}</span>
          </motion.button>
        </div>
      </motion.div>

      {/* SIGNATURE HERO CARD: Emerald Gradient + SVG Texture + White Text + 28px Radius */}
      <motion.div
        custom={1}
        initial="hidden"
        animate="visible"
        variants={variants}
        style={{ transform: heroParallaxTransform, willChange: 'transform' }}
        className="hero-card-emerald p-5 md:p-6 text-white relative select-none"
      >
        <div className="relative z-10 space-y-4">
          {/* Hero Top Tag */}
          <div className="flex items-center justify-between text-xs text-emerald-100 font-semibold">
            <span className="flex items-center gap-1.5 opacity-90">
              <Sparkles size={14} className="text-emerald-300" />
              <span>{isEn ? 'Monthly Available Balance' : 'المتبقي من ميزانية الشهر'}</span>
            </span>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
              {remainingDays} {isEn ? 'days left' : 'يوم متبقي'}
            </span>
          </div>

          {/* Giant Remaining Counter */}
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div ref={remainingTargetRef}>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-xs flex items-baseline gap-2">
                <AnimatedCounter
                  value={remainingBudget}
                  formatFn={(val) => formatMoney(val, settings.currency, lang)}
                  durationMs={700}
                  isReduced={isReduced}
                  isHidden={isHidden}
                  className="tabular-nums"
                />
              </div>
              <div className="text-xs text-emerald-100/85 mt-1 font-medium">
                {isDanger
                  ? (isEn ? 'Exceeded overall monthly budget' : 'تم تجاوز إجمالي ميزانية الشهر')
                  : isWarning
                  ? (isEn ? 'Approaching monthly budget threshold' : 'اقتربت من بلوغ حد الميزانية')
                  : (isEn ? 'Spending is in the healthy zone' : 'معدل الإنفاق في النطاق الآمن')}
              </div>
            </div>

            {/* Circular Gauge embedded in Hero */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="11"
                  fill="transparent"
                />
                <motion.circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke={isDanger ? '#F87171' : isWarning ? '#FBBF24' : '#6EE7B7'}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  initial={isReduced ? { strokeDashoffset } : { strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={springs.smooth}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-white tabular-nums">
                  {percentageSpent}%
                </span>
                <span className="text-[9px] font-bold text-emerald-200 uppercase tracking-wider">
                  {isEn ? 'Spent' : 'مستهلك'}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Spring Progress Bar: GPU Transform only via scaleX */}
          <div className="space-y-1.5 pt-1">
            <div
              role="progressbar"
              aria-valuenow={Math.min(percentageSpent, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden relative"
            >
              <motion.div
                initial={{ scaleX: isReduced ? progressRatio : 0 }}
                animate={{ scaleX: progressRatio }}
                style={{ transformOrigin: isRTL ? 'right' : 'left' }}
                transition={springs.smooth}
                className={`w-full h-full rounded-full transition-colors duration-500 ${
                  isDanger
                    ? 'bg-red-400'
                    : isWarning
                    ? 'bg-amber-300'
                    : 'bg-emerald-300'
                }`}
              />
            </div>
          </div>

          {/* Hero Bottom Mini Stats Grid (No backdrop-blur on moving hero card) */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-xs">
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[11px] text-emerald-100 block opacity-85">
                {isEn ? 'Total Budget' : 'الميزانية الكلية'}
              </span>
              <div className="text-sm font-extrabold text-white mt-0.5">
                <Amount
                  value={totalBudget}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="tabular-nums"
                />
              </div>
            </div>

            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[11px] text-emerald-100 block opacity-85">
                {isEn ? 'Actual Spent' : 'المصروف الفعلي'}
              </span>
              <div className="text-sm font-extrabold text-white mt-0.5">
                <Amount
                  value={totalSpent}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Suggested Daily Spending Card inside Hero */}
          <div className="px-3 py-2 rounded-xl bg-black/15 flex items-center justify-between text-xs">
            <span className="text-emerald-100 font-medium">
              {isEn ? 'Daily target spend:' : 'معدل الصرف اليومي المتاح:'}
            </span>
            <span className="font-extrabold text-white tabular-nums">
              {isHidden ? (
                '••••••'
              ) : (
                <>
                  <Amount
                    value={dailySuggestedSpend}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={false}
                  />{' '}
                  / {isEn ? 'day' : 'يوم'}
                </>
              )}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Navigation Buttons */}
      <motion.div
        custom={2}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="grid grid-cols-3 gap-2.5"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenAddExpense();
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white flex flex-col items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus size={18} strokeWidth={2.8} />
          </div>
          <span className="text-xs font-bold">{t.recordExpense}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onNavigateToTab('bills_groceries');
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/15 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center gap-1.5 shadow-2xs hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
          <span className="text-xs font-bold">{t.groceryShortage}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onNavigateToTab('budgets');
          }}
          className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/15 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center gap-1.5 shadow-2xs hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <span className="text-xs font-bold">{t.budgetEnvelopes}</span>
        </motion.button>
      </motion.div>

      {/* Warnings & Alerts */}
      {(overBudgetCategories.length > 0 || urgentBills.length > 0) && (
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={variants}
          className="space-y-2"
        >
          {overBudgetCategories.map((cat) => {
            const spent = categorySpendMap.get(cat.id) || 0;
            const diff = spent - cat.monthlyLimit;
            return (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 flex items-center justify-between gap-3 text-red-700 dark:text-red-300"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={18} className="shrink-0 text-red-500" />
                  <div className="text-xs">
                    <span className="font-bold">
                      {isEn ? `Budget exceeded for ${cat.nameEn || cat.name}!` : `تجاوز ميزانية ${cat.name}!`}
                    </span>
                    <div className="text-[11px] opacity-85 tabular-nums">
                      {isHidden ? (
                        '••••••'
                      ) : isEn ? (
                        `Spent: ${spent} ${settings.currency} (Limit: ${cat.monthlyLimit} - Over: +${diff})`
                      ) : (
                        `المصروف: ${spent} ${settings.currency} (الحد: ${cat.monthlyLimit} - زيادة ${diff})`
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToTab('budgets')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shrink-0 cursor-pointer"
                >
                  {isEn ? 'Details' : 'تفاصيل'}
                </button>
              </div>
            );
          })}

          {urgentBills.map((b) => (
            <div
              key={b.id}
              className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{isEn ? 'Bill due soon' : 'فاتورة تستحق السداد قريباً'}</span>
                    {b.reminderEnabled !== false && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Bell size={10} /> {isEn ? 'Scheduled' : 'مجدولة'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-85">
                    {b.title} ({isHidden ? '••••••' : formatMoney(b.amount, settings.currency, lang)}) - {isEn ? `Day ${b.dueDay}` : `يوم ${b.dueDay} من الشهر`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('bills_groceries')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer"
              >
                {isEn ? 'Pay' : 'سداد'}
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* KPI Cards Strip */}
      <motion.div
        custom={4}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="grid grid-cols-2 gap-2.5"
      >
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/15 dark:border-slate-800 shadow-[0_4px_16px_rgba(16,185,129,0.05)] dark:shadow-none">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#5C8271] dark:text-[#8E8E93] font-medium">
              {isEn ? "Today's Spent" : 'مصاريف اليوم'}
            </span>
            <TrendingDown size={14} className="text-emerald-500" />
          </div>
          <div className="text-lg font-extrabold text-[#0B2319] dark:text-white tabular-nums">
            <Amount
              value={todaySpent}
              currency={settings.currency}
              lang={lang}
              hideAmounts={isHidden}
            />
          </div>
          <span className="text-[10px] text-[#5C8271] dark:text-[#8E8E93]">
            {isEn ? `${todayExpenses.length} transactions` : `${todayExpenses.length} عمليات مسجلة`}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/15 dark:border-slate-800 shadow-[0_4px_16px_rgba(16,185,129,0.05)] dark:shadow-none">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[#5C8271] dark:text-[#8E8E93] font-medium">
              {isEn ? 'Unpaid Bills' : 'فواتير متبقية'}
            </span>
            <CheckCircle2 size={14} className="text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-[#0B2319] dark:text-white tabular-nums">
            {unpaidBills.length} {isEn ? 'bills' : 'فواتير'}
          </div>
          <span className="text-[10px] text-[#5C8271] dark:text-[#8E8E93]">
            {isEn ? 'Total: ' : 'بإجمالي '}
            <Amount
              value={unpaidBills.reduce((s, b) => s + b.amount, 0)}
              currency={settings.currency}
              lang={lang}
              hideAmounts={isHidden}
            />
          </span>
        </div>
      </motion.div>

      {/* Recent Household Transactions */}
      <motion.div
        custom={5}
        initial="hidden"
        animate="visible"
        variants={variants}
        className="space-y-2 pb-4"
      >
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#0B2319] dark:text-white">
            {isEn ? 'Recent Expenses' : 'آخر نفقات المنزل'}
          </h2>
          <button
            onClick={() => onNavigateToTab('expenses')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline cursor-pointer"
          >
            <span>{isEn ? 'View all' : 'عرض الكل'}</span>
            {isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-emerald-500/15 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-[0_4px_16px_rgba(16,185,129,0.05)] dark:shadow-none">
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
                    color={cat?.color || '#10B981'}
                    bgColor={cat?.bgColor}
                    size="md"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {exp.title}
                    </div>
                    <div className="text-[11px] text-[#8E8E93] flex items-center gap-1.5">
                      <span>{isEn ? (cat?.nameEn || cat?.name || 'General') : (cat?.name || 'تصنيف عام')}</span>
                      <span>·</span>
                      <span>{exp.payer}</span>
                      <span>·</span>
                      <span>{exp.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <Amount
                    value={exp.amount}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                    prefix="-"
                    className="text-xs font-extrabold text-[#1C1C1E] dark:text-white"
                  />
                </div>
              </div>
            );
          })}

          {monthlyExpenses.length === 0 && (
            <div className="p-7 text-center space-y-2">
              <motion.div
                animate={isReduced ? {} : { y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center"
              >
                <Wallet size={22} />
              </motion.div>
              <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {isEn ? 'No expenses recorded this month' : 'لا توجد مصاريف مسجلة لهذا الشهر'}
              </div>
              <p className="text-[11px] text-[#8E8E93] max-w-xs mx-auto">
                {isEn ? 'Tap the + button below to log your first household expense.' : 'اضغط على زر "+" لتسجيل أول مصروف للبيت.'}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
