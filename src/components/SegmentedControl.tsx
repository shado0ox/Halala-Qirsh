import React from 'react';
import { motion } from 'motion/react';
import { sound } from '../utils/audio';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  soundEnabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  soundEnabled = true,
  className = '',
}: SegmentedControlProps<T>) {
  const handleSelect = (val: T) => {
    if (val !== value) {
      sound.playTap(soundEnabled);
      onChange(val);
    }
  };

  return (
    <div
      role="tablist"
      className={`relative flex items-center p-1 bg-[#767680]/15 dark:bg-[#767680]/25 rounded-[10px] select-none ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => handleSelect(option.value)}
            className={`relative flex-1 py-1.5 px-3 text-xs md:text-sm font-semibold rounded-[8px] transition-colors z-10 flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[32px] cursor-pointer ${
              isSelected
                ? 'text-[#1C1C1E] dark:text-white'
                : 'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-highlight"
                className="absolute inset-0 bg-white dark:bg-[#636366] rounded-[8px] shadow-xs -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#767680]/20 text-[#8E8E93]'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
