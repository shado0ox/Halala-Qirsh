import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Clipboard } from '@capacitor/clipboard';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { nativeHaptics } from '../../utils/nativeHaptics';

interface AutoCaptureCardProps {
  language?: 'ar' | 'en';
  soundEnabled?: boolean;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AutoCaptureCard: React.FC<AutoCaptureCardProps> = ({
  language = 'ar',
  soundEnabled = true,
  onShowToast,
}) => {
  const isEn = language === 'en';
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const stepsText = isEn
    ? `Bank SMS Shortcuts Automation Guide for Halala & Qirsh:
1. Open the "Shortcuts" app on your iPhone and go to the "Automation" tab.
2. Tap "+" and select "Message".
3. Set the Sender filter: select the banks you use (e.g. Al Rajhi, SNB, Alinma, STC Pay).
4. Choose "Run Immediately" and turn off "Notify When Run".
5. In the action search bar, search for "Halala & Qirsh" and choose "Log bank SMS text". Pass "Shortcut Input" as the message text.`
    : `طريقة ربط رسائل البنك عبر أتمتة تطبيق الاختصارات (Shortcuts) لهللة وقرش:
1. افتح تطبيق «الاختصارات» (Shortcuts) ← تبويب «التحكم التلقائي» (Automation).
2. اضغط على «+» واختر «رسالة» (Message).
3. ضع شروط المرسل: البنوك التي تتعامل معها (الراجحي، الأهلي، الإنماء، STC Pay...).
4. اختر «التشغيل فوراً» (Run Immediately) وبدون سؤال قبل التشغيل.
5. في إجراء الأتمتة: ابحث عن «هللة وقرش» واختر «تسجيل مصروف من رسالة البنك تلقائياً» ومرّر محتوى الرسالة (Shortcut Input) كمعامل «نص الرسالة».`;

  const handleCopySteps = async () => {
    nativeHaptics.tap(soundEnabled);
    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: stepsText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(stepsText);
      }
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      onShowToast?.(isEn ? 'Steps copied to clipboard' : 'تم نسخ الخطوات للحافظة', 'success');
    } catch {
      // ignore
    }
  };

  const handleOpenShortcuts = async () => {
    nativeHaptics.tap(soundEnabled);
    try {
      if (Capacitor.isNativePlatform()) {
        const canOpen = await AppLauncher.canOpenUrl({ url: 'shortcuts://' });
        if (canOpen.value) {
          await AppLauncher.openUrl({ url: 'shortcuts://' });
          return;
        }
      }
      window.location.href = 'shortcuts://';
    } catch {
      window.location.href = 'shortcuts://';
    }
  };

  return (
    <div className="bg-[#EAF6F0] dark:bg-emerald-950/20 border border-emerald-500/25 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all">
      {/* Header & Toggle */}
      <div
        onClick={() => {
          nativeHaptics.tap(soundEnabled);
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <MessageSquare size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0B2319] dark:text-emerald-100 flex items-center gap-1.5">
              <span>{isEn ? 'Automate via Shortcuts (Bank SMS)' : 'أتمتة رسائل البنك عبر الاختصارات'}</span>
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
            </h4>
            <span className="text-[10px] text-[#5C8271] dark:text-emerald-300/80 block">
              {isEn ? 'Automatic receipt via iOS Message Automation' : 'استلام وتسجيل فوري عبر ميزة أتمتة الرسائل في iOS'}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center cursor-pointer"
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 pt-2 border-t border-emerald-500/15 overflow-hidden"
          >
            {/* Steps list */}
            <div className="space-y-2 text-xs text-emerald-950 dark:text-emerald-100">
              {[
                {
                  num: 1,
                  ar: 'افتح تطبيق «الاختصارات» (Shortcuts) ← تبويب «التحكم التلقائي» (Automation).',
                  en: 'Open the Shortcuts app on your iPhone and go to the Automation tab.',
                },
                {
                  num: 2,
                  ar: 'اضغط على «+» ثم اختر نوع التحكم «رسالة» (Message).',
                  en: 'Tap "+" and select "Message" as the trigger.',
                },
                {
                  num: 3,
                  ar: 'حدّد المرسل (Sender): جهات اتصال البنوك الخاصة بك (الراجحي، الأهلي، الإنماء...).',
                  en: 'Set the Sender: choose the bank phone numbers or names (Al Rajhi, SNB, Alinma...).',
                },
                {
                  num: 4,
                  ar: 'اختر «التشغيل فوراً» (Run Immediately) وعطّل «السؤال قبل التشغيل».',
                  en: 'Select "Run Immediately" and turn off "Notify When Run".',
                },
                {
                  num: 5,
                  ar: 'في الإجراءات: ابحث عن «هللة وقرش» واختر «تسجيل مصروف من رسالة البنك تلقائياً» ومرّر محتوى الرسالة كمعامل.',
                  en: 'In Actions: search for "Halala & Qirsh", select "Log bank SMS text", and pass Shortcut Input as the message.',
                },
              ].map((st) => (
                <div key={st.num} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-2xs">
                    {st.num}
                  </span>
                  <p className="text-[11px] leading-relaxed font-medium">
                    {isEn ? st.en : st.ar}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions: Copy Steps & Open Shortcuts */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleCopySteps}
                className="min-h-[40px] px-3 py-2 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer hover:bg-emerald-50/50"
              >
                {hasCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{hasCopied ? (isEn ? 'Copied!' : 'تم النسخ!') : (isEn ? 'Copy Steps' : 'نسخ الخطوات')}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleOpenShortcuts}
                className="min-h-[40px] px-3 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer hover:brightness-105"
              >
                <span>{isEn ? 'Open Shortcuts' : 'فتح الاختصارات'}</span>
                <ExternalLink size={13} className="opacity-90" />
              </motion.button>
            </div>

            {/* Privacy note */}
            <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-[#1C1C1E]/60 text-[10px] text-[#5C8271] dark:text-[#8E8E93] leading-relaxed flex items-start gap-1.5">
              <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {isEn
                  ? 'All SMS processing is 100% on-device. SMS text is immediately discarded and never sent to any server.'
                  : 'معالجة الرسائل تتم محلياً بالكامل على جهازك. نص الرسالة يُحذف فوراً بعد الاستخراج ولا يُرفع لأي خادم.'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
