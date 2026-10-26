import React from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, Smartphone, Mail } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
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
                <span className="font-bold block mb-1">100% Offline & Zero Data Collection</span>
                Halala & Qirsh is designed with complete privacy at its core. We do not operate any backend servers, accounts, analytics SDKs, or tracking services.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  1. Zero Data Collection
                </h3>
                <p>
                  We do not collect, transmit, share, or sell any personal or financial information. All expense records, category limits, grocery lists, and budget limits are stored locally on your device via secure Apple Preferences (iOS UserDefaults).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Lock size={16} className="text-blue-500" />
                  2. Biometrics & Apple Keychain Security
                </h3>
                <p>
                  Face ID / Touch ID verification runs entirely through Apple's LocalAuthentication framework. Your passcode is hashed with a cryptographic salt (SHA-256) and saved directly into the secure hardware iOS Keychain (Apple Keychain Services). Failed attempt counters and escalating lockout rules are also secured inside the Keychain.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Smartphone size={16} className="text-purple-500" />
                  3. Local On-Device Notifications
                </h3>
                <p>
                  Notifications are scheduled strictly on your device via the Apple Local Notification framework for upcoming bills and daily reminders. No remote notification server is used.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Mail size={14} className="text-blue-500" />
                <span>Support & Contact: <strong className="text-slate-800 dark:text-slate-200">shady.nasif@gmail.com</strong></span>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block mb-1">خصوصية تامة وتخزين محلي 100% على جهازك</span>
                تطبيق «هللة وقرش» صُمم بمبدأ حماية الخصوصية المطلقة. لا نستخدم أي خوادم خارجية، ولا نتتبع أي نشاط أو نجمع أي بيانات شخصية أو مالية أو تحليلات.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  1. عدم جمع أي بيانات نهائياً
                </h3>
                <p>
                  لا يتم جمع أو تخزين أو بيع أي بيانات متعلقة بدخلك أو مصاريفك أو فواتيرك. جميع البيانات تُحفظ محلياً داخل نظام جهازك عبر التخزين الآمن Capacitor Preferences (iOS UserDefaults) ولا تغادر هاتفك.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Lock size={16} className="text-blue-500" />
                  2. بصمة الوجه وسلسلة مفاتيح أبل (iOS Keychain)
                </h3>
                <p>
                  مصادقة Face ID / Touch ID تتم بالكامل عبر إطار العمل المدمج لنظام iOS. رمز الدخول السري يُحفظ كقيمة مجزأة ومملحة (Salted SHA-256 Hash) داخل سلسلة مفاتيح أبل المشفرة (iOS Keychain Services). كما تُدار محاولات الدخول الخاطئة وفترات القفل التدريجي بداخلها.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                  <Smartphone size={16} className="text-purple-500" />
                  3. التنبيهات المحلية دون خوادم
                </h3>
                <p>
                  صلاحية الإشعارات تُستخدم حصراً لجدولة التنبيهات والتذكيرات المحلية على هاتفك مباشرة لمواعيد الفواتير الدورية والتذكير اليومي، دون أي اتصال بخوادم خارجية.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Mail size={14} className="text-blue-500" />
                <span>الدعم الفني والتواصل: <strong className="text-slate-800 dark:text-slate-200">shady.nasif@gmail.com</strong></span>
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
