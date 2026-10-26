import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  formatFn: (val: number) => string;
  durationMs?: number;
  isReduced?: boolean;
  isHidden?: boolean;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  formatFn,
  durationMs = 700,
  isReduced = false,
  isHidden = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(() => (isReduced ? value : 0));
  const startTimeRef = useRef<number | null>(null);
  const startValRef = useRef<number>(isReduced ? value : 0);
  const targetValRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    targetValRef.current = value;

    if (isReduced) {
      setDisplayValue(value);
      return;
    }

    const startVal = displayValue;
    startValRef.current = startVal;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / durationMs, 1);
      // Ease out cubic: 1 - pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValRef.current + (targetValRef.current - startValRef.current) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValRef.current);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, durationMs, isReduced]);

  if (isHidden) {
    return (
      <span className={`tabular-nums tracking-widest select-none ${className}`}>
        ••••••
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {formatFn(displayValue)}
    </span>
  );
};
