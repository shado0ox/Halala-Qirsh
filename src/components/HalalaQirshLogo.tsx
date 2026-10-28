import React from 'react';

interface HalalaQirshLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  withText?: boolean;
  layout?: 'horizontal' | 'vertical';
  isEnglish?: boolean;
  className?: string;
}

export const HalalaQirshLogo: React.FC<HalalaQirshLogoProps> = ({
  size = 'md',
  withText = false,
  layout = 'horizontal',
  isEnglish = false,
  className = '',
}) => {
  const pixelDimensions = {
    xs: 24,
    sm: 32,
    md: 44,
    lg: 64,
    xl: 96,
    '2xl': 128,
  }[size] || 44;

  const emblem = (
    <div
      className="relative shrink-0 flex items-center justify-center select-none overflow-hidden rounded-[24%] shadow-sm border border-slate-200/50 dark:border-white/10 bg-[#0B2319]"
      style={{ width: pixelDimensions, height: pixelDimensions }}
      aria-hidden="true"
    >
      <img
        src="/app-icon.png"
        alt={isEnglish ? 'Halala & Qirsh' : 'هللة وقرش'}
        className="w-full h-full object-cover select-none pointer-events-none"
        loading="eager"
        decoding="async"
      />
    </div>
  );

  if (!withText) {
    return <div className={`inline-flex items-center ${className}`}>{emblem}</div>;
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${
        layout === 'vertical' ? 'flex-col text-center' : 'flex-row'
      } ${className}`}
    >
      {emblem}
      <div className="flex flex-col leading-none">
        <span className="text-base sm:text-lg font-black tracking-tight text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
          <span>{isEnglish ? 'Halala & Qirsh' : 'هللة وقرش'}</span>
        </span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">
          {isEnglish ? 'Halala & Qirsh · Budget Tracker' : 'Halala & Qirsh · ميزانية الأسرة'}
        </span>
      </div>
    </div>
  );
};
