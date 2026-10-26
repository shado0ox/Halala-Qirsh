import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { springs, fades } from '../utils/motion';
import { HalalaQirshLogo } from './HalalaQirshLogo';

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
    }, isReduced ? 200 : 950);

    return () => clearTimeout(timer);
  }, [onFinish, isReduced]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fades.standard}
          className="fixed inset-0 z-100 bg-[#022c22] flex flex-col items-center justify-center p-6 select-none"
        >
          {/* Halala & Qirsh Minted Coins Emblem */}
          <motion.div
            initial={isReduced ? { scale: 1 } : { scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springs.bouncy}
            className="mb-5 flex items-center justify-center"
          >
            <HalalaQirshLogo size="xl" isEnglish={isEnglish} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.smooth}
            className="text-center"
          >
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{isEnglish ? 'Halala & Qirsh' : 'هللة وقرش'}</span>
            </h1>
            <p className="text-[11px] font-bold text-amber-300/90 mt-0.5 tracking-wider uppercase">
              {isEnglish ? 'Halala & Qirsh' : 'Halala & Qirsh'}
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, ...fades.fast }}
            className="text-xs text-emerald-200/80 mt-2 text-center max-w-xs"
          >
            {isEnglish
              ? 'Every Halala & Qirsh Counts · 100% Private & Offline'
              : 'نحفظ لك كل هللة وقرش · ميزانية مشفرة ومحفوظة محلياً'}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
