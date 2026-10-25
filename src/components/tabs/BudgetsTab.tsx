import React, { useState } from 'react';
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
} from 'lucide-react';
import { Category, Expense, BudgetSettings } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { sound } from '../../utils/audio';

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
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));

  // Spending per category map
  const categorySpendMap = new Map<string, number>();
  monthlyExpenses.forEach((e) => {
    categorySpendMap.set(e.categoryId, (categorySpendMap.get(e.categoryId) || 0) + e.amount);
  });

  // Total sums
  const totalActualSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const sumOfCategoriesBudget = categories.reduce((sum, c) => sum + c.monthlyLimit, 0);

  const effectiveTotalBudget =
    settings.budgetMode === 'custom_total'
      ? settings.totalMonthlyBudget
      : sumOfCategoriesBudget;

  const totalRemaining = effectiveTotalBudget - totalActualSpent;
  const totalPercent =
    effectiveTotalBudget > 0
      ? Math.round((totalActualSpent / effectiveTotalBudget) * 100)
      : 0;

  // Editing inline category limit
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingLimitValue, setEditingLimitValue] = useState<string>('');

  // Editing overall custom total budget
  const [isEditingTotalCustom, setIsEditingTotalCustom] = useState<boolean>(false);
  const [customTotalInput, setCustomTotalInput] = useState<string>(
    String(settings.totalMonthlyBudget)
  );

  const handleStartEditCat = (cat: Category) => {
    sound.playTap(settings.soundEnabled);
    setEditingCatId(cat.id);
    setEditingLimitValue(String(cat.monthlyLimit));
  };

  const handleSaveCatLimit = (catId: string) => {
    const val = parseFloat(editingLimitValue);
    if (!isNaN(val) && val >= 0) {
      sound.playSuccess(settings.soundEnabled);
      onUpdateCategoryLimit(catId, val);
    }
    setEditingCatId(null);
  };

  const handleSaveTotalCustom = () => {
    const val = parseFloat(customTotalInput);
    if (!isNaN(val) && val > 0) {
      sound.playSuccess(settings.soundEnabled);
      onUpdateSettings({ totalMonthlyBudget: val });
    }
    setIsEditingTotalCustom(false);
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Title & Category Manager Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
            الميزانية وأظرف النفقات
          </h1>
          <p className="text-xs text-[#8E8E93]">
            مقارنة المصاريف الفعلية مقابل الميزانية المحددة
          </p>
        </div>
        <button
          onClick={() => {
            sound.playTap(settings.soundEnabled);
            onOpenCategoryManager();
          }}
          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/50 dark:border-blue-900/40"
        >
          <Plus size={15} />
          <span>إضافة تصنيف</span>
        </button>
      </div>

      {/* Mode Selector: Overall vs Sum of Categories */}
      <div className="bg-white dark:bg-[#1C1C1E] p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
            <Settings2 size={15} className="text-blue-500" />
            <span>نظام احتساب الميزانية الإجمالية</span>
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            {settings.budgetMode === 'custom_total' ? 'سقف إجمالي مخصص' : 'مجموع أظرف الفئات'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl text-xs font-bold">
          <button
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              onUpdateSettings({ budgetMode: 'sum_categories' });
            }}
            className={`py-2 px-2 text-center rounded-lg transition-all cursor-pointer ${
              settings.budgetMode === 'sum_categories'
                ? 'bg-white dark:bg-[#48484A] text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            مجموع ميزانيات الفئات
          </button>
          <button
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              onUpdateSettings({ budgetMode: 'custom_total' });
            }}
            className={`py-2 px-2 text-center rounded-lg transition-all cursor-pointer ${
              settings.budgetMode === 'custom_total'
                ? 'bg-white dark:bg-[#48484A] text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-[#8E8E93] hover:text-[#1C1C1E]'
            }`}
          >
            سقف شهري إجمالي محدد
          </button>
        </div>

        {/* If Custom Total is chosen, show editable total input */}
        {settings.budgetMode === 'custom_total' && (
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-900 dark:text-blue-200 font-semibold block">
                السقف الإجمالي المحدد لميزانية الشهر:
              </span>
              <span className="text-sm font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
                {formatMoney(settings.totalMonthlyBudget, settings.currency)}
              </span>
            </div>

            {isEditingTotalCustom ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customTotalInput}
                  onChange={(e) => setCustomTotalInput(e.target.value)}
                  className="w-24 px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-[#2C2C2E] border border-blue-400 outline-hidden tabular-nums"
                  autoFocus
                />
                <button
                  onClick={handleSaveTotalCustom}
                  className="p-1.5 rounded-lg bg-blue-600 text-white cursor-pointer"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setIsEditingTotalCustom(false)}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  sound.playTap(settings.soundEnabled);
                  setIsEditingTotalCustom(true);
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-[#2C2C2E] text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-50 cursor-pointer"
              >
                تعديل السقف
              </button>
            )}
          </div>
        )}
      </div>

      {/* OVERALL COMPARISON HERO CARD */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1">
            <Wallet size={14} />
            <span>المقارنة على المستوى الإجمالي</span>
          </span>
          <span
            className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
              totalPercent >= 100
                ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300'
                : totalPercent >= 80
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            تم صرف {totalPercent}%
          </span>
        </div>

        {/* 3 Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[10px] text-[#8E8E93] block font-medium">الميزانية المقررة</span>
            <span className="text-xs md:text-sm font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
              {formatMoney(effectiveTotalBudget, settings.currency)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[10px] text-[#8E8E93] block font-medium">المصروف الفعلي</span>
            <span className="text-xs md:text-sm font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              {formatMoney(totalActualSpent, settings.currency)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
            <span className="text-[10px] text-[#8E8E93] block font-medium">
              {totalRemaining >= 0 ? 'المتبقي' : 'العجز / التجاوز'}
            </span>
            <span
              className={`text-xs md:text-sm font-extrabold tabular-nums ${
                totalRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}
            >
              {formatMoney(Math.abs(totalRemaining), settings.currency)}
            </span>
          </div>
        </div>

        {/* Total Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-3 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalPercent >= 100
                  ? 'bg-red-500'
                  : totalPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#8E8E93] font-semibold">
            <span>0</span>
            <span>الحد المقرر: {formatMoney(effectiveTotalBudget, settings.currency)}</span>
          </div>
        </div>
      </div>

      {/* CATEGORY LEVEL COMPARISON LIST */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
            مقارنة الفئات والأظرف ({categories.length} فئة)
          </h2>
          <span className="text-xs text-[#8E8E93]">الفعلي مقابل المخطط</span>
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
              <div
                key={cat.id}
                className="bg-white dark:bg-[#1C1C1E] p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-2.5 transition-all"
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
                          {cat.name}
                        </span>
                        {cat.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                            مخصص
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8E8E93] tabular-nums">
                        {spent.toLocaleString('ar-SA')} من {limit.toLocaleString('ar-SA')} {settings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Status badge & Quick edit */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md tabular-nums ${
                        isOver
                          ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300'
                          : isNear
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {percent}%
                    </span>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEditCat(cat)}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                        title="تعديل ميزانية هذا التصنيف"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Edit Input if active */}
                {isEditing && (
                  <div className="p-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#8E8E93] shrink-0">
                      تحديد ميزانية الفئة:
                    </span>
                    <div className="flex items-center gap-1 flex-1 justify-end">
                      <input
                        type="number"
                        value={editingLimitValue}
                        onChange={(e) => setEditingLimitValue(e.target.value)}
                        className="w-24 px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-[#1C1C1E] border border-blue-400 outline-hidden tabular-nums"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveCatLimit(cat.id)}
                        className="p-1 rounded-lg bg-blue-600 text-white cursor-pointer"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>

                {/* Bottom line: Remaining vs Exceeded */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8E8E93]">
                    المصروف الفعلي: <b className="text-[#1C1C1E] dark:text-white tabular-nums">{spent.toLocaleString('ar-SA')}</b>
                  </span>

                  {isOver ? (
                    <span className="font-bold text-red-500 flex items-center gap-1 tabular-nums">
                      <AlertCircle size={12} />
                      <span>تجاوز بـ {Math.abs(remaining).toLocaleString('ar-SA')} {settings.currency}</span>
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tabular-nums">
                      <CheckCircle size={12} />
                      <span>متبقي في الظرف: {remaining.toLocaleString('ar-SA')} {settings.currency}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA to Manage or Add Custom Categories */}
        <button
          onClick={() => {
            sound.playTap(settings.soundEnabled);
            onOpenCategoryManager();
          }}
          className="w-full py-3 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer shadow-2xs"
        >
          <Sliders size={15} />
          <span>إدارة وتخصيص تصنيفات المصاريف والميزانيات</span>
        </button>
      </div>
    </div>
  );
};
