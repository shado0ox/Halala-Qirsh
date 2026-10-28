import React, { useState } from 'react';
import {
  X,
  ClipboardPaste,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Smartphone,
  Tag,
  Store,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { Category, Expense, PaymentMethod, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';
import {
  parseBankSms,
  saveLearnedRule,
  ParsedBankSms,
  getLocalToday,
  getLocalDateString,
} from '../utils/smsParser';
import { handleModalBackdropClick, dismissKeyboard, useKeyboardState } from '../utils/keyboard';
import { KeyboardDismissButton } from './KeyboardDismissButton';

interface SmartSmsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: CurrencyCode;
  onSaveExpense: (
    expense: Omit<Expense, 'id' | 'createdAt'>,
    sourceRect?: DOMRect
  ) => void;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const SmartSmsSheet: React.FC<SmartSmsSheetProps> = ({
  isOpen,
  onClose,
  categories,
  currency,
  onSaveExpense,
  soundEnabled = true,
  language = 'ar',
}) => {
  const isEn = language === 'en';
  const { isKeyboardOpen } = useKeyboardState();

  // Privacy Rule: rawSms is only kept in volatile state during typing/pasting, never saved to storage!
  const [rawSms, setRawSms] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDepositIgnored, setIsDepositIgnored] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<ParsedBankSms | null>(null);

  // Editable fields in preview state
  const [title, setTitle] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [payer, setPayer] = useState<string>(isEn ? 'Husband' : 'الزوج');
  const [notes, setNotes] = useState<string>('');
  const [isLearnedBadge, setIsLearnedBadge] = useState<boolean>(false);
  const [initialPredictedCategoryId, setInitialPredictedCategoryId] = useState<string>('');

  const handleResetAndClose = () => {
    // Zero out raw SMS text immediately for privacy - never persist
    setRawSms('');
    setParseError(null);
    setIsDepositIgnored(false);
    setPreviewData(null);
    setTitle('');
    setAmountStr('');
    setCategoryId('');
    setDate('');
    setNotes('');
    onClose();
  };

  const handlePasteFromClipboard = async () => {
    nativeHaptics.tap(soundEnabled);
    try {
      if (Capacitor.isNativePlatform()) {
        const clipResult = await Clipboard.read();
        if (clipResult && clipResult.value) {
          setRawSms(clipResult.value);
          triggerParse(clipResult.value);
          return;
        }
      }
    } catch {
      // Fallback to web clipboard
    }

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setRawSms(text);
          triggerParse(text);
          return;
        }
      }
      setParseError(isEn ? 'Clipboard is empty or could not be read.' : 'الحافظة فارغة أو تعذر القراءة منها، يرجى اللصق يدوياً.');
    } catch {
      setParseError(isEn ? 'Please allow clipboard access or paste manually.' : 'يرجى منح إذن الحافظة أو لصق الرسالة يدوياً في الحقل.');
    }
  };

  const triggerParse = (textToParse: string) => {
    setParseError(null);
    setIsDepositIgnored(false);

    const result = parseBankSms(textToParse, categories);

    if (!result.success) {
      if (result.isDeposit) {
        setIsDepositIgnored(true);
      }
      setParseError(result.errorMessage || (isEn ? 'Failed to parse SMS' : 'تعذر قراءة بيانات الرسالة'));
      setPreviewData(null);
      return;
    }

    if (result.data) {
      const d = result.data;
      setPreviewData(d);
      setTitle(d.merchant);
      setAmountStr(String(d.amount));
      setCategoryId(d.categoryId); // will be '' if merchant unknown
      setInitialPredictedCategoryId(d.categoryId);
      setDate(d.date || getLocalToday());
      setPaymentMethod(d.paymentMethod);
      setIsLearnedBadge(Boolean(d.isLearned));
      setPayer(isEn ? 'Husband' : 'الزوج');
      setNotes('');
    }
  };

  const handleManualParseClick = () => {
    nativeHaptics.tap(soundEnabled);
    triggerParse(rawSms);
  };

  const handleSaveParsedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setParseError(isEn ? 'Choose a category' : 'اختر تصنيفاً');
      return;
    }
    const finalAmount = parseFloat(amountStr);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setParseError(isEn ? 'Please enter a valid amount' : 'يرجى كتابة مبلغ صالح');
      return;
    }
    if (!title.trim()) {
      setParseError(isEn ? 'Please enter a merchant or description' : 'يرجى تحديد اسم التاجر أو الوصف');
      return;
    }

    nativeHaptics.tap(soundEnabled);

    // Call saveLearnedRule only when merchant !== 'عملية بنكية' and categoryId is non-empty
    if (title.trim() && title.trim() !== 'عملية بنكية' && categoryId) {
      saveLearnedRule(title.trim(), categoryId);
    }

    onSaveExpense({
      title: title.trim(),
      amount: finalAmount,
      categoryId,
      date: date || getLocalToday(),
      paymentMethod,
      payer,
      notes: notes.trim() || undefined,
    });

    handleResetAndClose();
  };

  const paymentOptions: Array<{ id: PaymentMethod; label: string; icon: any }> = [
    { id: 'card', label: isEn ? 'Card / Mada' : 'بطاقة / مدى', icon: CreditCard },
    { id: 'digital', label: isEn ? 'Apple Pay' : 'أبل باي / محفظة', icon: Smartphone },
    { id: 'cash', label: isEn ? 'Cash' : 'كاش / سحب', icon: Banknote },
    { id: 'transfer', label: isEn ? 'Transfer' : 'حوالة', icon: ArrowRightLeft },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center select-none">
          {/* Dimmed Backdrop (Dismisses keyboard first if open, or closes sheet if keyboard is closed) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fades.fast}
            onClick={(e) => handleModalBackdropClick(e, handleResetAndClose, soundEnabled)}
            className="absolute inset-0 bg-black/55 cursor-pointer"
          />

          {/* Draggable Bottom Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) {
                nativeHaptics.tap(soundEnabled);
                handleResetAndClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.smooth}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
                dismissKeyboard();
              }
            }}
            className="relative w-full max-w-lg max-h-[92vh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden z-10 border-t border-emerald-500/20"
          >
            {/* Grabber Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B2319] dark:text-white">
                    {isEn ? 'Smart Bank SMS Import' : 'استيراد الرسائل البنكية الذكي'}
                  </h3>
                  <span className="text-[10px] text-[#5C8271] dark:text-[#8E8E93] block">
                    {isEn ? '100% on-device local parsing & learning' : 'استخراج فوري محلي وتعلم ذكي على جهازك فقط'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <KeyboardDismissButton
                  visible={isKeyboardOpen}
                  isEnglish={isEn}
                  soundEnabled={soundEnabled}
                />
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-5 pb-[max(env(safe-area-inset-bottom),24px)] space-y-4 no-scrollbar">
              {/* STEP 1: Input & Paste Area (if not yet in preview, or user wants to re-paste) */}
              {!previewData ? (
                <div className="space-y-3">
                  <div className="bg-[#EAF6F0] dark:bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
                    <p className="font-bold flex items-center gap-1.5 mb-1">
                      <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                      {isEn ? 'Double-tap shortcut detected' : 'ميزة الضغط المزدوج السريعة'}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {isEn
                        ? 'Paste any Saudi bank notification (Al Rajhi, SNB, Alinma, STC Pay, etc.). The app extracts the amount, merchant, and learns your categorization.'
                        : 'انسخ رسالة الشراء من أي بنك سعودي (الراجحي، الأهلي، الإنماء، STC Pay...)، وسيتم استخراج المبلغ والتاجر وتصنيف العملية تلقائياً.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                      {isEn ? 'Bank SMS Text' : 'نص رسالة البنك'}
                    </label>
                    <textarea
                      rows={3}
                      value={rawSms}
                      onChange={(e) => {
                        setRawSms(e.target.value);
                        setParseError(null);
                        setIsDepositIgnored(false);
                      }}
                      placeholder={
                        isEn
                          ? 'Paste SMS here: e.g. "Purchase: SAR 85.00 at Starbucks via Mada on 2026-05-10"'
                          : 'الصق الرسالة هنا: مثال "شراء بـ 150.00 رس من بطاقة مدى لدى أسواق بنده..."'
                      }
                      className="w-full p-3 rounded-2xl bg-[#EAF6F0]/60 dark:bg-[#2C2C2E] border border-emerald-500/15 text-xs text-[#0B2319] dark:text-white placeholder:text-[#8E8E93] outline-hidden focus:ring-2 focus:ring-emerald-500/50 resize-none font-medium"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <ClipboardPaste size={16} />
                      <span>{isEn ? 'Paste from Clipboard' : 'لصق من الحافظة'}</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      disabled={!rawSms.trim()}
                      onClick={handleManualParseClick}
                      className="py-3 px-4 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer hover:bg-emerald-50/50"
                    >
                      <span>{isEn ? 'Parse' : 'تحليل'}</span>
                    </motion.button>
                  </div>

                  {/* Privacy Guarantee Note */}
                  <div className="text-[10px] text-center text-[#5C8271] dark:text-[#8E8E93] flex items-center justify-center gap-1 pt-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>{isEn ? 'Strict privacy: Raw message text is NEVER stored' : 'خصوصية تامة: نص الرسالة الأصلي لا يتم حفظه إطلاقاً'}</span>
                  </div>
                </div>
              ) : null}

              {/* Status / Error Banner */}
              {parseError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold ${
                    isDepositIgnored
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400'
                  }`}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">
                    {parseError}
                    {isDepositIgnored && (
                      <p className="text-[11px] mt-0.5 opacity-85">
                        {isEn
                          ? 'Halala & Qirsh only logs expenditures to protect your household budget.'
                          : 'برنامج هللة وقرش مخصص لمتابعة المصاريف والخصومات فقط لتنظيم ميزانية البيت.'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Editable Preview Screen Before Saving */}
              {previewData && (
                <form onSubmit={handleSaveParsedExpense} className="space-y-4">
                  {/* Top Notification Badge */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>{isEn ? 'Parsed Successfully' : 'تم استخراج البيانات بنجاح'}</span>
                    </div>
                    {isLearnedBadge && (
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                        {isEn ? 'Learned Category' : 'تصنيف متعلم سابقاً'}
                      </span>
                    )}
                  </div>

                  {/* Big Amount Field */}
                  <div className="bg-[#EAF6F0] dark:bg-[#2C2C2E] p-3.5 rounded-3xl border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] text-[#5C8271] dark:text-[#8E8E93] font-semibold mb-1">
                      {isEn ? 'Amount (SAR)' : 'المبلغ المستخرج (ريال)'}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        className="w-44 text-center text-3xl font-black text-[#0B2319] dark:text-white bg-transparent border-none outline-hidden tabular-nums"
                        required
                      />
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Merchant / Description */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5 flex items-center gap-1.5">
                      <Store size={14} />
                      <span>{isEn ? 'Merchant / Store' : 'التاجر / المتجر'}</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isEn ? 'Store name' : 'اسم المتجر أو الوصف'}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#EAF6F0]/60 dark:bg-[#2C2C2E] border border-emerald-500/15 text-xs font-bold text-[#0B2319] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                      required
                    />
                  </div>

                  {/* Category Selection with Instant Learning Indicator & Visual Warning */}
                  <div
                    data-testid="category-picker-container"
                    className={`transition-all ${
                      previewData.needsCategory && !categoryId
                        ? 'border-2 border-red-500 bg-red-50/40 dark:bg-red-950/20 rounded-2xl p-2.5 ring-2 ring-red-500/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#636366] dark:text-[#AEAEB2] flex items-center gap-1.5">
                        <Tag size={14} />
                        <span>{isEn ? 'Category' : 'التصنيف'}</span>
                      </label>
                      {categoryId && categoryId !== initialPredictedCategoryId ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {isEn ? 'Will learn for next time' : 'سيتم حفظه للتعلم مستقبلاً'}
                        </span>
                      ) : previewData.needsCategory && !categoryId ? (
                        <span className="text-[11px] text-red-600 dark:text-red-400 font-bold">
                          {isEn ? 'Choose a category' : 'اختر تصنيفاً'}
                        </span>
                      ) : null}
                    </div>

                    {!categoryId && (
                      <div
                        data-testid="category-warning-banner"
                        className="p-2 mb-2 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900/60 text-red-700 dark:text-red-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <AlertCircle size={14} className="text-red-500 shrink-0" />
                        <span>{isEn ? 'Choose a category' : 'اختر تصنيفاً'}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map((cat) => {
                        const isSelected = categoryId === cat.id;
                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onClick={() => {
                              nativeHaptics.tap(soundEnabled);
                              setCategoryId(cat.id);
                            }}
                            className={`p-2.5 rounded-2xl flex items-center gap-2 border text-start transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 shadow-2xs ring-1 ring-emerald-500'
                                : 'bg-white dark:bg-[#2C2C2E] border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
                            }`}
                          >
                            <CategoryIcon
                              iconName={cat.icon}
                              color={cat.color}
                              bgColor={cat.bgColor}
                              size="sm"
                            />
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected
                                  ? 'text-emerald-800 dark:text-emerald-300'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {isEn ? cat.nameEn || cat.name : cat.name}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Payment Method */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5 flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{isEn ? 'Date' : 'التاريخ'}</span>
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-2xl bg-[#EAF6F0]/60 dark:bg-[#2C2C2E] border border-emerald-500/15 text-xs font-bold text-[#0B2319] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                        {isEn ? 'Payment Method' : 'طريقة الدفع'}
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 rounded-2xl bg-[#EAF6F0]/60 dark:bg-[#2C2C2E] border border-emerald-500/15 text-xs font-bold text-[#0B2319] dark:text-white outline-hidden cursor-pointer"
                      >
                        {paymentOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Payer */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                      {isEn ? 'Payer' : 'الدافع'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'الزوج', label: isEn ? 'Husband' : 'الزوج' },
                        { id: 'الزوجة', label: isEn ? 'Wife' : 'الزوجة' },
                        { id: 'مشترك', label: isEn ? 'Joint' : 'مشترك' },
                      ].map((p) => {
                        const isSelected = payer === p.id || payer === p.label;
                        return (
                          <motion.button
                            key={p.id}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => {
                              nativeHaptics.tap(soundEnabled);
                              setPayer(isEn ? p.label : p.id);
                            }}
                            className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-[#EAF6F0]/60 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 border-transparent hover:bg-emerald-100/50'
                            }`}
                          >
                            {p.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action Buttons: Save or Re-parse */}
                  <div className="pt-2 flex items-center gap-2">
                    <motion.button
                      whileTap={!categoryId ? {} : { scale: 0.95 }}
                      type="submit"
                      disabled={!categoryId}
                      aria-disabled={!categoryId}
                      data-testid="save-parsed-expense"
                      className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                        !categoryId
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed shadow-none'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/25 cursor-pointer hover:brightness-105'
                      }`}
                    >
                      {!categoryId ? (
                        <>
                          <AlertCircle size={16} className="text-amber-500 shrink-0" />
                          <span>{isEn ? 'Choose a category' : 'اختر تصنيفاً'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>{isEn ? 'Save Expense' : 'حفظ المصروف المستخرج'}</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#2C2C2E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-50"
                      title={isEn ? 'Paste another message' : 'رسالة أخرى'}
                    >
                      <RefreshCw size={16} />
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
