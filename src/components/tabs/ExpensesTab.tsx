import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Category, Expense, BudgetSettings, PaymentMethod } from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { sound } from '../../utils/audio';

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

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Date filters
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = settings.selectedMonth;

    return expenses.filter((exp) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const catName = catMap.get(exp.categoryId)?.name.toLowerCase() || '';
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchNotes = (exp.notes || '').toLowerCase().includes(q);
        const matchCat = catName.includes(q);
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

    sorted.forEach((item) => {
      const arr = map.get(item.date) || [];
      arr.push(item);
      map.set(item.date, arr);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    map.forEach((items, date) => {
      let displayDate = date;
      if (date === todayStr) displayDate = 'اليوم';
      else if (date === yesterdayStr) displayDate = 'أمس';

      groups.push({ date, displayDate, items });
    });

    return groups;
  }, [filteredExpenses]);

  const getPaymentIcon = (pm: PaymentMethod) => {
    switch (pm) {
      case 'card':
        return <CreditCard size={12} className="text-blue-500" />;
      case 'cash':
        return <Banknote size={12} className="text-emerald-500" />;
      case 'transfer':
        return <ArrowRightLeft size={12} className="text-purple-500" />;
      case 'digital':
        return <Smartphone size={12} className="text-amber-500" />;
      default:
        return null;
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      sound.playDelete(settings.soundEnabled);
      onDeleteExpense(id);
      setSelectedExpenseForDetails(null);
    }
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
      {/* Title & Add */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
          سجل مصاريف البيت
        </h1>
        <button
          onClick={() => {
            sound.playTap(settings.soundEnabled);
            onOpenAddExpense();
          }}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          + إضافة مصروف
        </button>
      </div>

      {/* iOS Search Bar */}
      <div className="relative w-full">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في المصاريف (اسم المحل، السلعة، الملاحظات...)"
          className="w-full pr-9 pl-8 py-2 rounded-xl bg-[#E5E5EA]/70 dark:bg-[#1C1C1E] text-xs font-medium text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-blue-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter Row 1: Time range */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'this_month', label: 'هذا الشهر' },
          { id: 'this_week', label: 'هذا الأسبوع' },
          { id: 'today', label: 'اليوم' },
          { id: 'all', label: 'كل التواريخ' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              setTimeFilter(f.id as any);
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer ${
              timeFilter === f.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-[#1C1C1E] text-[#636366] dark:text-[#AEAEB2] border border-slate-200/60 dark:border-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filter Row 2: Categories & Payer */}
      <div className="flex items-center gap-2">
        {/* Category Dropdown */}
        <div className="relative flex-1">
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              sound.playTap(settings.soundEnabled);
              setSelectedCategoryId(e.target.value);
            }}
            aria-label="تصفية حسب التصنيف"
            className="w-full appearance-none px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden cursor-pointer pl-7 truncate"
          >
            <option value="all">جميع التصنيفات ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none"
          />
        </div>

        {/* Payer Dropdown */}
        <div className="relative flex-1">
          <select
            value={selectedPayer}
            onChange={(e) => {
              sound.playTap(settings.soundEnabled);
              setSelectedPayer(e.target.value);
            }}
            aria-label="تصفية حسب الشخص الدافع"
            className="w-full appearance-none px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden cursor-pointer pl-7 truncate"
          >
            <option value="all">كل الدافعين</option>
            <option value="الزوج">الزوج</option>
            <option value="الزوجة">الزوجة</option>
            <option value="مشترك">مشترك</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none"
          />
        </div>
      </div>

      {/* Filter Summary Banner */}
      <div className="px-3.5 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/40 flex items-center justify-between text-xs">
        <span className="text-blue-900 dark:text-blue-200 font-medium">
          إجمالي المصاريف المعروضة:
        </span>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-blue-700 dark:text-blue-300 tabular-nums text-sm">
            {formatMoney(totalFilteredAmount, settings.currency)}
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
            ({filteredExpenses.length} عملية)
          </span>
        </div>
      </div>

      {/* Grouped Transaction Lists */}
      <div className="space-y-4">
        {groupedByDate.map((group) => (
          <div key={group.date} className="space-y-1.5">
            {/* Date Header */}
            <div className="px-2 flex items-center justify-between text-xs font-semibold text-[#8E8E93]">
              <span>{group.displayDate}</span>
              <span className="tabular-nums text-[11px]">
                {formatMoney(
                  group.items.reduce((s, i) => s + i.amount, 0),
                  settings.currency
                )}
              </span>
            </div>

            {/* List Group Container */}
            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              {group.items.map((exp) => {
                const cat = catMap.get(exp.categoryId);
                return (
                  <div
                    key={exp.id}
                    onClick={() => {
                      sound.playTap(settings.soundEnabled);
                      setSelectedExpenseForDetails(exp);
                    }}
                    className="p-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
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
                          <span>{cat?.name || 'عام'}</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            {getPaymentIcon(exp.paymentMethod)}
                            <span>{exp.payer}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
                        -{formatMoney(exp.amount, settings.currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredExpenses.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Filter size={22} />
            </div>
            <div className="text-sm font-bold text-[#1C1C1E] dark:text-white">لا توجد مصاريف مطابقة</div>
            <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
              جرب تغيير عبارة البحث أو الفلاتر المعينة، أو قم بإضافة مصروف جديد الآن.
            </p>
          </div>
        )}
      </div>

      {/* Expense Detail & Action Modal */}
      {selectedExpenseForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedExpenseForDetails(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <span className="text-xs font-bold text-[#8E8E93]">تفاصيل المصروف</span>
              <button
                onClick={() => setSelectedExpenseForDetails(null)}
                className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="text-center py-2">
              <div className="text-3xl font-black text-[#1C1C1E] dark:text-white tabular-nums mb-1">
                {formatMoney(selectedExpenseForDetails.amount, settings.currency)}
              </div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {selectedExpenseForDetails.title}
              </div>
            </div>

            <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93]">التصنيف</span>
                <span className="font-bold text-[#1C1C1E] dark:text-white">
                  {catMap.get(selectedExpenseForDetails.categoryId)?.name || 'عام'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93]">التاريخ</span>
                <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                  {selectedExpenseForDetails.date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93]">الشخص الدافع</span>
                <span className="font-bold text-[#1C1C1E] dark:text-white">
                  {selectedExpenseForDetails.payer}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93]">طريقة السداد</span>
                <span className="font-bold text-[#1C1C1E] dark:text-white">
                  {selectedExpenseForDetails.paymentMethod === 'card'
                    ? 'بطاقة بنكية'
                    : selectedExpenseForDetails.paymentMethod === 'cash'
                    ? 'كاش'
                    : selectedExpenseForDetails.paymentMethod === 'transfer'
                    ? 'تحويل بنكي'
                    : 'دفع رقمي'}
                </span>
              </div>
              {selectedExpenseForDetails.notes && (
                <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C]">
                  <span className="text-[#8E8E93] block mb-0.5">ملاحظات:</span>
                  <p className="font-medium text-[#1C1C1E] dark:text-white">
                    {selectedExpenseForDetails.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  const toEdit = selectedExpenseForDetails;
                  setSelectedExpenseForDetails(null);
                  onEditExpense(toEdit);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 size={15} />
                <span>تعديل المصروف</span>
              </button>
              <button
                onClick={() => handleDelete(selectedExpenseForDetails.id)}
                className="px-3.5 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>حذف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
