import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins } from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';

export type CoinTargetName = 'dashboard-remaining' | 'expenses-first-row';

interface FlightState {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onLanded?: () => void;
}

interface CoinFlightContextValue {
  registerTarget: (name: CoinTargetName, el: HTMLElement | null) => void;
  flyCoin: (
    fromRect: DOMRect,
    targetName: CoinTargetName,
    onLanded?: () => void,
    isReduced?: boolean,
    soundEnabled?: boolean
  ) => void;
  highlightedExpenseId: string | null;
  setHighlightedExpenseId: (id: string | null) => void;
}

const CoinFlightContext = createContext<CoinFlightContextValue>({
  registerTarget: () => {},
  flyCoin: () => {},
  highlightedExpenseId: null,
  setHighlightedExpenseId: () => {},
});

export const useCoinFlight = () => useContext(CoinFlightContext);

export const CoinFlightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targetsRef = useRef<Map<CoinTargetName, HTMLElement>>(new Map());
  const [flight, setFlight] = useState<FlightState | null>(null);
  const [highlightedExpenseId, setHighlightedExpenseId] = useState<string | null>(null);

  const registerTarget = useCallback((name: CoinTargetName, el: HTMLElement | null) => {
    if (el) {
      targetsRef.current.set(name, el);
    } else {
      targetsRef.current.delete(name);
    }
  }, []);

  const flyCoin = useCallback(
    (
      fromRect: DOMRect,
      targetName: CoinTargetName,
      onLanded?: () => void,
      isReduced = false,
      soundEnabled = true
    ) => {
      const targetEl = targetsRef.current.get(targetName);

      // If reduced motion or target not found, land immediately
      if (isReduced || !targetEl) {
        nativeHaptics.success(soundEnabled);
        onLanded?.();
        return;
      }

      const targetRect = targetEl.getBoundingClientRect();
      const fromX = fromRect.left + fromRect.width / 2 - 16;
      const fromY = fromRect.top + fromRect.height / 2 - 16;
      const toX = targetRect.left + targetRect.width / 2 - 16;
      const toY = targetRect.top + targetRect.height / 2 - 16;

      setFlight({
        fromX,
        fromY,
        toX,
        toY,
        onLanded: () => {
          nativeHaptics.success(soundEnabled);
          onLanded?.();
        },
      });
    },
    []
  );

  return (
    <CoinFlightContext.Provider
      value={{
        registerTarget,
        flyCoin,
        highlightedExpenseId,
        setHighlightedExpenseId,
      }}
    >
      {children}

      {/* Flight Overlay Element animating via Transform & Opacity only */}
      <AnimatePresence>
        {flight && (
          <motion.div
            initial={{
              x: flight.fromX,
              y: flight.fromY,
              scale: 0.9,
              opacity: 1,
            }}
            animate={{
              x: flight.toX,
              y: flight.toY,
              scale: [0.9, 1.3, 0.4],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.42,
              ease: [0.16, 1, 0.3, 1],
            }}
            onAnimationComplete={() => {
              flight.onLanded?.();
              setFlight(null);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 9999,
              pointerEvents: 'none',
              willChange: 'transform, opacity',
            }}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-100 text-amber-950 shadow-2xl flex items-center justify-center border-2 border-amber-300 ring-2 ring-emerald-500/40"
          >
            <div className="w-6 h-6 rounded-full bg-[#059669] flex items-center justify-center text-amber-200 font-black text-[11px] select-none">
              هـ
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CoinFlightContext.Provider>
  );
};
