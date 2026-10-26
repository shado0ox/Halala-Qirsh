import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isEnglish?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
  isEnglish = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dimmed iOS backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            nativeHaptics.tap();
            onCancel();
          }}
          className="absolute inset-0 bg-black/55"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-xs bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center z-10"
        >
          {isDestructive && (
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
          )}

          <h3 className="text-sm font-bold text-[#1C1C1E] dark:text-white mb-1.5">
            {title}
          </h3>
          <p className="text-xs text-[#8E8E93] leading-relaxed mb-5">
            {message}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap();
                onCancel();
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer active:scale-95 transition-transform"
            >
              {cancelText || (isEnglish ? 'Cancel' : 'إلغاء')}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isDestructive) {
                  nativeHaptics.warning();
                } else {
                  nativeHaptics.success();
                }
                onConfirm();
              }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer active:scale-95 transition-transform ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 shadow-xs'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
              }`}
            >
              {confirmText || (isDestructive ? (isEnglish ? 'Delete' : 'حذف') : (isEnglish ? 'Confirm' : 'تأكيد'))}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
