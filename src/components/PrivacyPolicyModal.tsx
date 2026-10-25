import React from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, Smartphone } from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnglish?: boolean;
  soundEnabled?: boolean;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  isEnglish = false,
  soundEnabled = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <h2 className="text-sm md:text-base font-bold text-[#1C1C1E] dark:text-white">
              {isEnglish ? 'Privacy Policy' : 'سياسة الخصوصية وأمان البيانات'}
            </h2>
          </div>

          <button
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300 no-scrollbar">
          {isEnglish ? (
            <>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block mb-1">100% Offline & On-Device Storage</span>
                Home Expenses is designed with complete privacy at its core. We do not operate any backend servers, analytics, or tracking services.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  1. Zero Data Collection
                </h3>
                <p>
                  We do not collect, transmit, share, or sell any personal or financial information. All expense records, category amounts, grocery lists, and budget limits are stored locally on your device via secure Apple Capacitor Preferences (iOS NSUserDefaults).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Lock size={16} className="text-blue-500" />
                  2. Local Permissions Usage
                </h3>
                <p>
                  <strong>Notifications:</strong> Used strictly to schedule local, on-device alerts for your upcoming bills and daily reminders. No remote push notifications or external servers are involved.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Smartphone size={16} className="text-purple-500" />
                  3. Data Ownership & Backup
                </h3>
                <p>
                  You have full ownership of your data. You can export a full JSON backup or an Excel CSV report anytime, or erase all data permanently with a single tap.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block mb-1">خصوصية تامة وتخزين محلي 100% على جهازك</span>
                تطبيق «مصاريف البيت» صُمم بمبدأ حماية الخصوصية المطلقة. لا نستخدم أي خوادم خارجية، ولا نتتبع أي نشاط أو نجمع أي بيانات شخصية أو مالية.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  1. عدم جمع أي بيانات نهائياً
                </h3>
                <p>
                  لا يتم جمع أو تخزين أو بيع أي بيانات متعلقة بدخلك أو مصاريفك أو فواتيرك. جميع البيانات تُحفظ محلياً داخل نظام جهازك عبر التخزين الآمن Capacitor Preferences (iOS NSUserDefaults) ولا تغادر هاتفك.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Lock size={16} className="text-blue-500" />
                  2. صلاحيات التنبيهات المحلية
                </h3>
                <p>
                  صلاحية الإشعارات تُستخدم حصراً لجدولة التنبيهات والتذكيرات المحلية على هاتفك مباشرة لمواعيد الفواتير الدورية والتذكير اليومي، دون أي اتصال بخوادم خارجية.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Smartphone size={16} className="text-purple-500" />
                  3. ملكية البيانات والنسخ الاحتياطي
                </h3>
                <p>
                  أنت المالك الوحيد لبياناتك. يمكنك في أي وقت تصدير نسخة احتياطية كاملة بصيغة JSON أو تقرير Excel CSV عبر قائمة المشاركة في نظام iOS، أو حذف كافة البيانات بنقرة واحدة.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex justify-end">
          <button
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            {isEnglish ? 'Close' : 'إغلاق'}
          </button>
        </div>
      </div>
    </div>
  );
};
