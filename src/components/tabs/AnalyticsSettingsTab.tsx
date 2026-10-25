import React, { useRef } from 'react';
import {
  PieChart,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  DollarSign,
  Calendar,
  Volume2,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Users,
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
import { sound } from '../../utils/audio';
import { NotificationPermissionState } from '../../utils/notifications';
import { Bell, BellRing, Sparkles } from 'lucide-react';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Payment method breakdown
  const paymentMap = new Map<string, number>();
  monthlyExpenses.forEach((e) => {
    paymentMap.set(e.paymentMethod, (paymentMap.get(e.paymentMethod) || 0) + e.amount);
  });

  const handleCurrencyChange = (curr: CurrencyCode) => {
    sound.playTap(settings.soundEnabled);
    onUpdateSettings({ currency: curr });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.categories && parsed.expenses) {
          sound.playSuccess(settings.soundEnabled);
          onImportData(parsed);
          alert('تم استعادة النسخة الاحتياطية بنجاح!');
        } else {
          alert('ملف النسخة الاحتياطية غير صالح.');
        }
      } catch {
        alert('حدث خطأ أثناء قراءة الملف.');
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
          التقارير وإعدادات التطبيق
        </h1>
        <p className="text-xs text-[#8E8E93]">
          تحليل مصاريف البيت، العملة، والنسخ الاحتياطي المحلي
        </p>
      </div>

      {/* SECTION 1: VISUAL ANALYTICS */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1.5">
            <PieChart size={14} className="text-blue-500" />
            <span>توزيع المصروفات حسب التصنيف</span>
          </span>
          <span className="text-xs font-bold text-[#1C1C1E] dark:text-white tabular-nums">
            {formatMoney(totalSpent, settings.currency)}
          </span>
        </div>

        {/* Categories Bars */}
        <div className="space-y-2.5">
          {sortedCategoriesBySpend.map((c) => {
            const pct = totalSpent > 0 ? Math.round((c.spent / totalSpent) * 100) : 0;
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CategoryIcon iconName={c.icon} color={c.color} bgColor={c.bgColor} size="sm" />
                    <span className="font-semibold text-[#1C1C1E] dark:text-white">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tabular-nums text-[#1C1C1E] dark:text-white">
                      {formatMoney(c.spent, settings.currency)}
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
              لا توجد مصاريف لتحليلها لهذا الشهر حتى الآن.
            </div>
          )}
        </div>

        {/* Payer Distribution */}
        {monthlyExpenses.length > 0 && (
          <div className="pt-3 border-t border-[#E5E5EA] dark:border-[#2C2C2E] space-y-2">
            <span className="text-[11px] font-bold text-[#8E8E93] flex items-center gap-1">
              <Users size={12} />
              <span>توزيع الدفع في الأسرة</span>
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {(['الزوج', 'الزوجة', 'مشترك'] as const).map((p) => {
                const amount = payerMap.get(p) || 0;
                const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                return (
                  <div key={p} className="p-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    <span className="text-[10px] text-[#8E8E93] block font-medium">{p}</span>
                    <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums block">
                      {formatMoney(amount, settings.currency)}
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

      {/* SECTION 2: APP PREFERENCES */}
      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3.5">
        <span className="text-xs font-bold text-[#8E8E93] block">
          تخصيص العملة وتفضيلات التطبيق
        </span>

        {/* Currency Switcher */}
        <div>
          <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
            عملة التطبيق (الحالية: {CURRENCY_SYMBOLS[settings.currency]?.name})
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
              يوم نزول الراتب / الدخل الشهري
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
            <span className="text-xs text-[#8E8E93]">من الشهر</span>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
              أصوات النقر اللمسية لـ iOS
            </span>
          </div>
          <button
            onClick={() => {
              sound.playTap(!settings.soundEnabled);
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
                  تنبيهات الفواتير الدورية (Local Notifications)
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  إشعار محلي من المتصفح لتذكيرك قبل حلول موعد الاستحقاق
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTap(settings.soundEnabled);
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
              {/* Permission status row */}
              <div className="flex items-center justify-between">
                <span className="text-[#8E8E93] text-[11px] font-semibold">حالة إذن المتصفح:</span>
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
                    ? 'مسموح ومفعل ✓'
                    : notificationPermission === 'denied'
                    ? 'محظور من إعدادات المتصفح'
                    : 'يتطلب الموافقة'}
                </span>
              </div>

              {/* Lead Days selector */}
              <div className="flex items-center justify-between pt-1 border-t border-[#E5E5EA] dark:border-[#3A3A3C]">
                <span className="text-[#8E8E93] text-[11px] font-semibold">موعد إرسال التذكير:</span>
                <div className="flex items-center gap-1 font-semibold text-[10px]">
                  {[
                    { days: 0, label: 'في نفس اليوم' },
                    { days: 1, label: 'قبل يوم' },
                    { days: 3, label: 'قبل 3 أيام' },
                  ].map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        sound.playTap(settings.soundEnabled);
                        onUpdateSettings({ notificationLeadDays: opt.days });
                      }}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        settings.notificationLeadDays === opt.days
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                {notificationPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={onRequestNotificationPermission}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Bell size={13} />
                    <span>طلب إذن إشعارات المتصفح</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSendTestNotification}
                    className="flex-1 py-1.5 rounded-xl bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    <Sparkles size={13} />
                    <span>إرسال إشعار تجريبي الآن</span>
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
            النسخ الاحتياطي والتخزين المحلي
          </span>
        </div>
        <p className="text-[11px] text-[#8E8E93]">
          جميع بياناتك مخزنة 100% داخل متصفح جهازك بدون أي خوادم خارجية لضمان الخصوصية التامة. يمكنك أخذ نسخة احتياطية في أي وقت.
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            onClick={() => {
              sound.playSuccess(settings.soundEnabled);
              exportDataAsJSON(fullData);
            }}
            className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/50 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer text-xs font-bold"
          >
            <Download size={18} />
            <span>تنزيل نسخة احتياطية (JSON)</span>
          </button>

          {/* Import JSON */}
          <button
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              fileInputRef.current?.click();
            }}
            className="p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-200/60 transition-colors cursor-pointer text-xs font-bold"
          >
            <Upload size={18} />
            <span>استعادة نسخة احتياطية</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Export CSV */}
          <button
            onClick={() => {
              sound.playSuccess(settings.soundEnabled);
              exportExpensesToCSV(
                expenses,
                categories,
                CURRENCY_SYMBOLS[settings.currency]?.symbol || 'ر.س'
              );
            }}
            className="col-span-2 p-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors cursor-pointer text-xs font-bold"
          >
            <FileSpreadsheet size={16} />
            <span>تصدير المصاريف لملف إكسل (Excel CSV)</span>
          </button>
        </div>

        {/* Reset & Clear */}
        <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('هل تريد استعادة البيانات النموذجية الأولية؟')) {
                sound.playTap(settings.soundEnabled);
                onResetData();
              }
            }}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>استعادة البيانات النموذجية</span>
          </button>

          <button
            onClick={() => {
              if (confirm('تحذير: سيتم مسح كافة المصاريف والفواتير والتصنيفات! هل أنت متأكد؟')) {
                sound.playDelete(settings.soundEnabled);
                onClearAllData();
              }
            }}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>مسح كافة البيانات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
