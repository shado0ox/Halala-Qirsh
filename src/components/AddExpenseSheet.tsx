import React, { useState } from 'react';
import { X, Check, Calendar, CreditCard, Banknote, ArrowRightLeft, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, PaymentMethod, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { sound } from '../utils/audio';
import { CURRENCY_SYMBOLS } from '../utils/storage';

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: CurrencyCode;
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialExpense?: Expense | null;
  soundEnabled?: boolean;
}

const COMMON_TITLES = [
  'سوبرماركت ومؤونة',
  'خضار وفواكه ولحوم',
  'صيدلية وأدوية',
  'بنزين ومحطة وقود',
  'فاتورة كهرباء / ماء',
  'طلب مطعم عائلي',
  'مستلزمات مدرسية',
  'صيانة وقطع غيار منزل',
];

export const AddExpenseSheet: React.FC<AddExpenseSheetProps> = ({
  isOpen,
  onClose,
  categories,
  currency,
  onSaveExpense,
  initialExpense,
  soundEnabled = true,
}) => {
  const [title, setTitle] = useState<string>(initialExpense ? initialExpense.title : '');
  const [amountStr, setAmountStr] = useState<string>(initialExpense ? String(initialExpense.amount) : '');
  const [categoryId, setCategoryId] = useState<string>(
    initialExpense ? initialExpense.categoryId : (categories[0]?.id || '')
  );
  const [date, setDate] = useState<string>(
    initialExpense ? initialExpense.date : new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialExpense ? initialExpense.paymentMethod : 'card'
  );
  const [payer, setPayer] = useState<'الزوج' | 'الزوجة' | 'مشترك' | string>(
    initialExpense ? initialExpense.payer : 'الزوج'
  );
  const [notes, setNotes] = useState<string>(initialExpense?.notes || '');
  const [error, setError] = useState<string>('');

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || 'ر.س';

  const handleQuickAddAmount = (addVal: number) => {
    sound.playTap(soundEnabled);
    const curr = parseFloat(amountStr) || 0;
    setAmountStr(String(curr + addVal));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (!title.trim()) {
      setError('يرجى كتابة وصف أو اسم المصروف');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!categoryId) {
      setError('يرجى اختيار تصنيف المصروف');
      return;
    }

    sound.playSuccess(soundEnabled);
    onSaveExpense({
      title: title.trim(),
      amount: parsedAmount,
      categoryId,
      date,
      paymentMethod,
      payer,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* iOS Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              sound.playTap(soundEnabled);
              onClose();
            }}
            className="absolute inset-0 bg-black/45 backdrop-blur-xs"
          />

          {/* iOS Bottom Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-10"
          >
            {/* Grabber Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab">
              <div className="w-10 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                type="button"
                onClick={() => {
                  sound.playTap(soundEnabled);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                {initialExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
              </h2>

              <button
                type="button"
                onClick={handleSubmit}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
              >
                حفظ
              </button>
            </div>

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              {/* Big Amount Card */}
              <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-xs text-[#8E8E93] font-medium mb-1">المبلغ المصروف</span>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      setError('');
                    }}
                    placeholder="0"
                    autoFocus
                    className="w-48 text-center text-3xl font-extrabold text-[#1C1C1E] dark:text-white bg-transparent border-none outline-hidden tabular-nums placeholder:text-[#C7C7CC] dark:placeholder:text-[#636366]"
                  />
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{currencySymbol}</span>
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E5E5EA] dark:border-[#3A3A3C] w-full justify-center flex-wrap">
                  {[20, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAddAmount(val)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-[#3A3A3C] text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      +{val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap(soundEnabled);
                      setAmountStr('');
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-100/60 dark:bg-red-950/50 text-red-600 dark:text-red-300 transition-colors cursor-pointer"
                  >
                    تفريغ
                  </button>
                </div>
              </div>

              {/* Title & Quick Suggestions */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  بيان أو اسم المصروف
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError('');
                  }}
                  placeholder="مثلاً: خضار وسوبرماركت، بنزين، كشف طبي..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                />

                {/* Quick Title Tags */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2">
                  {COMMON_TITLES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        sound.playTap(soundEnabled);
                        setTitle(t);
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] rounded-lg bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2] hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Picker (Grid) */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  فئة المصروف
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          sound.playTap(soundEnabled);
                          setCategoryId(cat.id);
                        }}
                        className={`p-2 rounded-xl flex items-center gap-2 border text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500'
                            : 'border-transparent bg-[#F2F2F7] dark:bg-[#2C2C2E] hover:bg-slate-200/60 dark:hover:bg-[#3A3A3C]'
                        }`}
                      >
                        <CategoryIcon iconName={cat.icon} color={cat.color} bgColor={cat.bgColor} size="sm" />
                        <span className="text-xs font-medium text-[#1C1C1E] dark:text-white truncate">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payer & Date */}
              <div className="grid grid-cols-2 gap-3">
                {/* Payer */}
                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                    الدافع (المسؤول)
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl text-xs font-semibold">
                    {(['الزوج', 'الزوجة', 'مشترك'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          sound.playTap(soundEnabled);
                          setPayer(p);
                        }}
                        className={`py-1.5 text-center rounded-lg transition-colors cursor-pointer ${
                          payer === p
                            ? 'bg-white dark:bg-[#48484A] text-[#1C1C1E] dark:text-white shadow-xs'
                            : 'text-[#8E8E93]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                    التاريخ
                  </label>
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium">
                    <Calendar size={14} className="text-[#8E8E93]" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-transparent border-none outline-hidden text-[#1C1C1E] dark:text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  طريقة السداد
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'card' as PaymentMethod, label: 'بطاقة مدى', icon: CreditCard },
                    { id: 'cash' as PaymentMethod, label: 'كاش / نقدي', icon: Banknote },
                    { id: 'transfer' as PaymentMethod, label: 'تحويل بنكي', icon: ArrowRightLeft },
                    { id: 'digital' as PaymentMethod, label: 'دفع رقمي', icon: Smartphone },
                  ].map((pm) => {
                    const isSelected = paymentMethod === pm.id;
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => {
                          sound.playTap(soundEnabled);
                          setPaymentMethod(pm.id);
                        }}
                        className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                            : 'border-transparent bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-[10px] tracking-tight">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  ملاحظات إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="موقع المتجر، رقم الفاتورة أو ملاحظة للبيت..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Check size={18} strokeWidth={2.5} />
                  <span>{initialExpense ? 'تأكيد وحفظ التعديلات' : 'تسجيل المصروف في الميزانية'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
