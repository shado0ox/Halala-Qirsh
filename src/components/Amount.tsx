import React from 'react';
import { CurrencyCode } from '../types';
import { formatMoney } from '../utils/storage';
import { AnimatedCounter } from './AnimatedCounter';

export interface AmountProps {
  value: number;
  currency: CurrencyCode;
  hideAmounts?: boolean;
  prefix?: string;
  countUp?: boolean;
  durationMs?: number;
  isReduced?: boolean;
  className?: string;
  language?: 'ar' | 'en';
  lang?: 'ar' | 'en';
}

export const Amount: React.FC<AmountProps> = ({
  value,
  currency,
  hideAmounts = false,
  prefix = '',
  countUp = false,
  durationMs = 700,
  isReduced = false,
  className = '',
  language = 'ar',
  lang,
}) => {
  const effectiveLang = lang || language || 'ar';
  if (hideAmounts) {
    return (
      <span
        aria-label="Hidden amount"
        className={`tabular-nums tracking-widest select-none transition-opacity duration-200 ${className}`}
      >
        ••••••
      </span>
    );
  }

  if (countUp) {
    return (
      <AnimatedCounter
        value={value}
        formatFn={(val) => `${prefix}${formatMoney(val, currency, effectiveLang)}`}
        durationMs={durationMs}
        isReduced={isReduced}
        isHidden={false}
        className={className}
      />
    );
  }

  return (
    <span className={`tabular-nums transition-opacity duration-200 ${className}`}>
      {prefix}{formatMoney(value, currency, effectiveLang)}
    </span>
  );
};
