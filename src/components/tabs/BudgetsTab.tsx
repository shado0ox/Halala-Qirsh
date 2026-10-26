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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, BudgetSettings } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { AnimatedCounter } from '../AnimatedCounter';
import { springs, fades, useMotionConfig } from '../../utils/motion';

interface BudgetsTabProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
  onUpdateCategoryLimit: (categoryId: string, newLimit: number) => void;
  onOpenCategoryManager: () => void;
}

export const BudgetsTab: React.FC<BudgetsTabProps> = ({
  categories,
  expenses,
  settings,
  onUpdateSettings,
  onUpdateCategoryLimit,
  onOpenCategoryManager,
}) => {
  const currentMonth = settings.selectedMonth;
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isEn = settings.language === 'en';

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

  // Selected Category Detail state
  const [selectedDetailCat, setSelectedDetailCat] = useState<Category | null>(null);

  // Inline editing category limit
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState<string>('');

  // Editing overall custom total budget
  const [isEditingTotalCustom, setIsEditingTotalCustom] = useState<boolean>(false);
  const [customTotalInput, setCustomTotalInput] = useState<string>(
    String(settings.totalMonthlyBudget)
  );

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

  const handleSaveTotalCustom = () => {
    const val = parseFloat(customTotalInput);
    if (!isNaN(val) && val > 0) {
      nativeHaptics.success(settings.soundEnabled);
      onUpdateSettings({ totalMonthlyBudget: val });
    }
    setIsEditingTotalCustom(false);
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
            {isEn ? 'Budgets & Envelopes' : 'الميزانية وأظرف النفقات'}
          </h1>
          <span className="text-xs text-[#8E8E93] font-medium">
            {isEn ? `${categories.length} active budget envelopes` : `${categories.length} أظرف نفقات مفعلة`}
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
                  : (isEn ? 'Sum of category envelopes' : 'مجموع أظرف التصنيفات')}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block tabular-nums">
              {totalPercent}% {isEn ? 'used' : 'مستهلك'}
            </span>
            <span className="text-lg font-black text-[#1C1C1E] dark:text-white tabular-nums">
              {formatMoney(effectiveTotalBudget, settings.currency)}
            </span>
          </div>
        </div>

        {/* Spend Stats Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] text-xs">
          <div>
            <span className="text-[11px] text-[#8E8E93] block">{isEn ? 'Actual Spent' : 'المصروف الفعلي'}</span>
            <span className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
              {formatMoney(totalActualSpent, settings.currency)}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#8E8E93] block">
              {totalRemaining >= 0 ? (isEn ? 'Remaining' : 'المتبقي للتوفير') : (isEn ? 'Over Budget' : 'تجاوز الميزانية')}
            </span>
            <span
              className={`text-sm font-extrabold tabular-nums ${
                totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}
            >
              {formatMoney(Math.abs(totalRemaining), settings.currency)}
            </span>
          </div>
        </div>

        {/* Total Progress Bar with Smooth Color Transition */}
        <div className="space-y-1 pt-1">
          <div className="w-full h-3 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
            <motion.div
              initial={isReduced ? { width: `${Math.min(totalPercent, 100)}%` } : { width: '0%' }}
              animate={{ width: `${Math.min(totalPercent, 100)}%` }}
              transition={springs.smooth}
              className={`h-full rounded-full transition-colors duration-500 ${
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
            <span>{isEn ? `Cap: ${formatMoney(effectiveTotalBudget, settings.currency)}` : `الحد: ${formatMoney(effectiveTotalBudget, settings.currency)}`}</span>
          </div>
        </div>
      </div>

      {/* CATEGORY ENVELOPES LIST */}
      <div className="space-y-2.5 pb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
            {isEn ? `Category Envelopes (${categories.length})` : `أظرف وميزانيات الفئات (${categories.length})`}
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
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon
                      iconName={cat.icon}
                      color={cat.color}
                      bgColor={cat.bgColor}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                          {isEn ? (cat.nameEn || cat.name) : cat.name}
                        </span>
                        {cat.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                            {isEn ? 'Custom' : 'مخصص'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8E8E93] tabular-nums">
                        {spent.toLocaleString()} {isEn ? 'of' : 'من'} {limit.toLocaleString()} {settings.currency}
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
                      title="تعديل الحد"
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

                {/* Progress Bar with Spring Fill & Attention Shake on 80%/100% */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
                    <motion.div
                      initial={isReduced ? { width: `${Math.min(percent, 100)}%` } : { width: '0%' }}
                      animate={{ width: `${Math.min(percent, 100)}%` }}
                      transition={springs.smooth}
                      className={`h-full rounded-full transition-colors duration-500 ${
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
                      {remaining >= 0
                        ? (isEn ? `Remaining: ${formatMoney(remaining, settings.currency)}` : `متبقي: ${formatMoney(remaining, settings.currency)}`)
                        : (isEn ? `Over by: +${formatMoney(Math.abs(remaining), settings.currency)}` : `تجاوز بـ: +${formatMoney(Math.abs(remaining), settings.currency)}`)}
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

      {/* CATEGORY 6-MONTH DETAIL MODAL WITH SVG CHART */}
      <AnimatePresence>
        {selectedDetailCat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailCat(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={springs.smooth}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <div className="flex items-center gap-2">
                  <CategoryIcon
                    iconName={selectedDetailCat.icon}
                    color={selectedDetailCat.color}
                    bgColor={selectedDetailCat.bgColor}
                    size="sm"
                  />
                  <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                    {isEn ? (selectedDetailCat.nameEn || selectedDetailCat.name) : selectedDetailCat.name}
                  </span>
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
                  <span className="text-[#8E8E93] block">{isEn ? 'Monthly Envelope Limit' : 'الحد الشهري للظرف'}</span>
                  <span className="text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
                    {formatMoney(selectedDetailCat.monthlyLimit, settings.currency)}
                  </span>
                </div>
                <button
                  onClick={() => handleStartEditCat(selectedDetailCat)}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#3A3A3C] text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-2xs cursor-pointer"
                >
                  {isEn ? 'Change Limit' : 'تعديل الحد'}
                </button>
              </div>

              {/* 6-Month Animated SVG Bar Chart */}
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
                    const isLimitCrossed = pt.spent > selectedDetailCat.monthlyLimit;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {pt.spent > 0 ? pt.spent : '0'}
                        </span>
                        <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-end">
                          <motion.div
                            initial={isReduced ? { height: `${heightPercent}%` } : { height: '0%' }}
                            animate={{ height: `${heightPercent}%` }}
                            transition={{ ...springs.smooth, delay: idx * 0.04 }}
                            className={`w-full rounded-t-md ${
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
    </div>
  );
};
