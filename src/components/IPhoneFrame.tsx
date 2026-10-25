import React from 'react';
import { Smartphone, Monitor, Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { StatusBar } from './StatusBar';

interface IPhoneFrameProps {
  children: React.ReactNode;
  frameMode: boolean;
  onToggleFrameMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  children,
  frameMode,
  onToggleFrameMode,
  soundEnabled,
  onToggleSound,
  isDark,
  onToggleDark,
}) => {
  return (
    <div className={`min-h-screen w-full transition-colors duration-300 flex flex-col items-center ${
      isDark ? 'dark bg-[#09090b]' : 'bg-[#E5E5EA]'
    }`}>
      {/* Top Floating Control Bar (Desktop Only) */}
      <header className="w-full max-w-5xl px-4 py-2.5 hidden md:flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Smartphone size={16} />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">مصاريف البيت iOS</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-2">· تخزين محلي 100%</span>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-300/60 dark:border-slate-800 shadow-xs text-xs font-medium">
          <button
            onClick={onToggleFrameMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              frameMode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="تبديل بين إطار الآيفون والعرض الكامل"
          >
            {frameMode ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span>{frameMode ? 'إطار الآيفون' : 'العرض الكامل'}</span>
          </button>

          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              soundEnabled
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={soundEnabled ? 'كتم مؤثرات iOS الصوتية' : 'تفعيل أصوات iOS'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full flex-1 flex items-center justify-center p-0 md:p-4 pb-0 md:pb-6">
        {frameMode ? (
          /* Realistic iPhone 16 Pro Chassis */
          <div className="relative w-full max-w-[430px] h-[100dvh] md:h-[870px] md:max-h-[92vh] flex flex-col bg-black md:rounded-[54px] md:p-[11px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1),0_0_0_8px_#27272a] transition-all">
            {/* Side Hardware Buttons (Desktop only) */}
            <div className="hidden md:block absolute -left-[12px] top-[115px] w-[4px] h-[28px] bg-[#3f3f46] rounded-l-md shadow-xs" title="Action Button" />
            <div className="hidden md:block absolute -left-[12px] top-[160px] w-[4px] h-[52px] bg-[#3f3f46] rounded-l-md shadow-xs" title="Volume Up" />
            <div className="hidden md:block absolute -left-[12px] top-[225px] w-[4px] h-[52px] bg-[#3f3f46] rounded-l-md shadow-xs" title="Volume Down" />
            <div className="hidden md:block absolute -right-[12px] top-[170px] w-[4px] h-[75px] bg-[#3f3f46] rounded-r-md shadow-xs" title="Power Button" />

            {/* Inner Screen Display */}
            <div className="relative w-full h-full flex flex-col bg-[#F2F2F7] dark:bg-[#000000] md:rounded-[44px] overflow-hidden">
              {/* iPhone Status Bar */}
              <StatusBar />

              {/* Dynamic Content */}
              <div className="flex-1 w-full flex flex-col overflow-hidden relative">
                {children}
              </div>
            </div>
          </div>
        ) : (
          /* Full Viewport Layout (Responsive) */
          <div className="w-full max-w-4xl h-[100dvh] md:h-[90vh] flex flex-col bg-[#F2F2F7] dark:bg-[#000000] md:rounded-3xl md:shadow-xl md:border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Minimal Status Bar */}
            <div className="md:hidden">
              <StatusBar />
            </div>

            {/* App Content */}
            <div className="flex-1 w-full flex flex-col overflow-hidden relative">
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
