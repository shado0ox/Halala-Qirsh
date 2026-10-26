import { useReducedMotion } from 'motion/react';
import React, { createContext, useContext } from 'react';

/**
 * Standard spring presets specified in Design Constitution:
 * - snappy: high stiffness for tight taps and fast micro-interactions
 * - smooth: natural ease for layout transitions and modal slides
 * - bouncy: delightful response for icons, badges, and feedback moments
 */
export const springs = {
  snappy: { type: 'spring' as const, stiffness: 500, damping: 38 },
  smooth: { type: 'spring' as const, stiffness: 260, damping: 28 },
  bouncy: { type: 'spring' as const, stiffness: 380, damping: 18 },
};

/**
 * Fade duration presets (150ms - 220ms)
 */
export const fades = {
  fast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const },
  standard: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

/**
 * Stagger helper: max 40ms between items, capped at 400ms total
 */
export function getStaggerDelay(index: number, stepMs: number = 35, maxTotalSec: number = 0.4): number {
  return Math.min((index * stepMs) / 1000, maxTotalSec);
}

export type AnimationMode = 'full' | 'reduced' | 'off';

export interface MotionContextValue {
  mode: AnimationMode;
  isReduced: boolean;
  isOff: boolean;
  spring: typeof springs.smooth | { duration: number };
  snappy: typeof springs.snappy | { duration: number };
  bouncy: typeof springs.bouncy | { duration: number };
}

export const MotionContext = createContext<MotionContextValue>({
  mode: 'full',
  isReduced: false,
  isOff: false,
  spring: springs.smooth,
  snappy: springs.snappy,
  bouncy: springs.bouncy,
});

/**
 * Custom hook to consume motion presets honoring system + user animation setting.
 */
export function useMotionConfig(userSetting?: AnimationMode): MotionContextValue {
  const systemReduced = useReducedMotion();
  const effectiveMode: AnimationMode =
    userSetting === 'off'
      ? 'off'
      : userSetting === 'reduced' || systemReduced
      ? 'reduced'
      : 'full';

  const isReduced = effectiveMode === 'reduced';
  const isOff = effectiveMode === 'off';
  const shouldDisableMotion = isReduced || isOff;

  return {
    mode: effectiveMode,
    isReduced: shouldDisableMotion,
    isOff,
    spring: shouldDisableMotion ? { duration: isOff ? 0 : 0.15 } : springs.smooth,
    snappy: shouldDisableMotion ? { duration: isOff ? 0 : 0.1 } : springs.snappy,
    bouncy: shouldDisableMotion ? { duration: isOff ? 0 : 0.15 } : springs.bouncy,
  };
}

/**
 * Reusable card entrance variants
 */
export const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: getStaggerDelay(i),
      ...springs.smooth,
    },
  }),
  exit: { opacity: 0, scale: 0.97, transition: fades.fast },
};

export const reducedCardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: fades.fast },
  exit: { opacity: 0, transition: fades.fast },
};
