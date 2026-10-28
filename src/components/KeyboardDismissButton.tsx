import React from 'react';
import { Keyboard, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dismissKeyboard } from '../utils/keyboard';
import { nativeHaptics } from '../utils/nativeHaptics';

interface KeyboardDismissButtonProps {
  visible: boolean;
  isEnglish?: boolean;
  soundEnabled?: boolean;
  className?: string;
}

export const KeyboardDismissButton: React.FC<KeyboardDismissButtonProps> = ({
  visible,
  isEnglish = false,
  soundEnabled = true,
  className = '',
}) => {
  if (!visible) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 4 }}
      transition={{ duration: 0.15 }}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        nativeHaptics.tap(soundEnabled);
        await dismissKeyboard();
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 dark:bg-slate-100/90 text-white dark:text-slate-900 text-xs font-bold shadow-md hover:bg-slate-900 dark:hover:bg-white active:scale-95 transition-all cursor-pointer ${className}`}
      title={isEnglish ? 'Hide Keyboard' : 'إخفاء لوحة المفاتيح'}
    >
      <ChevronDown size={14} className="stroke-[2.5]" />
      <span className="text-[11px]">{isEnglish ? 'Done' : 'تم (إخفاء الكيبورد)'}</span>
    </motion.button>
  );
};
