import React from 'react';

interface HalalaQirshLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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
  }[size];

  const emblem = (
    <div
      className="relative shrink-0 flex items-center justify-center select-none"
      style={{ width: pixelDimensions, height: pixelDimensions }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Halala Coin Gradients (Emerald & Warm Gold) */}
          <linearGradient id="halalaGold" x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          <linearGradient id="halalaCore" x1="20%" y1="20%" x2="80%" y2="80%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064E3B" />
          </linearGradient>

          {/* Qirsh Coin Gradients (Burnished Platinum & Metallic Bronze) */}
          <linearGradient id="qirshRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <linearGradient id="qirshFace" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <radialGradient id="sunburst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* COIN 1: QIRSH (قرش) - Offset Layer (Silver / Platinum Shield) */}
        <g opacity="0.95" transform="translate(-4, -2)">
          {/* Outer Reeded Rim */}
          <circle cx="50" cy="56" r="38" fill="url(#qirshRim)" stroke="#334155" strokeWidth="1.5" />
          {/* Milled Edge Teeth */}
          <circle
            cx="50"
            cy="56"
            r="36"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeDasharray="2 3"
          />
          {/* Dark Metallic Core */}
          <circle cx="50" cy="56" r="32" fill="url(#qirshFace)" />
          {/* Concentric Guilloché Rings */}
          <circle cx="50" cy="56" r="26" fill="none" stroke="#64748B" strokeWidth="0.8" strokeDasharray="3 2" />
          <circle cx="50" cy="56" r="18" fill="none" stroke="#94A3B8" strokeWidth="0.8" />
          {/* Qirsh Symbol (Letter Qaf / Balance Scale Motif) */}
          <path
            d="M44 54C44 50.7 46.7 48 50 48C53.3 48 56 50.7 56 54C56 57.3 53.3 60 50 60C46.7 60 44 57.3 44 54Z"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="1.8"
          />
          <path d="M50 44V48" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M42 66H58" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="47" cy="42" r="1.2" fill="#FDE68A" />
          <circle cx="53" cy="42" r="1.2" fill="#FDE68A" />
        </g>

        {/* COIN 2: HALALA (هللة) - Hero Front Layer (Minted Gold & Emerald) */}
        <g transform="translate(6, 4)">
          {/* Outer Golden Reeded Rim */}
          <circle cx="64" cy="60" r="42" fill="url(#halalaGold)" stroke="#78350F" strokeWidth="1.5" />
          {/* Milled Edge Engravings */}
          <circle
            cx="64"
            cy="60"
            r="40"
            fill="none"
            stroke="#FEF3C7"
            strokeWidth="2.4"
            strokeDasharray="2.5 3.5"
          />
          {/* Inner Raised Ring */}
          <circle cx="64" cy="60" r="36" fill="url(#halalaGold)" stroke="#92400E" strokeWidth="1" />
          {/* Deep Royal Emerald Core */}
          <circle cx="64" cy="60" r="32" fill="url(#halalaCore)" />
          {/* Sunburst Radial Sheen */}
          <circle cx="64" cy="60" r="32" fill="url(#sunburst)" />

          {/* Stylized Arabic "هـ" (Halala) Minted Emblem */}
          <circle cx="63" cy="59" r="6" fill="none" stroke="#FEF3C7" strokeWidth="2.5" />
          <path
            d="M74 57 C74 50 69 46 63 46 C55 46 51 52 51 60 C51 68 56 73 65 73 L48 73"
            fill="none"
            stroke="#FEF3C7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Mint Stars */}
          <circle cx="64" cy="38" r="2" fill="#FEF3C7" />
          <circle cx="54" cy="40" r="1.5" fill="#FDE68A" />
          <circle cx="74" cy="40" r="1.5" fill="#FDE68A" />
        </g>
      </svg>
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
