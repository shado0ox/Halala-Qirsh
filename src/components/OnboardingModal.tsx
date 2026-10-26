import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  PieChart,
  Wallet,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CurrencyCode, BudgetSettings } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (updated: Partial<BudgetSettings>) => void;
  soundEnabled?: boolean;
  currentLanguage?: 'ar' | 'en';
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  soundEnabled = true,
  currentLanguage = 'ar',
}) => {
  const [step, setStep] = useState<number>(0);
  const [lang, setLang] = useState<'ar' | 'en'>(currentLanguage);
  const [currency, setCurrency] = useState<CurrencyCode>('SAR');
  const [salaryDay, setSalaryDay] = useState<number>(27);

  const isEn = lang === 'en';
  const isRTL = lang === 'ar';

  const slides = [
    {
      icon: (
        <svg className="w-20 h-20 text-emerald-500" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" fill="rgba(16, 185, 129, 0.12)" />
          <path
            d="M24 42L40 26L56 42V56C56 57.1046 55.1046 58 54 58H26C24.8954 58 24 57.1046 24 56V42Z"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="40" cy="45" r="5" stroke="#10B981" strokeWidth="3" />
        </svg>
      ),
      title: isEn ? 'Private & 100% Offline' : 'خصوصية مطلقة وتخزين محلي 100%',
      subtitle: isEn
        ? 'No cloud servers, no account required, and zero telemetry. All household budgets stay encrypted exclusively on your iPhone.'
        : 'لا خوادم سحابية ولا حسابات ولا تتبع. كافة مصاريف وفواتير البيت مشفرة ومحفوظة حصراً على جهازك داخل سلسلة مفاتيح أبل.',
    },
    {
      icon: (
        <svg className="w-20 h-20 text-emerald-500" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" fill="rgba(52, 211, 153, 0.12)" />
          <path
            d="M26 54L38 42L46 50L56 34"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M48 34H56V42"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: isEn ? 'Smart Envelopes & Limits' : 'أظرف النفقات ومراقبة الميزانية',
      subtitle: isEn
        ? 'Distribute monthly expenses across customized envelopes, track daily spending allowances, and manage recurring family bills.'
        : 'وزع دخلك على أظرف نفقات محددة، راقب معدل الصرف اليومي المتاح، وتجنب المفاجآت بنهاية الشهر مع تنبيهات الفواتير الذكية.',
    },
    {
      icon: (
        <svg className="w-20 h-20 text-emerald-500" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" fill="rgba(16, 185, 129, 0.15)" />
          <path
            d="M40 24V56M28 36C28 32 34 30 40 30C46 30 52 32 52 36C52 42 28 42 28 48C28 52 34 54 40 54C46 54 52 52 52 48"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: isEn ? 'Setup Your Preference' : 'ضبط العملة والراتب ولغة التطبيق',
      subtitle: isEn
        ? 'Choose your primary household currency and monthly budget cycle.'
        : 'اختر العملة المفضلة لك ويوم إيداع الراتب لبدء تتبع نفقاتك باحترافية.',
    },
  ];

  const handleNext = () => {
    nativeHaptics.tap(soundEnabled);
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      nativeHaptics.success(soundEnabled);
      onComplete({
        hasCompletedOnboarding: true,
        language: lang,
        currency,
        salaryDay,
      });
    }
  };

  const handleBack = () => {
    nativeHaptics.tap(soundEnabled);
    if (step > 0) setStep(step - 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={springs.smooth}
        className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-2xl border border-white/20 dark:border-white/10 text-center space-y-5"
      >
        {/* Animated Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: isRTL ? -25 : 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 25 : -25 }}
            transition={springs.smooth}
            className="space-y-4"
          >
            {/* Illustrated Icon with gentle float */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="flex justify-center pt-2"
            >
              {slides[step].icon}
            </motion.div>

            <div>
              <h2 className="text-lg font-black text-[#1C1C1E] dark:text-white tracking-tight">
                {slides[step].title}
              </h2>
              <p className="text-xs text-[#8E8E93] leading-relaxed mt-1.5 px-2">
                {slides[step].subtitle}
              </p>
            </div>

            {/* Step 3: Interactive Configuration */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-2 text-right"
              >
                {/* Language Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Language' : 'لغة الواجهة'}
                  </span>
                  <div className="flex items-center gap-1 font-bold">
                    <button
                      type="button"
                      onClick={() => setLang('ar')}
                      className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                        lang === 'ar' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => setLang('en')}
                      className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                        lang === 'en' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Currency Picker */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Currency' : 'العملة الأساسية'}
                  </span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="px-3 py-1 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-hidden cursor-pointer"
                  >
                    {Object.entries(CURRENCY_SYMBOLS).map(([code, meta]) => (
                      <option key={code} value={code}>
                        {code} ({meta.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Day */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Salary deposit day' : 'يوم إيداع الراتب'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={salaryDay}
                      onChange={(e) => setSalaryDay(parseInt(e.target.value, 10) || 1)}
                      className="w-16 px-2 py-1 text-center rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-hidden tabular-nums"
                    />
                    <span className="text-[#8E8E93] text-[11px]">{isEn ? 'of month' : 'من الشهر'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Morphing Page Dots Indicator */}
        <div className="flex items-center justify-center gap-1.5 pt-2">
          {slides.map((_, idx) => (
            <motion.div
              key={idx}
              animate={{
                width: step === idx ? 24 : 7,
                backgroundColor: step === idx ? '#10B981' : '#D1D5DB',
              }}
              transition={springs.smooth}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-2 pt-1">
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={handleBack}
              className="px-4 py-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
            >
              {isEn ? 'Back' : 'السابق'}
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleNext}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{step === slides.length - 1 ? (isEn ? 'Get Started' : 'ابدأ استخدام التطبيق') : (isEn ? 'Next' : 'التالي')}</span>
            {isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
