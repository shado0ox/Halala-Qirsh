import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  X,
  Check,
  Sparkles,
  PieChart,
  Percent,
  Sliders,
  AlertCircle,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Category, BudgetSettings, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Amount } from './Amount';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';
import { handleModalBackdropClick, dismissKeyboard, useKeyboardState } from '../utils/keyboard';
import { KeyboardDismissButton } from './KeyboardDismissButton';

interface TotalBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  settings: BudgetSettings;
  currency: CurrencyCode;
  onSaveTotalBudget: (
    mode: 'sum_categories' | 'custom_total',
    totalAmount: number,
    distributedLimits?: Record<string, number>
  ) => void;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const TotalBudgetModal: React.FC<TotalBudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  settings,
  currency,
  onSaveTotalBudget,
  soundEnabled = true,
  language = 'ar',
}) => {
  const isEn = language === 'en';
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');
  const { isKeyboardOpen } = useKeyboardState();

  // Current category sum
  const currentCategoriesSum = useMemo(
    () => categories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0),
    [categories]
  );

  const initialAmount =
    settings.budgetMode === 'custom_total' && settings.totalMonthlyBudget > 0
      ? settings.totalMonthlyBudget
      : currentCategoriesSum > 0
      ? currentCategoriesSum
      : 5000;

  const [amountStr, setAmountStr] = useState<string>(String(initialAmount));
  const [budgetStrategy, setBudgetStrategy] = useState<'distribute_proportional' | 'distribute_equal' | 'unified_custom'>(
    settings.budgetMode === 'custom_total' ? 'unified_custom' : 'distribute_proportional'
  );
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const startVal =
        settings.budgetMode === 'custom_total' && settings.totalMonthlyBudget > 0
          ? settings.totalMonthlyBudget
          : currentCategoriesSum > 0
          ? currentCategoriesSum
          : 5000;
      setAmountStr(String(startVal));
      setBudgetStrategy(settings.budgetMode === 'custom_total' ? 'unified_custom' : 'distribute_proportional');
    }
  }, [isOpen, settings.budgetMode, settings.totalMonthlyBudget, currentCategoriesSum]);

  const parsedTotal = Math.max(0, parseFloat(amountStr) || 0);

  // Calculate live preview of category limits
  const calculatedCategoryLimits = useMemo(() => {
    if (budgetStrategy === 'unified_custom' || parsedTotal <= 0 || categories.length === 0) {
      return null;
    }

    const limits: Record<string, number> = {};
    if (budgetStrategy === 'distribute_equal') {
      const perCat = Math.floor(parsedTotal / categories.length);
      const remainder = parsedTotal - perCat * categories.length;
      categories.forEach((cat, idx) => {
        limits[cat.id] = perCat + (idx === 0 ? remainder : 0);
      });
    } else {
      // Proportional to current limits
      if (currentCategoriesSum > 0) {
        let accumulated = 0;
        categories.forEach((cat, idx) => {
          if (idx === categories.length - 1) {
            limits[cat.id] = Math.max(0, parsedTotal - accumulated);
          } else {
            const ratio = cat.monthlyLimit / currentCategoriesSum;
            const allocated = Math.round(ratio * parsedTotal);
            limits[cat.id] = allocated;
            accumulated += allocated;
          }
        });
      } else {
        // Fallback to equal split if current sum is 0
        const perCat = Math.floor(parsedTotal / categories.length);
        const remainder = parsedTotal - perCat * categories.length;
        categories.forEach((cat, idx) => {
          limits[cat.id] = perCat + (idx === 0 ? remainder : 0);
        });
      }
    }
    return limits;
  }, [budgetStrategy, parsedTotal, categories, currentCategoriesSum]);

  const handleQuickAdd = (delta: number) => {
    nativeHaptics.tap(soundEnabled);
    const curr = parseFloat(amountStr) || 0;
    setAmountStr(String(Math.max(0, curr + delta)));
  };

  const handleSave = () => {
    if (parsedTotal <= 0) return;
    nativeHaptics.success(soundEnabled);

    if (budgetStrategy === 'unified_custom') {
      onSaveTotalBudget('custom_total', parsedTotal);
    } else {
      onSaveTotalBudget('sum_categories', parsedTotal, calculatedCategoryLimits || undefined);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none">
        {/* Dimmed Backdrop (Dismisses keyboard first if open, or closes modal if keyboard is closed) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fades.fast}
          onClick={(e) => handleModalBackdropClick(e, onClose, soundEnabled)}
          className="absolute inset-0 bg-black/55 cursor-pointer"
        />

        {/* Modal / Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springs.smooth}
          onClick={(e) => {
            // Dismiss keyboard if clicking non-input empty space inside sheet
            const target = e.target as HTMLElement;
            if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
              dismissKeyboard();
            }
          }}
          className="relative w-full max-w-lg max-h-[92vh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border-t sm:border border-slate-200/50 dark:border-slate-800"
        >
          {/* Header Grabber (mobile sheet) */}
          <div className="w-full flex sm:hidden justify-center pt-3 pb-1 cursor-grab">
            <div className="w-11 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Set Total Monthly Budget' : 'تحديد إجمالي الميزانية الشهرية'}
                </h3>
                <span className="text-[10px] text-[#8E8E93] block">
                  {isEn ? 'Manage total spend in one step' : 'تحكم في سقف الصرف بخطوة واحدة دون عناء'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <KeyboardDismissButton
                visible={isKeyboardOpen}
                isEnglish={isEn}
                soundEnabled={soundEnabled}
              />
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar pb-[max(env(safe-area-inset-bottom),24px)]">
            {/* Amount Input Card */}
            <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4 rounded-3xl flex flex-col items-center justify-center text-center relative">
              <span className="text-xs text-[#8E8E93] font-semibold mb-1">
                {isEn ? 'Total Monthly Budget Target' : 'المبلغ الإجمالي للميزانية الشهرية'}
              </span>

              <div className="flex items-center justify-center gap-2 relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  autoFocus
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0"
                  className="text-3xl font-black text-[#1C1C1E] dark:text-white bg-transparent text-center outline-hidden border-b-2 border-emerald-500/40 focus:border-emerald-500 transition-colors py-1 tabular-nums max-w-[220px]"
                />
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}
                </span>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {[500, 1000, 2000, 5000].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => handleQuickAdd(add)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#3A3A3C] text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    +{add.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isEn ? 'How would you like to apply this budget?' : 'كيف تريد تطبيق هذه الميزانية؟'}
              </label>

              {/* Strategy Option 1: Proportional Auto-Distribution */}
              <div
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setBudgetStrategy('distribute_proportional');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  budgetStrategy === 'distribute_proportional'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-[#2C2C2E]/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                    budgetStrategy === 'distribute_proportional'
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {budgetStrategy === 'distribute_proportional' && <Check size={12} className="stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {isEn ? 'Auto-Distribute to Categories (Recommended)' : 'توزيع تلقائي على بنود المصاريف (موصى به)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      {isEn ? 'Solves tedious setup' : 'يغنيك عن التعديل بنداً بنداً'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-1">
                    {isEn
                      ? 'Automatically calculates limits for all categories based on their current balance to match the new total exactly.'
                      : 'يقوم بتوزيع المبلغ تلقائياً على كافة البنود بالنسبة والتناسب حسب حجمها الحالي بضغطة زر واحدة.'}
                  </p>
                </div>
              </div>

              {/* Strategy Option 2: Equal Auto-Distribution */}
              <div
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setBudgetStrategy('distribute_equal');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  budgetStrategy === 'distribute_equal'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-[#2C2C2E]/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                    budgetStrategy === 'distribute_equal'
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {budgetStrategy === 'distribute_equal' && <Check size={12} className="stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                    {isEn ? 'Equal Split Across Categories' : 'توزيع متساوٍ على جميع البنود'}
                  </span>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-0.5">
                    {isEn
                      ? 'Splits the total budget equally among all categories.'
                      : 'يقسم المبلغ الإجمالي بالتساوي على جميع الفئات المسجلة.'}
                  </p>
                </div>
              </div>

              {/* Strategy Option 3: Unified Custom Cap */}
              <div
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setBudgetStrategy('unified_custom');
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  budgetStrategy === 'unified_custom'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-[#2C2C2E]/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${
                    budgetStrategy === 'unified_custom'
                      ? 'bg-emerald-600 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {budgetStrategy === 'unified_custom' && <Check size={12} className="stroke-[3]" />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                    {isEn ? 'Unified Monthly Target (No Category Caps)' : 'ميزانية موحدة عامة (دون تقييد كل بند)'}
                  </span>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed mt-0.5">
                    {isEn
                      ? 'Sets one overall spending cap for the entire household without imposing strict limits on individual envelopes.'
                      : 'تحديد حد إجمالي واحد لمصاريف الشهر كله دون التقيد بسقف لكل بند.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Distribution Preview Accordion */}
            {calculatedCategoryLimits && (
              <div className="bg-[#F2F2F7]/80 dark:bg-[#2C2C2E]/50 rounded-2xl p-3 space-y-2 border border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <PieChart size={14} className="text-emerald-600" />
                    <span>{isEn ? 'Preview of Category Allocations' : 'معاينة توزيع البنود الجديد:'}</span>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${showBreakdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showBreakdown && (
                  <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto no-scrollbar">
                    {categories.map((cat) => {
                      const newLimit = calculatedCategoryLimits[cat.id] || 0;
                      const pct = parsedTotal > 0 ? Math.round((newLimit / parsedTotal) * 100) : 0;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CategoryIcon
                              iconName={cat.icon}
                              color={cat.color}
                              bgColor={cat.bgColor}
                              size="sm"
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {isEn ? cat.nameEn || cat.name : cat.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 tabular-nums">
                            <span className="text-[10px] text-[#8E8E93]">{pct}%</span>
                            <span className="font-black text-slate-900 dark:text-white">
                              {newLimit.toLocaleString()} {currencySymbol}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  onClose();
                }}
                className="flex-1 py-3 rounded-2xl bg-[#E5E5EA] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>

              <button
                type="button"
                disabled={parsedTotal <= 0}
                onClick={handleSave}
                className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>{isEn ? 'Apply & Save Budget' : 'حفظ وتطبيق الميزانية'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
