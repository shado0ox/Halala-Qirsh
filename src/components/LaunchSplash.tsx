import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs, fades } from '../utils/motion';

interface LaunchSplashProps {
  onFinish: () => void;
  isReduced?: boolean;
  isEnglish?: boolean;
}

export const LaunchSplash: React.FC<LaunchSplashProps> = ({
  onFinish,
  isReduced = false,
  isEnglish = false,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 200);
    }, isReduced ? 200 : 900);

    return () => clearTimeout(timer);
  }, [onFinish, isReduced]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fades.standard}
          className="fixed inset-0 z-100 bg-[#064E3B] flex flex-col items-center justify-center p-6 select-none"
        >
          {/* Emerald Brand Logo Glyph with Spring Scale */}
          <motion.div
            initial={isReduced ? { scale: 1 } : { scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springs.bouncy}
            className="w-24 h-24 rounded-[28px] bg-gradient-to-tr from-[#059669] to-[#10B981] flex items-center justify-center text-white shadow-2xl shadow-emerald-950/60 mb-4 border border-white/20"
          >
            <svg className="w-14 h-14" viewBox="0 0 48 48" fill="none">
              <path
                d="M10 24L24 10L38 24V38C38 39.1046 37.1046 40 36 40H12C10.8954 40 10 39.1046 10 38V24Z"
                fill="#FFFFFF"
              />
              <path
                d="M20 28H28V36H20V28Z"
                fill="#059669"
              />
              <circle cx="24" cy="20" r="3" fill="#059669" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.smooth}
            className="text-xl font-black text-white tracking-tight"
          >
            {isEnglish ? 'Home Expenses' : 'مصاريف البيت'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, ...fades.fast }}
            className="text-xs text-emerald-200/80 mt-1"
          >
            {isEnglish ? 'Private Household Budget Tracker' : 'تطبيق الميزانية والمصاريف المشفر محلياً'}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
