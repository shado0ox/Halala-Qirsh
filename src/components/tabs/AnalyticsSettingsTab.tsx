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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HalalaQirshLogo } from '../HalalaQirshLogo';
import {
  Category,
  Expense,
  BudgetSettings,
  CurrencyCode,
  AppData,
} from '../../types';
import { CategoryIcon } from '../CategoryIcon';
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

  // Category breakdown
  const catSpendMap = new Map<string, number>();
  monthlyExpenses.forEach((e) => {
    catSpendMap.set(e.categoryId, (catSpendMap.get(e.categoryId) || 0) + e.amount);
  });

  const sortedCategoriesBySpend = [...categories]
    .map((c) => ({
      ...c,
      spent: catSpendMap.get(c.id) || 0,
    }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // Active touched slice in Donut Chart
  const [activeSliceId, setActiveSliceId] = useState<string | null>(null);

  // Donut SVG Math
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;

  let accumulatedLength = 0;
  const donutSlices = sortedCategoriesBySpend.map((cat) => {
    const ratio = totalSpent > 0 ? cat.spent / totalSpent : 0;
    const strokeDasharray = `${ratio * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -accumulatedLength;
    accumulatedLength += ratio * donutCircumference;
    return {
      cat,
      ratio,
      strokeDasharray,
      strokeDashoffset,
    };
  });

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

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar pb-8">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight">
          {t.reportsSettings}
        </h1>
        <p className="text-xs text-[#8E8E93]">{t.reportsSubtitle}</p>
      </div>

      {/* SECTION 1: VISUAL ANALYTICS & ANIMATED DONUT */}
      <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1.5">
            <PieChart size={15} className="text-emerald-500" />
            <span>{t.spendByCategory}</span>
          </span>
          <span className="text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
            <Amount
              value={totalSpent}
              currency={settings.currency}
              lang={lang}
              hideAmounts={Boolean(settings.hideAmounts)}
            />
          </span>
        </div>

        {/* Animated Interactive SVG Donut */}
        {sortedCategoriesBySpend.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-1">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  stroke="rgba(0, 0, 0, 0.05)"
                  className="dark:stroke-white/5"
                  strokeWidth="16"
                  fill="transparent"
                />
                {donutSlices.map((slice, idx) => {
                  const isSelected = activeSliceId === slice.cat.id;
                  return (
                    <motion.circle
                      key={slice.cat.id}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      stroke={slice.cat.color}
                      strokeWidth={isSelected ? 20 : 16}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      initial={isReduced ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      fill="transparent"
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => {
                        nativeHaptics.tap(settings.soundEnabled);
                        setActiveSliceId(isSelected ? null : slice.cat.id);
                      }}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                {activeSliceId ? (
                  <>
                    <span className="text-[10px] font-bold text-[#8E8E93] truncate max-w-24">
                      {isEn ? (categories.find(c => c.id === activeSliceId)?.nameEn || '') : (categories.find(c => c.id === activeSliceId)?.name || '')}
                    </span>
                    <span className="text-sm font-black text-[#1C1C1E] dark:text-white tabular-nums">
                      {Math.round(((catSpendMap.get(activeSliceId) || 0) / totalSpent) * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-[#1C1C1E] dark:text-white tabular-nums">
                      {sortedCategoriesBySpend.length}
                    </span>
                    <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">
                      {isEn ? 'Categories' : 'تصنيفات'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Top Categories Mini Chips */}
            <div className="flex-1 w-full space-y-2">
              {sortedCategoriesBySpend.slice(0, 4).map((cat) => {
                const pct = totalSpent > 0 ? Math.round((cat.spent / totalSpent) * 100) : 0;
                const isSelected = activeSliceId === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      nativeHaptics.tap(settings.soundEnabled);
                      setActiveSliceId(isSelected ? null : cat.id);
                    }}
                    className={`p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-[#F2F2F7] dark:bg-[#2C2C2E]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {isEn && cat.nameEn ? cat.nameEn : cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <Amount
                        value={cat.spent}
                        currency={settings.currency}
                        lang={lang}
                        hideAmounts={Boolean(settings.hideAmounts)}
                        className="font-bold text-slate-700 dark:text-slate-300"
                      />
                      <span className="text-[10px] text-[#8E8E93]">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sortedCategoriesBySpend.length === 0 && (
          <div className="py-6 text-center text-xs text-[#8E8E93]">
            {isEn ? 'No expenses recorded for this month yet.' : 'لا توجد مصاريف مسجلة لهذا الشهر بعد.'}
          </div>
        )}

        {/* Family Payer Breakdown */}
        {monthlyExpenses.length > 0 && (
          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
            <span className="text-[11px] font-bold text-[#8E8E93] flex items-center gap-1">
              <Users size={13} />
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
      </div>

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
          <div className="flex items-center gap-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1 rounded-2xl">
            {[
              { id: 'system', label: isEn ? 'System' : 'تلقائي' },
              { id: 'light', label: isEn ? 'Light' : 'فاتح' },
              { id: 'dark', label: isEn ? 'Dark' : 'داكن' },
            ].map((th) => {
              const isActive = settings.themeMode === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => handleThemeModeChange(th.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300'
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