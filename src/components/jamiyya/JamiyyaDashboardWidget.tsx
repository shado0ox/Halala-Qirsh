import React from 'react';
import { motion } from 'motion/react';
import { Coins, ChevronLeft, ChevronRight, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { JamiyyaGroup, CurrencyCode } from '../../types';
import { CURRENCY_SYMBOLS } from '../../utils/storage';
import { getJamiyyaProgress } from '../../utils/jamiyyaEngine';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs } from '../../utils/motion';

interface JamiyyaDashboardWidgetProps {
  jamiyyas: JamiyyaGroup[];
  currency: CurrencyCode;
  isEn?: boolean;
  lang?: string;
  soundEnabled?: boolean;
  onOpenJamiyya?: (group: JamiyyaGroup) => void;
  onNavigateToTab?: (tabId: string) => void;
  onOpenJamiyyas?: () => void;
  onSelectGroup?: (group: JamiyyaGroup) => void;
}

export const JamiyyaDashboardWidget: React.FC<JamiyyaDashboardWidgetProps> = ({
  jamiyyas,
  currency,
  isEn,
  lang,
  soundEnabled = true,
  onOpenJamiyya,
  onNavigateToTab,
  onOpenJamiyyas,
  onSelectGroup,
}) => {
  const isEnglish = isEn ?? lang === 'en';
  const handleOpenGroup = (group: JamiyyaGroup) => {
    if (onSelectGroup) onSelectGroup(group);
    else if (onOpenJamiyya) onOpenJamiyya(group);
    else if (onNavigateToTab) onNavigateToTab('bills_groceries');
  };

  const handleOpenAll = () => {
    if (onOpenJamiyyas) onOpenJamiyyas();
    else if (onNavigateToTab) onNavigateToTab('bills_groceries');
  };

  const activeJamiyyas = jamiyyas.filter((j) => j.status === 'active');
  if (activeJamiyyas.length === 0) return null;

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEnglish ? 'SAR' : 'ر.س');
  const primaryGroup = activeJamiyyas[0];
  const progress = getJamiyyaProgress(primaryGroup);
  const isUserTurnNow = progress.currentCycleNumber === progress.userMember?.payoutTurn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.smooth}
      onClick={() => {
        nativeHaptics.tap(soundEnabled);
        handleOpenGroup(primaryGroup);
      }}
      className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 border border-emerald-500/25 cursor-pointer shadow-2xs hover:border-emerald-500/40 transition-all space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            🪙
          </div>
          <div>
            <span className="text-xs font-black text-[#1C1C1E] dark:text-white">
              {primaryGroup.name}
            </span>
            <span className="text-[10px] text-[#8E8E93] block">
              {isEnglish
                ? `Cycle ${progress.currentCycleNumber} of ${primaryGroup.cycles.length}`
                : `الدورة ${progress.currentCycleNumber} من ${primaryGroup.cycles.length}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <span>{isEnglish ? 'Manage' : 'متابعة'}</span>
          {isEnglish ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </div>
      </div>

      {/* Status & User Turn Highlight */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-500/15">
        <div className="flex items-center gap-1.5">
          {isUserTurnNow ? (
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles size={12} />
              <span>{isEnglish ? 'Your turn to collect pot!' : 'دورك في القبض هذه الدورة!'}</span>
            </span>
          ) : progress.userMember?.payoutTurn ? (
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {isEnglish
                ? `Your turn: #${progress.userMember.payoutTurn}`
                : `دورك: رقم ${progress.userMember.payoutTurn} (${progress.userPayoutCycle?.dueDate || ''})`}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {progress.userInstallmentDueForCurrentCycle ? (
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock size={11} />
              <span>{isEnglish ? 'Installment due' : 'القسط مستحق'}</span>
            </span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>{isEnglish ? 'Paid' : 'سدّدت قسطك'}</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
