import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, ChevronLeft } from 'lucide-react';
import { InAppNotification } from '../types';

interface IOSNotificationBannerProps {
  notification: InAppNotification | null;
  onDismiss: () => void;
  onAction?: (notification: InAppNotification) => void;
}

export const IOSNotificationBanner: React.FC<IOSNotificationBannerProps> = ({
  notification,
  onDismiss,
  onAction,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6500);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {notification && (
        <div className="absolute top-12 left-0 right-0 px-3 z-50 pointer-events-none flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className="w-full max-w-sm pointer-events-auto bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 shadow-2xl flex flex-col gap-1.5 cursor-pointer select-none"
            onClick={() => onAction?.(notification)}
          >
            {/* Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
                  <Bell size={11} />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  مصاريف البيت
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8E8E93]">الآن</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X size={11} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="pr-1 text-right">
              <div className="text-xs font-bold text-[#1C1C1E] dark:text-white leading-tight">
                {notification.title}
              </div>
              <p className="text-[11px] text-[#636366] dark:text-[#AEAEB2] mt-0.5 leading-snug">
                {notification.body}
              </p>
            </div>

            {/* Action pill */}
            <div className="pt-1 flex justify-end">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline">
                <span>الانتقال للفواتير</span>
                <ChevronLeft size={11} />
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
