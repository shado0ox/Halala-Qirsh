import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarRange, X, Check, Calculator, Sparkles } from 'lucide-react';
import { CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';
import { handleModalBackdropClick, dismissKeyboard, useKeyboardState } from '../utils/keyboard';
import { KeyboardDismissButton } from './KeyboardDismissButton';

interface AnnualBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnnualBudget: number;
  monthlyBudget: number;
  currency: CurrencyCode;
  onSave: (newAnnualBudget: number) => void;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const AnnualBudgetModal: React.FC<AnnualBudgetModalProps> = ({
  isOpen,
  onClose,
  currentAnnualBudget,
  monthlyBudget,
  currency,
  onSave,
  soundEnabled = true,
  language = 'ar',
}) => {
  const isEn = language === 'en';
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');
  const { isKeyboardOpen } = useKeyboardState();

  const [amountStr, setAmountStr] = useState<string>(
    String(currentAnnualBudget > 0 ? currentAnnualBudget : monthlyBudget * 12 || 120000)
  );

  useEffect(() => {
    if (isOpen) {
      setAmountStr(String(currentAnnualBudget > 0 ? currentAnnualBudget : monthlyBudget * 12 || 120000));
    }
  }, [isOpen, currentAnnualBudget, monthlyBudget]);

  const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);

  const handleQuickAdd = (delta: number) => {
    nativeHaptics.tap(soundEnabled);
    const curr = parseFloat(amountStr) || 0;
    setAmountStr(String(Math.max(0, curr + delta)));
  };

  const handleAutoMultiplyMonthly = () => {
    nativeHaptics.success(soundEnabled);
    const calculated = Math.round(monthlyBudget * 12);
    setAmountStr(String(calculated > 0 ? calculated : 120000));
  };

  const handleSave = () => {
    if (parsedAmount <= 0) return;
    nativeHaptics.success(soundEnabled);
    onSave(parsedAmount);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none">
        {/* Backdrop (dismisses keyboard first if open) */}
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
            const target = e.target as HTMLElement;
            if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
              dismissKeyboard();
            }
          }}
          className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border-t sm:border border-slate-200/50 dark:border-slate-800"
        >
          {/* Header Grabber (mobile sheet) */}
          <div className="w-full flex sm:hidden justify-center pt-3 pb-1 cursor-grab">
            <div className="w-11 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CalendarRange size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Set Total Annual Budget' : 'تحديد الميزانية السنوية الإجمالية'}
                </h3>
                <span className="text-[10px] text-[#8E8E93] block">
                  {isEn ? 'Track spending over the full year' : 'تتبع سقف الإنفاق السنوي ومعدل الصرف طوال العام'}
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
                {isEn ? 'Annual Budget Target' : 'المبلغ الإجمالي لميزانية السنة'}
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
                  className="text-3xl font-black text-[#1C1C1E] dark:text-white bg-transparent text-center outline-hidden border-b-2 border-emerald-500/40 focus:border-emerald-500 transition-colors py-1 tabular-nums max-w-[240px]"
                />
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {currencySymbol}
                </span>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {[10000, 25000, 50000, 100000].map((add) => (
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

            {/* Quick Helper: Multiply Monthly */}
            {monthlyBudget > 0 && (
              <button
                type="button"
                onClick={handleAutoMultiplyMonthly}
                className="w-full p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between hover:bg-emerald-100/60 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Calculator size={15} />
                  <span>
                    {isEn
                      ? `Auto-calculate: 12 × Monthly Budget (${(monthlyBudget * 12).toLocaleString()} ${currencySymbol})`
                      : `حساب تلقائي: 12 × الميزانية الشهرية (${(monthlyBudget * 12).toLocaleString()} ${currencySymbol})`}
                  </span>
                </span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                  {isEn ? 'Apply' : 'تطبيق'}
                </span>
              </button>
            )}

            {/* Info note */}
            <div className="p-3.5 rounded-2xl bg-[#F2F2F7]/60 dark:bg-[#2C2C2E]/40 border border-slate-200/60 dark:border-slate-800 text-xs text-[#8E8E93] leading-relaxed">
              <p>
                {isEn
                  ? 'Your annual budget allows you to monitor spending trajectory across all 12 months, ensuring your cumulative spend stays aligned with long-term financial goals.'
                  : 'تحديد الميزانية السنوية يتيح لك مراقبة مسار الصرف التراكمي على مدار شهور العام الـ 12، والتأكد من توافق النفقات الفعلية مع أهدافك المالية السنوية.'}
              </p>
            </div>

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
                disabled={parsedAmount <= 0}
                onClick={handleSave}
                className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>{isEn ? 'Save Annual Budget' : 'حفظ الميزانية السنوية'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
