import React, { useRef, useState } from 'react';
import {
  PieChart,
  Download,
  Upload,
  Trash2,
  Calendar,
  Volume2,
  ShieldCheck,
  Users,
  BellRing,
  Sparkles,
  Lock,
  Clock,
  Globe,
  Share2,
  FileText,
  Moon,
  Sun,
  Smartphone,
  Eye,
  Activity,
  Layers,
  ExternalLink,
  CreditCard,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { HalalaQirshLogo } from '../HalalaQirshLogo';
import {
  Category,
  Expense,
  BudgetSettings,
  CurrencyCode,
  AppData,
} from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import { CategoryExpensesPieChart } from '../CategoryExpensesPieChart';
import { Amount } from '../Amount';
import {
  CURRENCY_SYMBOLS,
  formatMoney,
  exportDataAsJSON,
  exportExpensesToCSV,
  validateBackupData,
} from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { NotificationPermissionState } from '../../utils/notifications';
import { translations } from '../../utils/i18n';
import { startSystemFlow, endSystemFlow } from '../../utils/systemFlow';
import { springs, fades, useMotionConfig } from '../../utils/motion';

interface AnalyticsSettingsTabProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  fullData: AppData;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
  onImportData: (data: AppData) => void;
  onClearAllData: () => void;
  onRequestNotificationPermission: () => Promise<void>;
  onSendTestNotification: () => void;
  notificationPermission: NotificationPermissionState;
  onOpenPasscodeModal: (mode: 'set' | 'change') => void;
  onDisablePasscode: () => void;
  onOpenPrivacyPolicy: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenApplePaySetup?: () => void;
}

export const AnalyticsSettingsTab: React.FC<AnalyticsSettingsTabProps> = ({
  categories,
  expenses,
  settings,
  fullData,
  onUpdateSettings,
  onImportData,
  onClearAllData,
  onRequestNotificationPermission,
  onSendTestNotification,
  notificationPermission,
  onOpenPasscodeModal,
  onDisablePasscode,
  onOpenPrivacyPolicy,
  onShowToast,
  onOpenApplePaySetup,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const lang = settings.language || 'ar';
  const t = translations[lang];
  const isEn = lang === 'en';

  const currentMonth = settings.selectedMonth;
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Payer breakdown
  const payerMap = new Map<string, number>();
  monthlyExpenses.forEach((e) => {
    payerMap.set(e.payer, (payerMap.get(e.payer) || 0) + e.amount);
  });

  const handleCurrencyChange = (curr: CurrencyCode) => {
    nativeHaptics.tap(settings.soundEnabled);
    onUpdateSettings({ currency: curr });
  };

  const handleLanguageToggle = (newLang: 'ar' | 'en') => {
    nativeHaptics.tap(settings.soundEnabled);
    onUpdateSettings({ language: newLang });
  };

  const handleThemeModeChange = (mode: 'system' | 'light' | 'dark') => {
    nativeHaptics.tap(settings.soundEnabled);
    onUpdateSettings({ themeMode: mode });
  };

  const handleAnimationModeChange = (mode: 'full' | 'reduced' | 'off') => {
    nativeHaptics.tap(settings.soundEnabled);
    onUpdateSettings({ animations: mode });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (validateBackupData(parsed)) {
            nativeHaptics.success(settings.soundEnabled);
            onImportData(parsed);
            onShowToast?.(isEn ? 'Backup restored successfully' : 'تم استعادة النسخة الاحتياطية بنجاح', 'success');
          } else {
            onShowToast?.(isEn ? 'Invalid backup file format' : 'ملف النسخة الاحتياطية غير صالح', 'error');
          }
        } catch {
          onShowToast?.(isEn ? 'Error reading backup file' : 'حدث خطأ أثناء قراءة الملف', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    } finally {
      endSystemFlow();
    }
  };

  const handleOpenShortcutsApp = async () => {
    nativeHaptics.tap(settings.soundEnabled);
    try {
      await AppLauncher.openUrl({ url: 'shortcuts://' });
    } catch {
      // Ignore if cannot open shortcuts
    }
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar pb-8">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight">
          {t.reportsSettings}
        </h1>
        <p className="text-xs text-[#8E8E93]">{t.reportsSubtitle}</p>
      </div>

      {/* SECTION 1: RECHARTS CATEGORY EXPENSE PIE CHART */}
      <CategoryExpensesPieChart
        categories={categories}
        expenses={expenses}
        settings={settings}
        currentMonth={currentMonth}
        language={lang}
        hideAmounts={Boolean(settings.hideAmounts)}
      />

      {/* Family Payer Breakdown */}
      {monthlyExpenses.length > 0 && (
        <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1.5">
            <Users size={15} className="text-emerald-500" />
            <span>{t.familyPaymentShare}</span>
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {(['الزوج', 'الزوجة', 'مشترك'] as const).map((p) => {
              const amount = payerMap.get(p) || 0;
              const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
              const payerLabel = isEn ? (p === 'الزوج' ? t.husband : p === 'الزوجة' ? t.wife : t.joint) : p;

              return (
                <div key={p} className="p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                  <span className="text-[10px] text-[#8E8E93] block font-semibold">{payerLabel}</span>
                  <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums block mt-0.5">
                    <Amount
                      value={amount}
                      currency={settings.currency}
                      lang={lang}
                      hideAmounts={Boolean(settings.hideAmounts)}
                    />
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: APPEARANCE & ANIMATIONS */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
        <span className="text-xs font-bold text-[#8E8E93] block">
          {isEn ? 'Appearance & Motion' : 'المظهر والحركات التفاعلية'}
        </span>

        {/* Theme Segmented Switch */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#1C1C1E] dark:text-white">
            {isEn ? 'Theme' : 'سمة المظهر'}
          </span>
          <div className="flex items-center gap-1 bg-[#EAF6F0] dark:bg-[#2C2C2E] p-1 rounded-2xl border border-emerald-500/15 dark:border-transparent">
            {[
              { id: 'system', label: isEn ? 'System' : 'تلقائي' },
              { id: 'light', label: isEn ? 'Luminous' : 'مشرق (أخضر)' },
              { id: 'dark', label: isEn ? 'Dark' : 'داكن' },
            ].map((th) => {
              const isActive = settings.themeMode === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => handleThemeModeChange(th.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-emerald-900/70 hover:text-emerald-900 dark:text-slate-300'
                  }`}
                >
                  {th.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Motion / Animation Preset Setting */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div>
            <span className="font-bold text-[#1C1C1E] dark:text-white block">
              {isEn ? 'Animations' : 'المؤثرات الحركية'}
            </span>
            <span className="text-[10px] text-[#8E8E93]">
              {isEn ? 'Controls springs & transitions' : 'التحكم في سلاسة وسرعة الحركات'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1 rounded-2xl">
            {[
              { id: 'full', label: isEn ? 'Full' : 'كاملة' },
              { id: 'reduced', label: isEn ? 'Reduced' : 'مخففة' },
              { id: 'off', label: isEn ? 'Off' : 'إيقاف' },
            ].map((anim) => {
              const currentAnim = settings.animations || 'full';
              const isActive = currentAnim === anim.id;
              return (
                <button
                  key={anim.id}
                  onClick={() => handleAnimationModeChange(anim.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {anim.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
          <span className="font-bold text-[#1C1C1E] dark:text-white">
            {isEn ? 'Language' : 'لغة الواجهة'}
          </span>
          <div className="flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1 rounded-2xl">
            <button
              onClick={() => handleLanguageToggle('ar')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                lang === 'ar' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => handleLanguageToggle('en')}
              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                lang === 'en' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Currency Code Selection */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
          <span className="font-bold text-[#1C1C1E] dark:text-white">
            {isEn ? 'Currency' : 'العملة الأساسية'}
          </span>
          <select
            value={settings.currency}
            onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
            className="px-3 py-1.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] border-none font-bold text-slate-800 dark:text-white outline-hidden cursor-pointer"
          >
            {Object.entries(CURRENCY_SYMBOLS).map(([code, meta]) => (
              <option key={code} value={code}>
                {code} ({meta.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 3: KEYCHAIN SECURITY & PASSCODE */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3.5">
        <span className="text-xs font-bold text-[#8E8E93] block">
          {isEn ? 'Apple Keychain & Security' : 'أمان سلسلة مفاتيح أبل (iOS Keychain)'}
        </span>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Lock size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                {isEn ? 'Passcode & Biometrics' : 'رمز الدخول وقفل التطبيق'}
              </span>
              <span className="text-[10px] text-[#8E8E93]">
                {settings.isPasscodeEnabled
                  ? (isEn ? 'Secured with hardware Keychain' : 'مفعل ومشفر بسلسلة مفاتيح iOS')
                  : (isEn ? 'Passcode protection disabled' : 'القفل غير مفعل')}
              </span>
            </div>
          </div>

          {settings.isPasscodeEnabled ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPasscodeModal('change')}
                className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-xl cursor-pointer"
              >
                {isEn ? 'Change' : 'تغيير'}
              </button>
              <button
                onClick={onDisablePasscode}
                className="px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-xl cursor-pointer"
              >
                {isEn ? 'Disable' : 'إلغاء'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenPasscodeModal('set')}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
            >
              {isEn ? 'Set Passcode' : 'تعيين رمز'}
            </button>
          )}
        </div>

        {/* Auto-Lock Timeout Selector */}
        {settings.isPasscodeEnabled && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Clock size={13} className="text-blue-500" />
              <span className="font-semibold text-[11px]">
                {isEn ? 'Lock after:' : 'القفل التلقائي بعد:'}
              </span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-[11px]">
              {[
                { sec: 0, label: isEn ? 'Immediately' : 'فوراً' },
                { sec: 30, label: isEn ? '30s' : '30 ثانية' },
                { sec: 60, label: isEn ? '1m' : 'دقيقة' },
                { sec: 300, label: isEn ? '5m' : '5 دقائق' },
              ].map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => {
                    nativeHaptics.tap(settings.soundEnabled);
                    onUpdateSettings({ autoLockTimeout: opt.sec });
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    (settings.autoLockTimeout ?? 30) === opt.sec
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION: BACK TAP SHORTCUT (تسجيل بالضغط على ظهر الهاتف) */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              {t.backTapSectionTitle}
            </h4>
            <p className="text-[10px] text-[#8E8E93]">
              {t.backTapSectionSubtitle}
            </p>
          </div>
        </div>

        {/* Open Shortcuts App Action Button - visible only on native devices */}
        {Capacitor.isNativePlatform() && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            data-testid="add-back-tap-shortcut-btn"
            onClick={handleOpenShortcutsApp}
            className="w-full min-h-[44px] p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer hover:brightness-105 transition-all"
          >
            <Sparkles size={16} />
            <span>{t.backTapAddShortcutBtn}</span>
            <ExternalLink size={14} className="opacity-80" />
          </motion.button>
        )}

        {/* Numbered Setup Steps */}
        <div className="space-y-2.5 pt-1 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
          {[
            { num: 1, text: t.backTapStep1 },
            { num: 2, text: t.backTapStep2 },
            { num: 3, text: t.backTapStep3 },
            { num: 4, text: t.backTapStep4 },
          ].map((st) => (
            <div key={st.num} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                {st.num}
              </span>
              <span className="leading-relaxed font-medium">{st.text}</span>
            </div>
          ))}
        </div>

        {/* Note banner */}
        <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[11px] text-[#8E8E93] dark:text-[#AEAEB2] leading-relaxed flex items-start gap-2">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t.backTapNote}</span>
        </div>
      </div>

      {/* SECTION: APPLE PAY AUTO-LOGGING (تسجيل تلقائي عند الدفع بـ Apple Pay) */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
              Pay
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {t.applePaySectionTitle}
              </h4>
              <p className="text-[10px] text-[#8E8E93]">
                {t.applePaySectionSubtitle}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            iOS 17+
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenApplePaySetup?.();
          }}
          className="w-full min-h-[44px] p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-black dark:from-white dark:via-slate-100 dark:to-slate-200 text-white dark:text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95 transition-all"
        >
          <CreditCard size={15} />
          <span>{t.applePaySetupGuideBtn}</span>
        </motion.button>

        <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[11px] text-[#8E8E93] dark:text-[#AEAEB2] leading-relaxed flex items-start gap-2">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t.applePayReq1}</span>
        </div>
      </div>

      {/* SECTION 4: DATA EXPORT & SHARE SHEET */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
        <span className="text-xs font-bold text-[#8E8E93] block">
          {isEn ? 'Backup & Apple Share Sheet' : 'النسخ الاحتياطي ومشاركة البيانات'}
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              nativeHaptics.tap(settings.soundEnabled);
              startSystemFlow();
              try {
                await exportDataAsJSON(fullData);
              } finally {
                setTimeout(endSystemFlow, 1000);
              }
            }}
            className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
          >
            <Download size={15} className="text-emerald-500" />
            <span>{isEn ? 'Export JSON Backup' : 'تصدير نسخة JSON'}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              nativeHaptics.tap(settings.soundEnabled);
              startSystemFlow();
              try {
                await exportExpensesToCSV(fullData.expenses, fullData.categories, settings.currency);
              } finally {
                setTimeout(endSystemFlow, 1000);
              }
            }}
            className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
          >
            <FileText size={15} className="text-blue-500" />
            <span>{isEn ? 'Export CSV Sheet' : 'تصدير جدول CSV'}</span>
          </motion.button>
        </div>

        {/* Import JSON Backup */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            startSystemFlow();
            fileInputRef.current?.click();
          }}
          className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Upload size={14} className="text-emerald-500" />
          <span>{isEn ? 'Restore from JSON Backup' : 'استعادة البيانات من ملف JSON'}</span>
        </motion.button>
      </div>

      {/* SECTION 5: PRIVACY & SYSTEM RESET */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onOpenPrivacyPolicy();
          }}
          className="w-full py-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck size={16} />
          <span>{isEn ? 'Privacy Policy & Zero Data Collection' : 'سياسة الخصوصية وأمان البيانات'}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            nativeHaptics.tap(settings.soundEnabled);
            onClearAllData();
          }}
          className="w-full py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
        >
          <Trash2 size={15} />
          <span>{isEn ? 'Erase All Data' : 'مسح كافة البيانات من الجهاز'}</span>
        </motion.button>
      </div>

      {/* BRAND CARD: HALALA & QIRSH */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-slate-500/10 dark:from-emerald-950/40 dark:via-amber-950/20 dark:to-slate-900/40 p-5 rounded-3xl border border-emerald-500/20 dark:border-emerald-500/20 flex flex-col items-center text-center space-y-3">
        <HalalaQirshLogo size="md" withText={false} />
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isEn ? 'Halala & Qirsh' : 'هللة وقرش'}
          </h3>
          <p className="text-[11px] text-[#8E8E93] mt-0.5">
            {isEn
              ? 'Every coin accounted for · 100% Offline & Private'
              : 'نحفظ لك كل هللة وقرش · محلي ومشفر بالكامل على جهازك'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-black/30 border border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span>v2.4.0</span>
          <span>•</span>
          <span>Apple Local Vault</span>
        </div>
      </div>
    </div>
  );
};