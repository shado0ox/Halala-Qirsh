import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  ChevronDown,
  Receipt,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, BudgetSettings, PaymentMethod } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { ExpenseListItem } from '../ExpenseListItem';
import { Amount } from '../Amount';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs, fades, useMotionConfig } from '../../utils/motion';
import { useCoinFlight } from '../../context/CoinFlightContext';
import { getLocalToday } from '../../utils/smsParser';
import { translations } from '../../utils/i18n';

interface ExpensesTabProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenAddExpense: () => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  categories,
  expenses,
  settings,
  onEditExpense,
  onDeleteExpense,
  onOpenAddExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'this_week' | 'today'>('this_month');
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<Expense | null>(null);

  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isRTL = settings.language !== 'en';
  const isEn = settings.language === 'en';
  const lang = settings.language || 'ar';
  const t = translations[lang];
  const isHidden = Boolean(settings.hideAmounts);

  const { registerTarget, highlightedExpenseId } = useCoinFlight();
  const firstRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (firstRowRef.current) {
      registerTarget('expenses-first-row', firstRowRef.current);
    }
    return () => {
      registerTarget('expenses-first-row', null);
    };
  }, [registerTarget]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Date filters
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalToday(now);
    const currentMonth = settings.selectedMonth;

    return expenses.filter((exp) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const catName = catMap.get(exp.categoryId)?.name.toLowerCase() || '';
        const catNameEn = catMap.get(exp.categoryId)?.nameEn?.toLowerCase() || '';
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchNotes = (exp.notes || '').toLowerCase().includes(q);
        const matchCat = catName.includes(q) || catNameEn.includes(q);
        if (!matchTitle && !matchNotes && !matchCat) return false;
      }

      // Category
      if (selectedCategoryId !== 'all' && exp.categoryId !== selectedCategoryId) {
        return false;
      }

      // Payer
      if (selectedPayer !== 'all' && exp.payer !== selectedPayer) {
        return false;
      }

      // Time Filter
      if (timeFilter === 'this_month') {
        if (!exp.date.startsWith(currentMonth)) return false;
      } else if (timeFilter === 'today') {
        if (exp.date !== todayStr) return false;
      } else if (timeFilter === 'this_week') {
        const expDate = new Date(exp.date);
        const diffDays = (now.getTime() - expDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategoryId, selectedPayer, timeFilter, settings.selectedMonth, catMap]);

  const totalFilteredAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; displayDate: string; items: Expense[] }[] = [];
    const map = new Map<string, Expense[]>();

    const sorted = [...filteredExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sorted.forEach((exp) => {
      if (!map.has(exp.date)) {
        map.set(exp.date, []);
      }
      map.get(exp.date)!.push(exp);
    });

    const todayStr = getLocalToday();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalToday(yesterdayDate);

    map.forEach((items, dateStr) => {
      let displayDate = dateStr;
      if (dateStr === todayStr) {
        displayDate = isEn ? 'Today' : 'اليوم';
      } else if (dateStr === yesterdayStr) {
        displayDate = isEn ? 'Yesterday' : 'أمس';
      } else {
        const [y, m, d] = dateStr.split('-');
        displayDate = `${d}/${m}/${y}`;
      }
      groups.push({ date: dateStr, displayDate, items });
    });

    return groups;
  }, [filteredExpenses, isEn]);

  const getPaymentLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return isEn ? 'Card / Mada' : 'بطاقة مدى / ائتمان';
      case 'cash':
        return isEn ? 'Cash' : 'نقداً (كاش)';
      case 'digital':
        return isEn ? 'Apple Pay / Digital' : 'محفظة رقمية';
      case 'transfer':
        return isEn ? 'Bank Transfer' : 'تحويل بنكي';
    }
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
      {/* Top Header & Quick Add */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight">
            {isEn ? 'Expenses History' : 'سجل نفقات المنزل'}
          </h1>
          <span className="text-xs text-[#8E8E93] font-medium">
            {filteredExpenses.length} {isEn ? 'transactions' : 'عملية مسجلة'}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenAddExpense();
          }}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.8} />
          <span>{isEn ? 'Add Expense' : 'إضافة مصروف'}</span>
        </motion.button>
      </div>

      {/* Search Bar with clean focus ring */}
      <div className="relative">
        <Search
          size={16}
          className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search expenses (store, item, note)...' : 'بحث في المصاريف (اسم المتجر، السلعة، الملاحظة)...'}
          className={`w-full ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-2.5 rounded-2xl bg-[#E5E5EA]/70 dark:bg-[#1C1C1E] text-xs font-semibold text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer`}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter Row 1: Time range */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'this_month', label: isEn ? 'This Month' : 'هذا الشهر' },
          { id: 'this_week', label: isEn ? 'This Week' : 'هذا الأسبوع' },
          { id: 'today', label: isEn ? 'Today' : 'اليوم' },
          { id: 'all', label: isEn ? 'All Time' : 'كل التواريخ' },
        ].map((f) => {
          const isActive = timeFilter === f.id;
          return (
            <motion.button
              key={f.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                setTimeFilter(f.id as any);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-[#1C1C1E] text-[#636366] dark:text-[#AEAEB2] border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              {f.label}
            </motion.button>
          );
        })}
      </div>

      {/* Filter Row 2: Category & Payer Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              nativeHaptics.tap(settings.soundEnabled);
              setSelectedCategoryId(e.target.value);
            }}
            aria-label="Filter by category"
            className={`w-full appearance-none px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden cursor-pointer ${isRTL ? 'pl-7' : 'pr-7'} truncate`}
          >
            <option value="all">{isEn ? `All Categories (${categories.length})` : `جميع التصنيفات (${categories.length})`}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {isEn ? (c.nameEn || c.name) : c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none`}
          />
        </div>

        <div className="relative">
          <select
            value={selectedPayer}
            onChange={(e) => {
              nativeHaptics.tap(settings.soundEnabled);
              setSelectedPayer(e.target.value);
            }}
            aria-label="Filter by payer"
            className={`w-full appearance-none px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden cursor-pointer ${isRTL ? 'pl-7' : 'pr-7'} truncate`}
          >
            <option value="all">{isEn ? 'All Payers' : 'كل الدافعين'}</option>
            <option value="الزوج">{isEn ? 'Husband' : 'الزوج'}</option>
            <option value="الزوجة">{isEn ? 'Wife' : 'الزوجة'}</option>
            <option value="مشترك">{isEn ? 'Shared' : 'مشترك'}</option>
          </select>
          <ChevronDown
            size={14}
            className={`absolute ${isRTL ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none`}
          />
        </div>
      </div>

      {/* Filter Summary Banner */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-between text-xs">
        <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
          {isEn ? 'Total for selected period:' : 'إجمالي النفقات للمدة المحددة:'}
        </span>
        <Amount
          value={totalFilteredAmount}
          currency={settings.currency}
          lang={lang}
          hideAmounts={isHidden}
          className="text-sm font-black text-emerald-700 dark:text-emerald-300 tabular-nums"
        />
      </div>

      {/* Grouped Expenses List with Sticky Headers & Swipe Items */}
      <div className="space-y-4 pb-6">
        {groupedByDate.map((group, groupIdx) => (
          <div key={group.date} className="space-y-1.5">
            {/* Sticky Day Header */}
            <div className="sticky top-0 z-20 bg-[#F4FAF7] dark:bg-black py-1 px-1 flex items-center justify-between text-xs font-extrabold text-[#5C8271] dark:text-[#8E8E93]">
              <span>{group.displayDate}</span>
              <Amount
                value={group.items.reduce((s, i) => s + i.amount, 0)}
                currency={settings.currency}
                lang={lang}
                hideAmounts={isHidden}
                className="tabular-nums text-[11px] font-bold"
              />
            </div>

            {/* List Group Container */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              <AnimatePresence initial={false}>
                {group.items.map((exp, itemIdx) => {
                  const isVeryFirstItem = groupIdx === 0 && itemIdx === 0;
                  return (
                    <div
                      key={exp.id}
                      ref={isVeryFirstItem ? firstRowRef : undefined}
                      className="relative"
                    >
                      <ExpenseListItem
                        expense={exp}
                        category={catMap.get(exp.categoryId)}
                        currency={settings.currency}
                        lang={lang}
                        isRTL={isRTL}
                        soundEnabled={settings.soundEnabled}
                        isReduced={isReduced}
                        hideAmounts={isHidden}
                        isHighlighted={exp.id === highlightedExpenseId}
                        onEdit={(e) => onEditExpense(e)}
                        onDelete={(id) => onDeleteExpense(id)}
                        onClick={(e) => {
                          nativeHaptics.tap(settings.soundEnabled);
                          setSelectedExpenseForDetails(e);
                        }}
                      />
                    </div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}

        {filteredExpenses.length === 0 && (
          <div className="py-14 text-center space-y-2.5">
            <motion.div
              animate={isReduced ? {} : { y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center"
            >
              <Receipt size={26} />
            </motion.div>
            <div className="text-sm font-bold text-[#1C1C1E] dark:text-white">
              {t.noMatchingExpenses}
            </div>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              {t.noMatchingExpensesHint}
            </p>
          </div>
        )}
      </div>

      {/* Expense Detail Modal (Zero backdrop-blur to preserve 60fps) */}
      <AnimatePresence>
        {selectedExpenseForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpenseForDetails(null)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={springs.smooth}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <span className="text-xs font-bold text-[#8E8E93]">
                  {isEn ? 'Expense Details' : 'تفاصيل المصروف'}
                </span>
                <button
                  onClick={() => setSelectedExpenseForDetails(null)}
                  className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="text-center py-2">
                <div className="mb-1">
                  <Amount
                    value={selectedExpenseForDetails.amount}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                    className="text-3xl font-black text-[#1C1C1E] dark:text-white tabular-nums"
                  />
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {selectedExpenseForDetails.title}
                </div>
              </div>

              <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8E8E93]">{isEn ? 'Category' : 'التصنيف'}</span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white">
                    {isEn ? (catMap.get(selectedExpenseForDetails.categoryId)?.nameEn || catMap.get(selectedExpenseForDetails.categoryId)?.name || 'General') : (catMap.get(selectedExpenseForDetails.categoryId)?.name || 'عام')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8E8E93]">{isEn ? 'Date' : 'التاريخ'}</span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                    {selectedExpenseForDetails.date}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8E8E93]">{isEn ? 'Payer' : 'الشخص الدافع'}</span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white">
                    {selectedExpenseForDetails.payer}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8E8E93]">{isEn ? 'Payment Method' : 'طريقة الدفع'}</span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white">
                    {getPaymentLabel(selectedExpenseForDetails.paymentMethod)}
                  </span>
                </div>
                {selectedExpenseForDetails.notes && (
                  <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C]">
                    <span className="text-[#8E8E93] block mb-1">{isEn ? 'Notes' : 'الملاحظات'}</span>
                    <p className="text-slate-700 dark:text-slate-300">{selectedExpenseForDetails.notes}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    const exp = selectedExpenseForDetails;
                    setSelectedExpenseForDetails(null);
                    onEditExpense(exp);
                  }}
                  className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>{isEn ? 'Edit' : 'تعديل'}</span>
                </button>
                <button
                  onClick={() => {
                    const id = selectedExpenseForDetails.id;
                    setSelectedExpenseForDetails(null);
                    onDeleteExpense(id);
                  }}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>{isEn ? 'Delete' : 'حذف'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
