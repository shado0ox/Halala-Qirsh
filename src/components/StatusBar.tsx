import React, { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';

interface StatusBarProps {
  darkTheme?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = () => {
  const [time, setTime] = useState<string>('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      // Format 12h or 24h cleanly
      const formattedHours = hours % 12 || 12;
      setTime(`${formattedHours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-11 px-7 flex items-center justify-between text-xs font-semibold select-none z-30 pt-1">
      {/* Time (Left side in LTR, Right side in RTL - in iOS Status Bar time is always on physical left) */}
      <div className="w-16 flex items-center justify-start text-[14px] font-semibold tracking-tight text-slate-900 dark:text-white tabular-nums">
        <span>{time}</span>
      </div>

      {/* Dynamic Island Pill */}
      <div className="absolute left-1/2 -translate-x-1/2 top-2 h-[26px] w-[100px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-xs transition-all duration-300 pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-[#111116] border border-[#222228] flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-[#1b2b3a]" />
        </div>
        <div className="w-2 h-2 rounded-full bg-[#0a0a0f]" />
      </div>

      {/* Indicators (Cellular, Wifi, Battery) */}
      <div className="w-16 flex items-center justify-end gap-1.5 text-slate-900 dark:text-white">
        {/* Signal Bars */}
        <div className="flex items-end gap-[1.5px] h-3">
          <span className="w-[2.5px] h-1 bg-current rounded-xs" />
          <span className="w-[2.5px] h-1.5 bg-current rounded-xs" />
          <span className="w-[2.5px] h-2 bg-current rounded-xs" />
          <span className="w-[2.5px] h-2.5 bg-current rounded-xs" />
        </div>

        {/* 5G label */}
        <span className="text-[10px] font-bold tracking-tight">5G</span>

        {/* Wifi Icon */}
        <Wifi size={13} strokeWidth={2.5} className="mx-0.5" />

        {/* Battery Icon with Fill */}
        <div className="flex items-center">
          <div className="w-5 h-[11px] rounded-[3px] border border-current p-[1px] flex items-center">
            <div className="w-3.5 h-full bg-emerald-500 rounded-[1.5px]" />
          </div>
          <div className="w-[1.5px] h-[4px] bg-current rounded-r-xs ml-[0.5px]" />
        </div>
      </div>
    </div>
  );
};
