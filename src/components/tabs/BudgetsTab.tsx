import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Sliders,
  Plus,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Settings2,
  Edit2,
  Check,
  X,
  ChevronDown,
  BarChart3,
  Calendar,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Target,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, BudgetSettings } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { Amount } from '../Amount';
import { TotalBudgetModal } from '../TotalBudgetModal';
import { AnnualBudgetModal } from '../AnnualBudgetModal';
import { SegmentedControl } from '../SegmentedControl';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs, fades, useMotionConfig } from '../../utils/motion';

interface BudgetsTabProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
  onUpdateCategoryLimit: (categoryId: string, newLimit: number) => void;
  onBatchUpdateCategoryLimits?: (limits: Record<string, number>) => void;
  onOpenCategoryManager: () => void;
}

export const BudgetsTab: React.FC<BudgetsTabProps> = ({
  categories,
  expenses,
  settings,
  onUpdateSettings,
  onUpdateCategoryLimit,
  onBatchUpdateCategoryLimits,
  onOpenCategoryManager,
}) => {
  const currentMonth = settings.selectedMonth;
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isEn = settings.language === 'en';
  const isRTL = settings.language !== 'en';
  const lang = settings.language || 'ar';
  const isHidden = Boolean(settings.hideAmounts);

  const monthlyExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(currentMonth)),
    [expenses, currentMonth]
  );

  // Spending per category map
  const categorySpendMap = useMemo(() => {
    const map = new Map<string, number>();
    monthlyExpenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return map;
  }, [monthlyExpenses]);

  // Total sums
  const totalActualSpent = useMemo(
    () => monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthlyExpenses]
  );
  const sumOfCategoriesBudget = useMemo(
    () => categories.reduce((sum, c) => sum + c.monthlyLimit, 0),
    [categories]
  );

  const effectiveTotalBudget =
    settings.budgetMode === 'custom_total'
      ? settings.totalMonthlyBudget
      : sumOfCategoriesBudget;

  const totalRemaining = effectiveTotalBudget - totalActualSpent;
  const totalPercent =
    effectiveTotalBudget > 0
      ? Math.round((totalActualSpent / effectiveTotalBudget) * 100)
      : 0;
  const totalRatio = Math.min(totalPercent, 100) / 100;

  // Selected Category Detail state
  const [selectedDetailCat, setSelectedDetailCat] = useState<Category | null>(null);

  // Total Budget Modal state
  const [isTotalBudgetModalOpen, setIsTotalBudgetModalOpen] = useState<boolean>(false);

  const handleSaveTotalBudget = (
    mode: 'sum_categories' | 'custom_total',
    totalAmount: number,
    distributedLimits?: Record<string, number>
  ) => {
    onUpdateSettings({
      budgetMode: mode,
      totalMonthlyBudget: totalAmount,
    });

    if (distributedLimits) {
      if (onBatchUpdateCategoryLimits) {
        onBatchUpdateCategoryLimits(distributedLimits);
      } else {
        Object.entries(distributedLimits).forEach(([catId, limit]) => {
          onUpdateCategoryLimit(catId, limit);
        });
      }
    }
  };

  // Budget Period selector: 'monthly' | 'annual'
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Annual budget state
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const yr = parseInt(currentMonth.split('-')[0], 10);
    return isNaN(yr) ? currentYearNum : yr;
  });
  const [isAnnualBudgetModalOpen, setIsAnnualBudgetModalOpen] = useState<boolean>(false);

  // Effective Annual Budget
  const effectiveAnnualBudget = useMemo(() => {
    if (settings.annualBudget && settings.annualBudget > 0) {
      return settings.annualBudget;
    }
    return effectiveTotalBudget * 12;
  }, [settings.annualBudget, effectiveTotalBudget]);

  const handleSaveAnnualBudget = (newAmount: number) => {
    onUpdateSettings({
      annualBudget: newAmount,
    });
  };

  // Annual expenses for selected year
  const annualExpenses = useMemo(() => {
    const prefix = `${selectedYear}-`;
    return expenses.filter((e) => e.date.startsWith(prefix));
  }, [expenses, selectedYear]);

  const totalAnnualSpent = useMemo(
    () => annualExpenses.reduce((sum, e) => sum + e.amount, 0),
    [annualExpenses]
  );

  const annualRemaining = effectiveAnnualBudget - totalAnnualSpent;
  const annualPercent = effectiveAnnualBudget > 0 ? Math.round((totalAnnualSpent / effectiveAnnualBudget) * 100) : 0;
  const annualRatio = Math.min(annualPercent, 100) / 100;

  // Monthly breakdown for selected year (12 months)
  const annualMonthsData = useMemo(() => {
    const months = [];
    const targetMonthlyAverage = effectiveAnnualBudget / 12;
    const now = new Date();
    const isCurrentYear = selectedYear === now.getFullYear();
    const activeCurrentMonthIdx = now.getMonth(); // 0-indexed

    const monthLabelsAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const monthLabelsEn = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    for (let m = 0; m < 12; m++) {
      const monthPrefix = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
      const spent = annualExpenses
        .filter((e) => e.date.startsWith(monthPrefix))
        .reduce((sum, e) => sum + e.amount, 0);

      const isCurrent = isCurrentYear && m === activeCurrentMonthIdx;
      const isPastOrCurrent = !isCurrentYear || m <= activeCurrentMonthIdx;
      const pctOfAverage = targetMonthlyAverage > 0 ? Math.round((spent / targetMonthlyAverage) * 100) : 0;

      months.push({
        monthIndex: m,
        monthPrefix,
        label: isEn ? monthLabelsEn[m] : monthLabelsAr[m],
        spent,
        isCurrent,
        isPastOrCurrent,
        pctOfAverage,
        targetMonthlyAverage,
        isExceeded: spent > targetMonthlyAverage,
      });
    }
    return months;
  }, [annualExpenses, selectedYear, effectiveAnnualBudget, isEn]);

  // Year pace calculations
  const yearPaceStats = useMemo(() => {
    const now = new Date();
    const isCurrentYear = selectedYear === now.getFullYear();
    const isPastYear = selectedYear < now.getFullYear();

    if (isPastYear) {
      return {
        isCurrentYear: false,
        daysElapsed: 365,
        totalDays: 365,
        yearProgressPercent: 100,
        projectedTotal: totalAnnualSpent,
        isPaceWarning: totalAnnualSpent > effectiveAnnualBudget,
        paceMessage: isEn
          ? totalAnnualSpent > effectiveAnnualBudget
            ? 'Over budget in this completed year'
            : 'Year completed within budget'
          : totalAnnualSpent > effectiveAnnualBudget
          ? 'تم تجاوز الميزانية في هذا العام المنتهي'
          : 'انتهى العام ضمن حدود الميزانية المحددة بنجاح',
      };
    }

    if (!isCurrentYear) {
      return {
        isCurrentYear: false,
        daysElapsed: 0,
        totalDays: 365,
        yearProgressPercent: 0,
        projectedTotal: 0,
        isPaceWarning: false,
        paceMessage: isEn ? 'Upcoming planned year' : 'عام قادم مخطط له',
      };
    }

    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31);
    const totalDays = Math.round((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.max(1, Math.round((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
    const yearProgressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

    const projectedTotal = Math.round((totalAnnualSpent / daysElapsed) * totalDays);
    const isPaceWarning = projectedTotal > effectiveAnnualBudget && daysElapsed > 15;

    let paceMessage = '';
    if (totalAnnualSpent > effectiveAnnualBudget) {
      paceMessage = isEn ? 'Annual budget exceeded!' : 'تم تجاوز سقف الميزانية السنوية!';
    } else if (isPaceWarning) {
      paceMessage = isEn
        ? `At current daily pace, projected year-end spend is ${(projectedTotal).toLocaleString()} (${Math.round((projectedTotal / effectiveAnnualBudget) * 100)}%)`
        : `بالمعدل اليومي الحالي، الإنفاق التقديري لنهاية العام يصل إلى ${(projectedTotal).toLocaleString()} (${Math.round((projectedTotal / effectiveAnnualBudget) * 100)}% من الميزانية)`;
    } else {
      paceMessage = isEn
        ? `Great pace! Spending is healthy (${annualPercent}% used vs ${yearProgressPercent}% year elapsed)`
        : `أداء ممتاز! وتيرة الصرف متزنة (${annualPercent}% مستهلك مقابل انقضاء ${yearProgressPercent}% من أيام العام)`;
    }

    return {
      isCurrentYear: true,
      daysElapsed,
      totalDays,
      yearProgressPercent,
      projectedTotal,
      isPaceWarning,
      paceMessage,
    };
  }, [selectedYear, totalAnnualSpent, effectiveAnnualBudget, annualPercent, isEn]);

  // Annual spending by category
  const annualCategorySpend = useMemo(() => {
    return categories
      .map((cat) => {
        const spent = annualExpenses
          .filter((e) => e.categoryId === cat.id)
          .reduce((sum, e) => sum + e.amount, 0);
        const annualLimit = cat.monthlyLimit * 12;
        const pctOfTotal = totalAnnualSpent > 0 ? Math.round((spent / totalAnnualSpent) * 100) : 0;
        return {
          cat,
          spent,
          annualLimit,
          pctOfTotal,
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [categories, annualExpenses, totalAnnualSpent]);

  // Inline editing category limit
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState<string>('');

  const handleStartEditCat = (cat: Category, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    nativeHaptics.tap(settings.soundEnabled);
    setEditingCatId(cat.id);
    setEditingLimitValue(String(cat.monthlyLimit));
  };

  const handleSaveCatLimit = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const val = parseFloat(editingLimitValue);
    if (!isNaN(val) && val >= 0) {
      nativeHaptics.success(settings.soundEnabled);
      onUpdateCategoryLimit(catId, val);
    }
    setEditingCatId(null);
  };

  // 6-month historical spend for selected detail category
  const detailHistoricalData = useMemo(() => {
    if (!selectedDetailCat) return [];
    const points: { label: string; spent: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(isEn ? 'en-US' : 'ar-SA', { month: 'short' });
      const spent = expenses
        .filter((e) => e.categoryId === selectedDetailCat.id && e.date.startsWith(key))
        .reduce((sum, e) => sum + e.amount, 0);
      points.push({ label, spent });
    }
    return points;
  }, [selectedDetailCat, expenses, isEn]);

  const maxHistoricalSpend = useMemo(() => {
    const max = Math.max(...detailHistoricalData.map((d) => d.spent), selectedDetailCat?.monthlyLimit || 1);
    return max > 0 ? max : 1;
  }, [detailHistoricalData, selectedDetailCat]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Title & Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight">
            {isEn ? 'Budgets & Expense Categories' : 'الميزانية وبنود المصاريف'}
          </h1>
          <span className="text-xs text-[#8E8E93] font-medium">
            {isEn ? `${categories.length} active budget categories` : `${categories.length} بنود مصاريف مفعلة`}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenCategoryManager();
          }}
          className="p-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Sliders size={15} />
          <span className="hidden xs:inline">{isEn ? 'Manage' : 'إدارة الفئات'}</span>
        </motion.button>
      </div>

      {/* Budget Period Selector (Monthly vs Annual Tracker) */}
      <div className="pt-0.5">
        <SegmentedControl
          options={[
            { id: 'monthly', label: isEn ? 'Monthly Budget' : 'ميزانية الشهر' },
            { id: 'annual', label: isEn ? 'Annual Budget & Tracker' : 'الميزانية السنوية ومسار العام' },
          ]}
          value={budgetPeriod}
          onChange={(val) => {
            nativeHaptics.tap(settings.soundEnabled);
            setBudgetPeriod(val);
          }}
          soundEnabled={settings.soundEnabled}
          isReduced={isReduced}
          className="w-full"
        />
      </div>

      {budgetPeriod === 'monthly' ? (
        <>
          {/* OVERALL MONTHLY BUDGET CARD */}
          <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <span className="text-xs text-[#8E8E93] font-semibold block">
                    {isEn ? 'Monthly Budget Target' : 'إجمالي الميزانية المحددة'}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {settings.budgetMode === 'custom_total'
                      ? (isEn ? 'Custom fixed target' : 'ميزانية عامة موحدة')
                      : (isEn ? 'Sum of category budgets' : 'مجموع بنود التصنيفات')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block tabular-nums">
                  {totalPercent}% {isEn ? 'used' : 'مستهلك'}
                </span>
                <Amount
                  value={effectiveTotalBudget}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="text-lg font-black text-[#1C1C1E] dark:text-white tabular-nums block"
                />
              </div>
            </div>

            {/* Spend Stats Row */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] text-xs">
              <div>
                <span className="text-[11px] text-[#8E8E93] block">{isEn ? 'Actual Spent' : 'المصروف الفعلي'}</span>
                <Amount
                  value={totalActualSpent}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums block mt-0.5"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#8E8E93] block">
                  {totalRemaining >= 0 ? (isEn ? 'Remaining' : 'المتبقي للتوفير') : (isEn ? 'Over Budget' : 'تجاوز الميزانية')}
                </span>
                <Amount
                  value={Math.abs(totalRemaining)}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  prefix={totalRemaining < 0 ? '+' : ''}
                  className={`text-sm font-extrabold tabular-nums block mt-0.5 ${
                    totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                />
              </div>
            </div>

            {/* Total Progress Bar: GPU Transform only via scaleX */}
            <div className="space-y-1 pt-1">
              <div
                role="progressbar"
                aria-valuenow={Math.min(totalPercent, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-3 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden"
              >
                <motion.div
                  initial={{ scaleX: isReduced ? totalRatio : 0 }}
                  animate={{ scaleX: totalRatio }}
                  style={{ transformOrigin: isRTL ? 'right' : 'left' }}
                  transition={springs.smooth}
                  className={`w-full h-full rounded-full transition-colors duration-500 ${
                    totalPercent >= 100
                      ? 'bg-red-500'
                      : totalPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8E8E93] font-semibold">
                <span>0</span>
                <span>
                  {isEn ? 'Cap: ' : 'الحد: '}
                  <Amount
                    value={effectiveTotalBudget}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                  />
                </span>
              </div>
            </div>

            {/* Set / Auto-Distribute Total Budget Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setIsTotalBudgetModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 dark:hover:from-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-2 border border-emerald-500/25 transition-all cursor-pointer shadow-2xs mt-2"
            >
              <Edit2 size={13} />
              <span>
                {isEn ? 'Set Total Budget & Auto-Distribute' : 'تحديد الميزانية الإجمالية وتوزيعها بنقرة واحدة'}
              </span>
            </motion.button>

            {/* Quick Annual Glance Link */}
            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setBudgetPeriod('annual');
              }}
              className="w-full pt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CalendarRange size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {isEn
                  ? `Annual Target: ${annualPercent}% used in ${selectedYear} · View annual track`
                  : `ميزانية السنة: ${annualPercent}% مستهلك لعام ${selectedYear} · عرض المسار السنوي`}
              </span>
              <ArrowUpRight size={12} />
            </button>
          </div>

          {/* CATEGORY ENVELOPES LIST */}
          <div className="space-y-2.5 pb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
            {isEn ? `Category Budgets (${categories.length})` : `بنود وميزانيات الفئات (${categories.length})`}
          </h2>
          <span className="text-xs text-[#8E8E93]">
            {isEn ? 'Tap to view 6-month trends' : 'اضغط على الفئة لعرض التحليل'}
          </span>
        </div>

        <div className="space-y-2.5">
          {categories.map((cat) => {
            const spent = categorySpendMap.get(cat.id) || 0;
            const limit = cat.monthlyLimit;
            const remaining = limit - spent;
            const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
            const isOver = percent > 100;
            const isNear = percent >= 80 && !isOver;
            const isEditing = editingCatId === cat.id;

            return (
              <motion.div
                key={cat.id}
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  nativeHaptics.tap(settings.soundEnabled);
                  setSelectedDetailCat(cat);
                }}
                className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-500/40 transition-colors"
              >
                {/* Header row with shared element layoutId */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <motion.div layoutId={isReduced ? undefined : `budget-cat-icon-${cat.id}`}>
                      <CategoryIcon
                        iconName={cat.icon}
                        color={cat.color}
                        bgColor={cat.bgColor}
                        size="md"
                      />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <motion.span
                          layoutId={isReduced ? undefined : `budget-cat-name-${cat.id}`}
                          className="text-xs font-bold text-[#1C1C1E] dark:text-white"
                        >
                          {isEn ? (cat.nameEn || cat.name) : cat.name}
                        </motion.span>
                        {cat.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                            {isEn ? 'Custom' : 'مخصص'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8E8E93] tabular-nums flex items-center gap-1">
                        <Amount
                          value={spent}
                          currency={settings.currency}
                          lang={lang}
                          hideAmounts={isHidden}
                        />
                        <span>{isEn ? 'of' : 'من'}</span>
                        <Amount
                          value={limit}
                          currency={settings.currency}
                          lang={lang}
                          hideAmounts={isHidden}
                        />
                      </span>
                    </div>
                  </div>

                  {/* Status badge & Quick edit */}
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={isOver ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 0.6, repeat: isOver ? 1 : 0 }}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg tabular-nums ${
                        isOver
                          ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300'
                          : isNear
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {percent}%
                    </motion.span>

                    <button
                      onClick={(e) => handleStartEditCat(cat, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      title={isEn ? 'Edit Limit' : 'تعديل الحد'}
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Inline Edit Input if active */}
                {isEditing && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-semibold text-[#8E8E93] shrink-0">
                      {isEn ? 'Set limit:' : 'تحديد الحد:'}
                    </span>
                    <input
                      type="number"
                      value={editingLimitValue}
                      onChange={(e) => setEditingLimitValue(e.target.value)}
                      className="w-24 px-2 py-1 bg-white dark:bg-[#1C1C1E] rounded-lg text-xs font-bold text-[#1C1C1E] dark:text-white border border-slate-300 dark:border-slate-700 outline-hidden tabular-nums"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleSaveCatLimit(cat.id, e)}
                        className="p-1 rounded-md bg-emerald-600 text-white cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCatId(null);
                        }}
                        className="p-1 rounded-md bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar: GPU Transform via scaleX */}
                <div className="space-y-1">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(percent, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full h-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden"
                  >
                    <motion.div
                      initial={{ scaleX: isReduced ? ratio : 0 }}
                      animate={{ scaleX: ratio }}
                      style={{ transformOrigin: isRTL ? 'right' : 'left' }}
                      transition={springs.smooth}
                      className={`w-full h-full rounded-full transition-colors duration-500 ${
                        isOver
                          ? 'bg-red-500'
                          : isNear
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8E8E93]">
                    <span>
                      {remaining >= 0 ? (
                        <>
                          {isEn ? 'Remaining: ' : 'متبقي: '}
                          <Amount
                            value={remaining}
                            currency={settings.currency}
                            lang={lang}
                            hideAmounts={isHidden}
                          />
                        </>
                      ) : (
                        <>
                          {isEn ? 'Over by: +' : 'تجاوز بـ: +'}
                          <Amount
                            value={Math.abs(remaining)}
                            currency={settings.currency}
                            lang={lang}
                            hideAmounts={isHidden}
                          />
                        </>
                      )}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isEn ? '6-mo trend →' : 'التحليل الشهري ←'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-4 pb-6">
          {/* Year Navigator */}
          <div className="flex items-center justify-between bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setSelectedYear((y) => y - 1);
              }}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isEn ? 'Previous Year' : 'العام السابق'}
            >
              <ChevronRight size={18} className={isRTL ? '' : 'rotate-180'} />
            </button>

            <div className="flex items-center gap-2">
              <CalendarRange size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-base font-black text-slate-900 dark:text-white">
                {isEn ? `Year ${selectedYear}` : `ميزانية عام ${selectedYear}`}
              </span>
              {selectedYear !== currentYearNum && (
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.tap(settings.soundEnabled);
                    setSelectedYear(currentYearNum);
                  }}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 cursor-pointer"
                >
                  {isEn ? 'Current Year' : 'هذا العام'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setSelectedYear((y) => y + 1);
              }}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isEn ? 'Next Year' : 'العام القادم'}
            >
              <ChevronLeft size={18} className={isRTL ? '' : 'rotate-180'} />
            </button>
          </div>

          {/* OVERALL ANNUAL BUDGET CARD */}
          <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CalendarRange size={20} />
                </div>
                <div>
                  <span className="text-xs text-[#8E8E93] font-semibold block">
                    {isEn ? 'Total Annual Budget' : 'الميزانية السنوية الإجمالية'}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {settings.annualBudget
                      ? (isEn ? 'Custom Annual Target' : 'ميزانية سنوية مخصصة')
                      : (isEn ? 'Derived: 12 × Monthly' : 'محسوبة تلقائياً: 12 × الشهرية')}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block tabular-nums">
                  {annualPercent}% {isEn ? 'used' : 'مستهلك'}
                </span>
                <Amount
                  value={effectiveAnnualBudget}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="text-lg font-black text-[#1C1C1E] dark:text-white tabular-nums block"
                />
              </div>
            </div>

            {/* 4-Stat Metric Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] text-xs">
              <div className="p-3 rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/40">
                <span className="text-[11px] text-[#8E8E93] block">{isEn ? 'Total Spent This Year' : 'المصروف الفعلي للعام'}</span>
                <Amount
                  value={totalAnnualSpent}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums block mt-0.5"
                />
              </div>
              <div className="p-3 rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/40">
                <span className="text-[11px] text-[#8E8E93] block">
                  {annualRemaining >= 0 ? (isEn ? 'Remaining in Year' : 'المتبقي للتوفير بالعام') : (isEn ? 'Over Annual Budget' : 'تجاوز الميزانية السنوية')}
                </span>
                <Amount
                  value={Math.abs(annualRemaining)}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  prefix={annualRemaining < 0 ? '+' : ''}
                  className={`text-sm font-extrabold tabular-nums block mt-0.5 ${
                    annualRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                />
              </div>
              <div className="p-3 rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/40">
                <span className="text-[11px] text-[#8E8E93] block">{isEn ? 'Monthly Target Average' : 'المتوسط الشهري المستهدف'}</span>
                <Amount
                  value={Math.round(effectiveAnnualBudget / 12)}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums block mt-0.5"
                />
              </div>
              <div className="p-3 rounded-2xl bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/40">
                <span className="text-[11px] text-[#8E8E93] block">{isEn ? 'Projected Year-End' : 'التقديري لنهاية العام'}</span>
                <Amount
                  value={yearPaceStats.projectedTotal}
                  currency={settings.currency}
                  lang={lang}
                  hideAmounts={isHidden}
                  className={`text-xs font-bold tabular-nums block mt-0.5 ${
                    yearPaceStats.isPaceWarning ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Annual Progress Bar */}
            <div className="space-y-1 pt-1">
              <div
                role="progressbar"
                aria-valuenow={Math.min(annualPercent, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-3 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden"
              >
                <motion.div
                  initial={{ scaleX: isReduced ? annualRatio : 0 }}
                  animate={{ scaleX: annualRatio }}
                  style={{ transformOrigin: isRTL ? 'right' : 'left' }}
                  transition={springs.smooth}
                  className={`w-full h-full rounded-full transition-colors duration-500 ${
                    annualPercent >= 100
                      ? 'bg-red-500'
                      : annualPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8E8E93] font-semibold">
                <span>0</span>
                <span>
                  {isEn ? 'Annual Cap: ' : 'سقف العام: '}
                  <Amount
                    value={effectiveAnnualBudget}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                  />
                </span>
              </div>
            </div>

            {/* Smart Pace Insight Banner */}
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
              yearPaceStats.isPaceWarning
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            }`}>
              <div className="shrink-0">
                {yearPaceStats.isPaceWarning ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
              </div>
              <span className="text-[11px] font-semibold leading-relaxed">
                {yearPaceStats.paceMessage}
              </span>
            </div>

            {/* Edit Annual Budget Target Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setIsAnnualBudgetModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 dark:hover:from-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-2 border border-emerald-500/25 transition-all cursor-pointer shadow-2xs"
            >
              <Edit2 size={13} />
              <span>{isEn ? 'Set / Edit Annual Budget Target' : 'تحديد / تعديل الميزانية السنوية الإجمالية'}</span>
            </motion.button>
          </div>

          {/* 12-Month Year Progress Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                <BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? `Monthly Spending Across ${selectedYear}` : `مسار الصرف عبر شهور عام ${selectedYear}`}</span>
              </h2>
              <span className="text-[11px] text-[#8E8E93]">
                {isEn ? 'Target avg / mo' : 'مقارنة بالمتوسط الشهري'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {annualMonthsData.map((m) => {
                const isOver = m.isExceeded;
                return (
                  <div
                    key={m.monthPrefix}
                    className={`p-3 rounded-2xl border transition-all ${
                      m.isCurrent
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'bg-white dark:bg-[#1C1C1E] border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {m.label}
                      </span>
                      {m.isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-emerald-600 text-white">
                          {isEn ? 'Current' : 'الحالي'}
                        </span>
                      )}
                    </div>

                    <Amount
                      value={m.spent}
                      currency={settings.currency}
                      lang={lang}
                      hideAmounts={isHidden}
                      className={`text-xs font-black block tabular-nums ${
                        isOver ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                      }`}
                    />

                    {/* Micro bar comparing with target monthly average */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
                      <div
                        style={{ width: `${Math.min(m.pctOfAverage, 100)}%` }}
                        className={`h-full rounded-full transition-all ${
                          isOver ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-[#8E8E93] mt-1 font-semibold tabular-nums">
                      <span>{m.pctOfAverage}% {isEn ? 'of target' : 'من المستهدف'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Annual Spend by Category */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                <PieChart size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>{isEn ? `Annual Spend by Category (${selectedYear})` : `توزيع نفقات عام ${selectedYear} على الفئات`}</span>
              </h2>
              <span className="text-xs text-[#8E8E93]">
                {isEn ? 'Ranked by spend' : 'مرتبة حسب الأكثر إنفاقاً'}
              </span>
            </div>

            <div className="space-y-2">
              {annualCategorySpend.map(({ cat, spent, annualLimit, pctOfTotal }) => {
                const isOver = annualLimit > 0 && spent > annualLimit;
                const catRatio = annualLimit > 0 ? Math.min(spent / annualLimit, 1) : 0;
                return (
                  <div
                    key={cat.id}
                    className="bg-white dark:bg-[#1C1C1E] p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon
                          iconName={cat.icon}
                          color={cat.color}
                          bgColor={cat.bgColor}
                          size="sm"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">
                            {isEn ? cat.nameEn || cat.name : cat.name}
                          </span>
                          <span className="text-[10px] text-[#8E8E93]">
                            {pctOfTotal}% {isEn ? 'of annual spend' : 'من إجمالي مصروفات العام'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <Amount
                          value={spent}
                          currency={settings.currency}
                          lang={lang}
                          hideAmounts={isHidden}
                          className="text-xs font-black text-slate-900 dark:text-white block tabular-nums"
                        />
                        <span className="text-[10px] text-[#8E8E93] tabular-nums">
                          {isEn ? 'Cap: ' : 'الهدف: '}
                          <Amount
                            value={annualLimit}
                            currency={settings.currency}
                            lang={lang}
                            hideAmounts={isHidden}
                          />
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(catRatio * 100, 100)}%` }}
                        className={`h-full rounded-full ${
                          isOver ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 6-MONTH DETAIL MODAL WITH GPU-ACCELERATED SCALE-Y CHART */}
      <AnimatePresence>
        {selectedDetailCat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailCat(null)}
              className="absolute inset-0 bg-black/55"
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={springs.smooth}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              {/* Header with shared element layoutId */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center gap-2">
                  <motion.div layoutId={isReduced ? undefined : `budget-cat-icon-${selectedDetailCat.id}`}>
                    <CategoryIcon
                      iconName={selectedDetailCat.icon}
                      color={selectedDetailCat.color}
                      bgColor={selectedDetailCat.bgColor}
                      size="sm"
                    />
                  </motion.div>
                  <motion.span
                    layoutId={isReduced ? undefined : `budget-cat-name-${selectedDetailCat.id}`}
                    className="text-sm font-bold text-[#1C1C1E] dark:text-white"
                  >
                    {isEn ? (selectedDetailCat.nameEn || selectedDetailCat.name) : selectedDetailCat.name}
                  </motion.span>
                </div>

                <button
                  onClick={() => setSelectedDetailCat(null)}
                  className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Monthly Limit Info */}
              <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#8E8E93] block">{isEn ? 'Monthly Limit' : 'الحد الشهري للبند'}</span>
                  <Amount
                    value={selectedDetailCat.monthlyLimit}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                    className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums block mt-0.5"
                  />
                </div>
                <button
                  onClick={() => handleStartEditCat(selectedDetailCat)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#3A3A3C] text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-2xs cursor-pointer"
                >
                  {isEn ? 'Change Limit' : 'تعديل الحد'}
                </button>
              </div>

              {/* 6-Month Animated SVG Bar Chart using GPU transform scaleY */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-emerald-500" />
                    <span>{isEn ? 'Spending Trend (Last 6 Months)' : 'معدل الإنفاق (آخر 6 أشهر)'}</span>
                  </span>
                </div>

                <div className="h-32 w-full pt-3 flex items-end justify-between gap-2 px-1 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                  {detailHistoricalData.map((pt, idx) => {
                    const heightPercent = Math.min(Math.round((pt.spent / maxHistoricalSpend) * 100), 100);
                    const scaleYRatio = heightPercent / 100;
                    const isLimitCrossed = pt.spent > selectedDetailCat.monthlyLimit;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {isHidden ? '•••' : (pt.spent > 0 ? pt.spent : '0')}
                        </span>
                        <div
                          role="progressbar"
                          aria-valuenow={heightPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-end"
                        >
                          <motion.div
                            initial={{ scaleY: isReduced ? scaleYRatio : 0 }}
                            animate={{ scaleY: scaleYRatio }}
                            style={{ transformOrigin: 'bottom' }}
                            transition={{ ...springs.smooth, delay: isReduced ? 0 : idx * 0.04 }}
                            className={`w-full h-full rounded-t-md ${
                              isLimitCrossed ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[#8E8E93] truncate">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedDetailCat(null)}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {isEn ? 'Done' : 'تم'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Total Budget Modal */}
      <TotalBudgetModal
        isOpen={isTotalBudgetModalOpen}
        onClose={() => setIsTotalBudgetModalOpen(false)}
        categories={categories}
        settings={settings}
        currency={settings.currency}
        onSaveTotalBudget={handleSaveTotalBudget}
        soundEnabled={settings.soundEnabled}
        language={lang}
      />

      {/* Annual Budget Modal */}
      <AnnualBudgetModal
        isOpen={isAnnualBudgetModalOpen}
        onClose={() => setIsAnnualBudgetModalOpen(false)}
        currentAnnualBudget={effectiveAnnualBudget}
        monthlyBudget={effectiveTotalBudget}
        currency={settings.currency}
        onSave={handleSaveAnnualBudget}
        soundEnabled={settings.soundEnabled}
        language={lang}
      />
    </div>
  );
};
