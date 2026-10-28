import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart as PieIcon } from 'lucide-react';
import { Category, Expense, BudgetSettings } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Amount } from './Amount';
import { nativeHaptics } from '../utils/nativeHaptics';

interface CategoryExpensesPieChartProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  currentMonth: string;
  language?: 'ar' | 'en';
  hideAmounts?: boolean;
}

export const CategoryExpensesPieChart: React.FC<CategoryExpensesPieChartProps> = ({
  categories,
  expenses,
  settings,
  currentMonth,
  language = 'ar',
  hideAmounts = false,
}) => {
  const isEn = language === 'en';
  const soundEnabled = settings.soundEnabled;

  // Filter mode: 'month' (current selected month) vs 'year' (current selected year)
  const [timeScope, setTimeScope] = useState<'month' | 'year'>('month');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const selectedYear = currentMonth.split('-')[0] || String(new Date().getFullYear());

  // Filtered expenses based on timeScope
  const filteredExpenses = useMemo(() => {
    if (timeScope === 'month') {
      return expenses.filter((e) => e.date.startsWith(currentMonth));
    }
    return expenses.filter((e) => e.date.startsWith(`${selectedYear}-`));
  }, [expenses, timeScope, currentMonth, selectedYear]);

  // Aggregate by category
  const { chartData, totalSpent } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    filteredExpenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
      total += e.amount;
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const data = Array.from(map.entries())
      .map(([catId, spent]) => {
        const cat = categoryMap.get(catId);
        const name = cat
          ? isEn
            ? cat.nameEn || cat.name
            : cat.name
          : isEn
          ? 'Other'
          : 'أخرى';
        const color = cat?.color || '#10B981';
        const icon = cat?.icon || 'Package';
        const bgColor = cat?.bgColor;

        return {
          id: catId,
          name,
          value: spent,
          color,
          icon,
          bgColor,
          percent: total > 0 ? (spent / total) * 100 : 0,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return { chartData: data, totalSpent: total };
  }, [filteredExpenses, categories, isEn]);

  const activeCategory =
    activeIndex !== null && chartData[activeIndex]
      ? chartData[activeIndex]
      : null;

  // Custom Shape renderer for Pie sectors
  const renderSector = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, index } = props;
    const isSelected = activeIndex === index;
    const actualOuterRadius = isSelected ? outerRadius + 8 : outerRadius;
    const actualInnerRadius = isSelected ? Math.max(0, innerRadius - 2) : innerRadius;

    return (
      <g className="cursor-pointer outline-hidden">
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={actualInnerRadius}
          outerRadius={actualOuterRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        {isSelected && (
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={actualOuterRadius + 4}
            outerRadius={actualOuterRadius + 7}
            fill={fill}
            fillOpacity={0.6}
          />
        )}
      </g>
    );
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1 z-30 pointer-events-none">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-slate-900 dark:text-white">
              {item.name}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 tabular-nums">
            <span className="text-[11px] text-[#8E8E93]">
              {item.percent.toFixed(1)}%
            </span>
            <Amount
              value={item.value}
              currency={settings.currency}
              lang={language}
              hideAmounts={hideAmounts}
              className="font-extrabold text-slate-900 dark:text-white"
            />
          </div>
        </div>
      );
    }
    return null;
  };

  const handleSliceClick = (index: number) => {
    nativeHaptics.tap(soundEnabled);
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
      {/* Header & Scope Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <PieIcon size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isEn ? 'Category Distribution (Recharts)' : 'توزيع المصاريف حسب التصنيف (Recharts)'}
            </h3>
            <span className="text-[10px] text-[#8E8E93] block">
              {isEn
                ? 'Interactive Pie Chart of expenses'
                : 'مخطط بياني دائري تفاعلي لمصروفاتك'}
            </span>
          </div>
        </div>

        {/* Month / Year Scope Selector */}
        <div className="inline-flex p-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl text-xs">
          <button
            type="button"
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              setTimeScope('month');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              timeScope === 'month'
                ? 'bg-white dark:bg-[#3A3A3C] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-[#8E8E93] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? 'This Month' : 'هذا الشهر'}
          </button>
          <button
            type="button"
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              setTimeScope('year');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              timeScope === 'year'
                ? 'bg-white dark:bg-[#3A3A3C] text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-[#8E8E93] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isEn ? `Year ${selectedYear}` : `سنة ${selectedYear}`}
          </button>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="space-y-4">
          {/* Recharts Pie Chart with Center Overlay */}
          <div className="relative w-full h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  shape={renderSector}
                  onClick={(_, index) => handleSliceClick(index)}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${entry.id}-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                      className="cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>

            {/* Central Insight Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <AnimatePresence mode="wait">
                {activeCategory ? (
                  <motion.div
                    key={`active-${activeCategory.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span
                      className="text-[11px] font-bold truncate max-w-28"
                      style={{ color: activeCategory.color }}
                    >
                      {activeCategory.name}
                    </span>
                    <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                      {activeCategory.percent.toFixed(0)}%
                    </span>
                    <Amount
                      value={activeCategory.value}
                      currency={settings.currency}
                      lang={language}
                      hideAmounts={hideAmounts}
                      className="text-[10px] font-bold text-[#8E8E93] tabular-nums"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="total-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">
                      {isEn ? 'Total Spend' : 'إجمالي الصرف'}
                    </span>
                    <Amount
                      value={totalSpent}
                      currency={settings.currency}
                      lang={language}
                      hideAmounts={hideAmounts}
                      className="text-base font-black text-slate-900 dark:text-white tabular-nums mt-0.5"
                    />
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {chartData.length} {isEn ? 'Categories' : 'تصنيفات'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quick Category Legend & Proportion Cards */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8E8E93] px-1 pb-1">
              <span>{isEn ? 'Category Breakdown' : 'تفاصيل التصنيفات'}</span>
              <span>{isEn ? 'Amount & Share' : 'المبلغ والنسبة'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
              {chartData.map((item, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      nativeHaptics.tap(soundEnabled);
                      setActiveIndex(isSelected ? null : idx);
                    }}
                    className={`p-2.5 rounded-2xl flex items-center justify-between text-xs cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-xs'
                        : 'bg-[#F2F2F7]/70 dark:bg-[#2C2C2E]/60 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon
                        iconName={item.icon}
                        color={item.color}
                        bgColor={item.bgColor}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-[#8E8E93] tabular-nums">
                          {item.percent.toFixed(1)}% {isEn ? 'of total' : 'من الإجمالي'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Amount
                        value={item.value}
                        currency={settings.currency}
                        lang={language}
                        hideAmounts={hideAmounts}
                        className="font-black text-slate-900 dark:text-white tabular-nums block"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#8E8E93] space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-[#8E8E93]">
            <PieIcon size={20} />
          </div>
          <p>
            {isEn
              ? 'No expense data found for the selected time range.'
              : 'لا توجد بيانات مصروفات للفترة الزمنية المحددة لعرض المخطط البياني.'}
          </p>
        </div>
      )}
    </div>
  );
};
