import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard,
  Zap,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  PlayCircle,
  PlusCircle,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { springs, fades } from '../utils/motion';
import { nativeHaptics } from '../utils/nativeHaptics';
import { useTranslation } from '../utils/i18n';

interface ApplePaySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulateTest: () => void;
  onOpenManualEntry: () => void;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const ApplePaySetupModal: React.FC<ApplePaySetupModalProps> = ({
  isOpen,
  onClose,
  onSimulateTest,
  onOpenManualEntry,
  soundEnabled = true,
  language = 'ar',
}) => {
  const { t } = useTranslation(language);
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'steps' | 'compatibility' | 'troubleshoot'>('steps');

  // Detect iOS version if running on iOS user agent
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  let iosMajorVersion: number | null = null;
  if (isIOS) {
    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (match && match[1]) {
      iosMajorVersion = parseInt(match[1], 10);
    }
  }

  const isIOS17OrHigher = iosMajorVersion !== null ? iosMajorVersion >= 17 : true; // assume eligible unless detected < 17

  const openShortcutsApp = () => {
    nativeHaptics.tap(soundEnabled);
    try {
      window.location.href = 'shortcuts://';
    } catch {
      // fallback
    }
  };

  const handleTestClick = () => {
    nativeHaptics.success(soundEnabled);
    onSimulateTest();
  };

  const handleManualFallback = () => {
    nativeHaptics.tap(soundEnabled);
    onClose();
    onOpenManualEntry();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.smooth}
            className="w-full max-w-lg bg-surface dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl border border-border/80 dark:border-dark-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-border/50 dark:border-dark-border flex items-center justify-between bg-gradient-to-b from-primary/10 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg shadow-md">
                  Pay
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">
                    {t.applePaySectionTitle}
                  </h2>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                    {t.applePaySectionSubtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-surface-raised dark:bg-dark-surface-raised flex items-center justify-center text-text-secondary dark:text-dark-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-border/40 dark:border-dark-border/50">
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('steps');
                }}
                className={`pb-2.5 text-xs font-semibold px-2 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'steps'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                {isEn ? 'Setup Steps' : 'خطوات الربط (4 خطوات)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('compatibility');
                }}
                className={`pb-2.5 text-xs font-semibold px-2 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'compatibility'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isEn ? 'Compatibility & iOS 17+' : 'التوافق ونظام iOS'}
              </button>
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('troubleshoot');
                }}
                className={`pb-2.5 text-xs font-semibold px-2 transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'troubleshoot'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {isEn ? 'Troubleshooting' : 'المشاكل الشائعة والبديل'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {activeTab === 'steps' && (
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm">
                        {t.applePayStep1Title}
                      </h4>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {t.applePayStep1Desc}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        {t.applePayStep2Title}
                      </h4>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {t.applePayStep2Desc}
                      </p>
                      <div className="mt-2 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl border border-emerald-500/20">
                        {isEn
                          ? '💡 Tip: Set "Run Immediately" so it records without asking for confirmation every time.'
                          : '💡 نصيحة مهمة: اختر «تشغيل فوراً» وألغِ تفعيل «السؤال قبل التشغيل» لكي يسجل المصروف في الخلفية بدون طلب إذن.'}
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        {t.applePayStep3Title}
                      </h4>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {t.applePayStep3Desc}
                      </p>
                      <div className="mt-2 text-[11px] bg-surface dark:bg-dark-surface p-2 rounded-xl border border-border/60 text-text-secondary dark:text-dark-text-secondary">
                        <span className="font-semibold text-text-primary dark:text-dark-text-primary">
                          {isEn ? 'Action Name: ' : 'اسم الإجراء: '}
                        </span>
                        «{isEn ? 'Log Apple Pay Transaction' : 'تسجيل عملية Apple Pay تلقائياً'}»
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-sm">
                        {t.applePayStep4Title}
                      </h4>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {t.applePayStep4Desc}
                      </p>
                    </div>
                  </div>

                  {/* Shortcuts Button */}
                  <button
                    type="button"
                    onClick={openShortcutsApp}
                    className="w-full py-3 px-4 bg-primary text-white font-medium rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t.applePayOpenShortcutsBtn}
                  </button>
                </div>
              )}

              {activeTab === 'compatibility' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3 ${
                      isIOS17OrHigher
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">
                        {isIOS17OrHigher
                          ? (isEn ? 'Device Compatible with iOS 17+' : 'الجهاز مهيأ لميزة تحكم المعاملات (iOS 17+)')
                          : (isEn ? 'Requires iOS 17.0 or Higher' : 'تتطلب الميزة تحديث الجهاز إلى iOS 17.0 أو أحدث')}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {isIOS17OrHigher
                          ? (isEn
                              ? 'Your iOS environment supports the Shortcuts "Transaction" automation trigger for Apple Pay cards.'
                              : 'نظام جهازك يدعم مشغل المعاملات التلقائي في تطبيق الاختصارات للبطاقات المضافة في Apple Wallet.')
                          : (isEn
                              ? 'On older iOS versions, Shortcuts cannot automatically trigger on Apple Pay. Please use our manual or SMS entry fallback.'
                              : 'في الإصدارات الأقدم من iOS 17، لا يتيح النظام خيار مراقبة المعاملات. يمكنك استخدام التسجيل اليدوي أو قراءة رسائل البنك فوراً.')}
                      </p>
                    </div>
                  </div>

                  {/* Detail Bullet Points */}
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                      <div className="font-semibold text-text-primary dark:text-dark-text-primary text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {isEn ? 'Supported Cards' : 'البطاقات المدعومة'}
                      </div>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {isEn
                          ? 'Any Mada debit card, credit card, or prepaid card active in Apple Wallet.'
                          : 'أي بطاقة مدى، أو بطاقة ائتمانية، أو بطاقة مسبقة الدفع مفعلة في محفظة Apple Pay.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                      <div className="font-semibold text-text-primary dark:text-dark-text-primary text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {isEn ? 'Zero Telemetry & 100% Offline' : 'خصوصية مطلقة ومحلي 100%'}
                      </div>
                      <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed">
                        {isEn
                          ? 'All processing happens locally on your device between Apple Wallet and Halala & Qirsh via iOS AppIntent. No servers or third parties involved.'
                          : 'جميع البيانات تتم معالجتها محلياً داخل جهازك بين Apple Wallet وتطبيق هللة وقرش عبر تقنية AppIntent الرسمية بدون أي خوادم.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'troubleshoot' && (
                <div className="space-y-4">
                  {/* Note about confirmation prompt */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      {isEn ? 'System Prompts "Run" Banner?' : 'هل يظهر إشعار يطلب الضغط للتشغيل؟'}
                    </div>
                    <p className="text-xs mt-2 leading-relaxed opacity-95">
                      {isEn
                        ? 'Certain banks or iOS security policies require user authorization when an automation fires. In that case, simply tap the system notification banner to log the transaction instantly.'
                        : 'في بعض البنوك أو سياسات أمان iOS، قد تظهر رسالة نظام تطلب التأكيد. بمجرد الضغط عليها سيتم ترحيل المصروف مباشرة للتطبيق.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-raised dark:bg-dark-surface-raised border border-border/50 dark:border-dark-border">
                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary text-xs">
                      {isEn ? 'Alternative: URL Scheme Trigger' : 'البديل عبر رابط التطبيق (URL Scheme)'}
                    </h4>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1 leading-relaxed font-mono text-[11px] bg-surface dark:bg-dark-surface p-2 rounded-xl mt-2 select-all">
                      halalaqirsh://applepay?amount=...&merchant=...
                    </p>
                    <p className="text-[11px] text-text-secondary dark:text-dark-text-secondary mt-1">
                      {isEn
                        ? 'You can also use the "Open URLs" action in Shortcuts targeting this scheme if you prefer a visual confirmation popup.'
                        : 'يمكنك أيضاً استخدام إجراء «فتح رابط URL» في الاختصارات إذا كنت تفضل أن يفتح التطبيق نافذة تأكيد ومراجعة.'}
                    </p>
                  </div>

                  {/* Fallback to Manual */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleManualFallback}
                      className="w-full py-2.5 px-4 rounded-xl border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary font-medium hover:bg-surface-raised dark:hover:bg-dark-surface-raised transition-colors text-xs flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-primary" />
                      {t.applePayFallbackManualBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Test & Actions */}
            <div className="p-4 border-t border-border/50 dark:border-dark-border bg-surface-raised/50 dark:bg-dark-surface-raised/50 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleTestClick}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                {t.applePayTestBtn}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:text-text-primary font-medium text-xs transition-colors"
              >
                {t.done}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
