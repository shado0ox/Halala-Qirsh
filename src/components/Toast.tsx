import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const icon = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    error: <AlertCircle size={16} className="text-red-500 shrink-0" />,
    info: <Info size={16} className="text-blue-500 shrink-0" />,
  }[type];

  return (
    <AnimatePresence>
      <div className="fixed top-12 left-0 right-0 px-4 z-50 pointer-events-none flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="pointer-events-auto bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-2 text-xs font-semibold text-[#1C1C1E] dark:text-white max-w-sm"
        >
          {icon}
          <span>{message}</span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
