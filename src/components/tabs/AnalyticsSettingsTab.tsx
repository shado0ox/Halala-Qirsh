import React, { useRef } from 'react';
import {
  PieChart,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
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
} from 'lucide-react';
import {
  Category,
  Expense,
  BudgetSettings,
  CurrencyCode,
  AppData,
} from '../../types';
import { CategoryIcon } from '../CategoryIcon';
import {
  CURRENCY_SYMBOLS,
  formatMoney,
  exportDataAsJSON,
  exportExpensesToCSV,
} from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { NotificationPermissionState } from '../../utils/notifications';
import { translations } from '../../utils/i18n';

interface AnalyticsSettingsTabProps {
  categories: Category[];
  expenses: Expense[];
  settings: BudgetSettings;
  fullData: AppData;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
  onImportData: (data: AppData) => void;
  onResetData: () => void;
  onClearAllData: () => void;
  onRequestNotificationPermission: () => Promise<void>;
  onSendTestNotification: () => void;
  notificationPermission: NotificationPermissionState;
  onOpenPasscodeModal: (mode: 'set' | 'change') => void;
  onDisablePasscode: () => void;
  onOpenPrivacyPolicy: () => void;
}

export const AnalyticsSettingsTab: React.FC<AnalyticsSettingsTabProps> = ({
  categories,
  expenses,
  settings,
  fullData,
  onUpdateSettings,
  onImportData,
  onResetData,
  onClearAllData,
  onRequestNotificationPermission,
  onSendTestNotification,
  notificationPermission,
  onOpenPasscodeModal,
  onDisablePasscode,
  onOpenPrivacyPolicy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (typeof document !== 'undefined') {
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.categories && parsed.expenses) {
          nativeHaptics.success(settings.soundEnabled);
          onImportData(parsed);
          alert(isEn ? 'Backup restored successfully!' : 'تم استعادة النسخة الاحتياطية بنجاح!');
        } else {
          alert(isEn ? 'Invalid backup file format.' : 'ملف النسخة الاحتياطية غير صالح.');
        }
      } catch {
        alert(isEn ? 'Error reading backup file.' : 'حدث خطأ أثناء قراءة الملف.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
          {t.reportsSettings}
        </h1>
        <p className="text-xs text-[#8E8E93]">{t.reportsSubtitle}</p>
      </div>

      {/* SECTION 1: VISUAL ANALYTICS */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1.5">
            <PieChart size={14} className="text-blue-500" />
            <span>{t.spendByCategory}</span>
          </span>
          <span className="text-xs font-bold text-[#1C1C1E] dark:text-white tabular-nums">
            {formatMoney(totalSpent, settings.currency, lang)}
          </span>
        </div>

        {/* Categories Bars */}
        <div className="space-y-2.5">
          {sortedCategoriesBySpend.map((c) => {
            const pct = totalSpent > 0 ? Math.round((c.spent / totalSpent) * 100) : 0;
            const categoryName = isEn && c.nameEn ? c.nameEn : c.name;
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryIcon iconName={c.icon} color={c.color} bgColor={c.bgColor} size="sm" />
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">{categoryName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tabular-nums text-[#1C1C1E] dark:text-white">
                      {formatMoney(c.spent, settings.currency, lang)}
                    </span>
                    <span className="text-[11px] text-[#8E8E93] tabular-nums font-semibold w-8 text-left">
                      {pct}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            );
          })}

          {sortedCategoriesBySpend.length === 0 && (
            <div className="py-4 text-center text-xs text-[#8E8E93]">
              {isEn ? 'No expenses recorded for this month yet.' : 'لا توجد مصاريف لتحليلها لهذا الشهر حتى الآن.'}
            </div>
          )}
        </div>

        {/* Payer Distribution */}
        {monthlyExpenses.length > 0 && (
          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
            <span className="text-[11px] font-bold text-[#8E8E93] flex items-center gap-1">
              <Users size={12} />
              <span>{t.familyPaymentShare}</span>
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {(['الزوج', 'الزوجة', 'مشترك'] as const).map((p) => {
                const amount = payerMap.get(p) || 0;
                const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                const payerLabel = isEn ? (p === 'الزوج' ? t.husband : p === 'الزوجة' ? t.wife : t.joint) : p;

                return (
                  <div key={p} className="p-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-[#8E8E93] block font-medium">{payerLabel}</span>
                    <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums block">
                      {formatMoney(amount, settings.currency, lang)}
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: NATIVE SECURITY & APP PREFERENCES */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3.5">
        <span className="text-xs font-bold text-[#8E8E93] block">
          {isEn ? 'System & Native App Preferences' : 'تفضيلات التطبيق والأمان'}
        </span>

        {/* Language Switcher */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              {t.languageSwitcher}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-[#1C1C1E] p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleLanguageToggle('ar')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                lang === 'ar' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => handleLanguageToggle('en')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Passcode Lock (Face ID) */}
        <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-purple-500" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                  {t.passcodeLockTitle}
                </span>
                <span className="text-[10px] text-[#8E8E93]">{t.passcodeLockSubtitle}</span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                settings.isPasscodeEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {settings.isPasscodeEnabled ? (isEn ? 'Enabled' : 'مفعل') : (isEn ? 'Disabled' : 'معطل')}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-[#E5E5EA] dark:border-[#3A3A3C]">
            {!settings.isPasscodeEnabled ? (
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(settings.soundEnabled);
                  onOpenPasscodeModal('set');
                }}
                className="flex-1 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Lock size={13} />
                <span>{t.setPasscode}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.tap(settings.soundEnabled);
                    onOpenPasscodeModal('change');
                  }}
                  className="flex-1 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-1 border border-purple-200 dark:border-purple-800 cursor-pointer"
                >
                  <span>{t.changePasscode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.warning(settings.soundEnabled);
                    onDisablePasscode();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-xs cursor-pointer"
                >
                  <span>{t.disablePasscode}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Daily Expense Logging Reminder */}
        <div className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                  {t.dailyReminderTitle}
                </span>
                <span className="text-[10px] text-[#8E8E93]">{t.dailyReminderSubtitle}</span>
              </div>
            </div>

            <button
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                onUpdateSettings({ dailyReminderEnabled: !settings.dailyReminderEnabled });
              }}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.dailyReminderEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  settings.dailyReminderEnabled ? (isEn ? 'translate-x-5' : 'translate-x-5') : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.dailyReminderEnabled && (
            <div className="flex items-center justify-between pt-1 border-t border-[#E5E5EA] dark:border-[#3A3A3C] text-xs">
              <span className="text-[#8E8E93]">{isEn ? 'Reminder Time:' : 'وقت التذكير المسائي:'}</span>
              <input
                type="time"
                value={settings.dailyReminderTime || '21:00'}
                onChange={(e) => onUpdateSettings({ dailyReminderTime: e.target.value })}
                className="px-2 py-1 bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold tabular-nums"
              />
            </div>
          )}
        </div>

        {/* Currency Switcher */}
        <div>
          <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
            {t.appCurrency} ({CURRENCY_SYMBOLS[settings.currency]?.[isEn ? 'nameEn' : 'name']})
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(CURRENCY_SYMBOLS) as CurrencyCode[]).map((c) => {
              const isSelected = settings.currency === c;
              return (
                <button
                  key={c}
                  onClick={() => handleCurrencyChange(c)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'border-slate-200/60 dark:border-slate-800 bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-sm font-extrabold">{CURRENCY_SYMBOLS[c].symbol}</div>
                  <div className="text-[10px] opacity-75">{c}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Salary Day */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              {t.salaryDay}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="1"
              max="31"
              value={settings.salaryDay}
              onChange={(e) =>
                onUpdateSettings({ salaryDay: parseInt(e.target.value, 10) || 27 })
              }
              className="w-12 text-center text-xs font-bold px-1 py-1 rounded-lg bg-white dark:bg-[#1C1C1E] border border-slate-300 dark:border-slate-700 tabular-nums"
            />
            <span className="text-xs text-[#8E8E93]">{isEn ? 'of month' : 'من الشهر'}</span>
          </div>
        </div>

        {/* Sound & Haptics toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              {t.soundHaptics}
            </span>
          </div>
          <button
            onClick={() => {
              nativeHaptics.tap(!settings.soundEnabled);
              onUpdateSettings({ soundEnabled: !settings.soundEnabled });
            }}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
              settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Local Notifications for Bills */}
        <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-blue-500" />
              <div>
                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                  {t.localNotifications}
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  {isEn ? 'Local on-device alerts before due dates' : 'إشعار محلي لتذكيرك قبل حلول موعد الاستحقاق'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                nativeHaptics.tap(settings.soundEnabled);
                onUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled });
              }}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {settings.notificationsEnabled && (
            <div className="space-y-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] p-2.5 rounded-2xl text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93] text-[11px] font-semibold">
                  {isEn ? 'Notification Permission:' : 'حالة إذن المتصفح / الجهاز:'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : notificationPermission === 'denied'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {notificationPermission === 'granted'
                    ? isEn ? 'Granted ✓' : 'مسموح ومفعل ✓'
                    : notificationPermission === 'denied'
                    ? isEn ? 'Denied in Settings' : 'محظور من الإعدادات'
                    : isEn ? 'Needs Permission' : 'يتطلب الموافقة'}
                </span>
              </div>

              <div className="pt-1 flex items-center gap-2">
                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={onRequestNotificationPermission}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{isEn ? 'Request Notification Permission' : 'طلب إذن الإشعارات'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSendTestNotification}
                    className="flex-1 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <Sparkles size={13} />
                    <span>{isEn ? 'Send Test Notification' : 'إرسال إشعار تجريبي الآن'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: BACKUP, EXPORT & LOCAL STORAGE */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
            {t.backupAndStorage}
          </span>
        </div>
        <p className="text-[11px] text-[#8E8E93] leading-relaxed">
          {t.storageEngineNotice}
        </p>

        {/* Native Sharing & Export Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            onClick={() => {
              nativeHaptics.success(settings.soundEnabled);
              exportDataAsJSON(fullData);
            }}
            className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer text-xs font-bold"
          >
            <Download size={18} />
            <span>{t.downloadJSONBackup}</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => {
              nativeHaptics.tap(settings.soundEnabled);
              fileInputRef.current?.click();
            }}
            className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-200/60 transition-colors cursor-pointer text-xs font-bold"
          >
            <Upload size={18} />
            <span>{t.restoreJSONBackup}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Export & Share CSV through Native iOS Share Sheet */}
          <button
            onClick={() => {
              nativeHaptics.success(settings.soundEnabled);
              exportExpensesToCSV(
                expenses,
                categories,
                CURRENCY_SYMBOLS[settings.currency]?.symbol || 'ر.س',
                isEn
              );
            }}
            className="col-span-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer text-xs font-bold"
          >
            <Share2 size={16} />
            <span>{t.exportShareCSV}</span>
          </button>

          {/* Privacy Policy Trigger */}
          <button
            onClick={() => {
              nativeHaptics.tap(settings.soundEnabled);
              onOpenPrivacyPolicy();
            }}
            className="col-span-2 p-2.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold"
          >
            <FileText size={15} className="text-blue-500" />
            <span>{t.privacyPolicy}</span>
          </button>
        </div>

        {/* Reset & Clear */}
        <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(isEn ? 'Reset app to sample household data?' : 'هل تريد استعادة البيانات النموذجية الأولية؟')) {
                nativeHaptics.tap(settings.soundEnabled);
                onResetData();
              }
            }}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>{t.resetSampleData}</span>
          </button>

          <button
            onClick={() => {
              if (
                confirm(
                  isEn
                    ? 'Warning: All expenses, bills, and categories will be permanently erased. Proceed?'
                    : 'تحذير: سيتم مسح كافة المصاريف والفواتير والتصنيفات نهائياً! هل أنت متأكد؟'
                )
              ) {
                nativeHaptics.warning(settings.soundEnabled);
                onClearAllData();
              }
            }}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>{t.clearAllData}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
