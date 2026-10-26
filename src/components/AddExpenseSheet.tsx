import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, CreditCard, Banknote, ArrowRightLeft, Smartphone, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, PaymentMethod, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { sound } from '../utils/audio';
import { nativeHaptics } from '../utils/nativeHaptics';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { springs, fades } from '../utils/motion';

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: CurrencyCode;
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  initialExpense?: Expense | null;
  soundEnabled?: boolean;
}

const COMMON_TITLES_AR = [
  'سوبرماركت ومؤونة',
  'خضار وفواكه ولحوم',
  'صيدلية وأدوية',
  'بنزين ومحطة وقود',
  'فاتورة كهرباء / ماء',
  'طلب مطعم عائلي',
  'مستلزمات مدرسية',
  'صيانة وتجهيز منزل',
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
  const [isFlyingCoin, setIsFlyingCoin] = useState<boolean>(false);

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmountStr(String(initialExpense.amount));
      setCategoryId(initialExpense.categoryId);
      setDate(initialExpense.date);
      setPaymentMethod(initialExpense.paymentMethod);
      setPayer(initialExpense.payer);
      setNotes(initialExpense.notes || '');
    } else {
      setTitle('');
      setAmountStr('');
      setCategoryId(categories[0]?.id || '');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('card');
      setPayer('الزوج');
      setNotes('');
    }
    setError('');
    setIsFlyingCoin(false);
  }, [initialExpense, isOpen, categories]);

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || 'ر.س';

  const handleQuickAddAmount = (addVal: number) => {
    nativeHaptics.tap(soundEnabled);
    const curr = parseFloat(amountStr) || 0;
    setAmountStr(String(curr + addVal));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

    // Trigger signature coin fly animation & haptics
    setIsFlyingCoin(true);
    nativeHaptics.success(soundEnabled);

    setTimeout(() => {
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
    }, 280);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* iOS Dimmed Backdrop with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fades.fast}
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              onClose();
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Flying Coin on Save */}
          {isFlyingCoin && (
            <motion.div
              initial={{ scale: 0.5, y: 0, opacity: 1 }}
              animate={{ scale: [1, 1.4, 0.2], y: -400, opacity: [1, 1, 0] }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="absolute z-60 pointer-events-none w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-amber-900 shadow-xl flex items-center justify-center font-black"
            >
              <Coins size={28} />
            </motion.div>
          )}

          {/* Draggable Bottom Sheet with velocity-based dismiss */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) {
                nativeHaptics.tap(soundEnabled);
                onClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.smooth}
            className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-10 border-t border-slate-200/50 dark:border-slate-800"
          >
            {/* Grabber Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </motion.button>

              <h2 className="text-base font-black text-[#1C1C1E] dark:text-white">
                {initialExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
              </h2>

              <motion.button
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={() => handleSubmit()}
                className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                حفظ
              </motion.button>
            </div>

            {/* Form Body (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Big Amount Card with Individual Digit Slide Animation */}
              <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] p-4 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                <span className="text-xs text-[#8E8E93] font-semibold mb-1">المبلغ المصروف</span>
                
                <div className="flex items-center justify-center gap-2 relative">
                  {/* Invisible real input for keyboard focus */}
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
                    className="w-48 text-center text-3xl font-black text-[#1C1C1E] dark:text-white bg-transparent border-none outline-hidden tabular-nums placeholder:text-[#C7C7CC] dark:placeholder:text-[#636366]"
                  />
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}
                  </span>
                </div>

                {/* Quick Add Presets with spring micro-interaction */}
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#E5E5EA] dark:border-[#3A3A3C] w-full justify-center flex-wrap">
                  {[20, 50, 100, 200, 500].map((val) => (
                    <motion.button
                      key={val}
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={() => handleQuickAddAmount(val)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-[#3A3A3C] text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      +{val}
                    </motion.button>
                  ))}
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => {
                      nativeHaptics.tap(soundEnabled);
                      setAmountStr('');
                    }}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100/70 dark:bg-red-950/50 text-red-600 dark:text-red-300 transition-colors cursor-pointer"
                  >
                    تفريغ
                  </motion.button>
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
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-sm text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                />

                {/* Quick Title Tags */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-2">
                  {COMMON_TITLES_AR.map((t) => (
                    <motion.button
                      key={t}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => {
                        nativeHaptics.tap(soundEnabled);
                        setTitle(t);
                      }}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-semibold rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#636366] dark:text-[#AEAEB2] hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      {t}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Category Picker (Spring Chips) */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  فئة المصروف
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.94 }}
                        animate={{ scale: isSelected ? 1.03 : 1 }}
                        transition={springs.snappy}
                        type="button"
                        onClick={() => {
                          nativeHaptics.tap(soundEnabled);
                          setCategoryId(cat.id);
                        }}
                        className={`p-2 rounded-2xl flex items-center gap-2 border text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-2xs font-bold ring-2 ring-emerald-500/30'
                            : 'bg-white dark:bg-[#2C2C2E] border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <CategoryIcon
                          iconName={cat.icon}
                          color={cat.color}
                          bgColor={cat.bgColor}
                          size="sm"
                        />
                        <span className="text-[11px] truncate">{cat.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Payment Method */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                    تاريخ العملية
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                    طريقة الدفع
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="card">بطاقة مدى / ائتمان</option>
                    <option value="cash">نقداً (كاش)</option>
                    <option value="transfer">تحويل بنكي</option>
                    <option value="digital">محفظة رقمية (Apple Pay)</option>
                  </select>
                </div>
              </div>

              {/* Payer Selector */}
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                  الشخص الدافع
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['الزوج', 'الزوجة', 'مشترك'].map((p) => {
                    const isSelected = payer === p;
                    return (
                      <motion.button
                        key={p}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => {
                          nativeHaptics.tap(soundEnabled);
                          setPayer(p);
                        }}
                        className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </motion.button>
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
                  placeholder="مثال: فاتورة الصيدلية الشهرية، شراء عرض مخفض..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
