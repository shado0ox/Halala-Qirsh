import React from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { JamiyyaGroup, CurrencyCode } from '../../types';
import { CURRENCY_SYMBOLS } from '../../utils/storage';
import { getJamiyyaProgress } from '../../utils/jamiyyaEngine';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs } from '../../utils/motion';
import { Amount } from '../Amount';

interface JamiyyaGroupCardProps {
  group: JamiyyaGroup;
  currency: CurrencyCode;
  isEn?: boolean;
  isHidden?: boolean;
  soundEnabled?: boolean;
  onOpenDetails: (group: JamiyyaGroup) => void;
  onShareWhatsApp: (group: JamiyyaGroup) => void;
}

export const JamiyyaGroupCard: React.FC<JamiyyaGroupCardProps> = ({
  group,
  currency,
  isEn = false,
  isHidden = false,
  soundEnabled = true,
  onOpenDetails,
  onShareWhatsApp,
}) => {
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');
  const progress = getJamiyyaProgress(group);
  const isCompleted = group.status === 'completed';

  const userTurn = progress.userMember?.payoutTurn;
  const userTurnDate = progress.userPayoutCycle?.dueDate;
  const isUserTurnNow = progress.currentCycleNumber === userTurn;

  return (
    <motion.div
      layout
      transition={springs.smooth}
      className={`p-4 rounded-3xl border transition-all space-y-3.5 shadow-2xs ${
        isCompleted
          ? 'bg-slate-50 dark:bg-[#1C1C1E]/60 border-slate-200 dark:border-slate-800 opacity-90'
          : isUserTurnNow
          ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 border-emerald-500/40'
          : 'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Top Header: Group Name, Total Pot & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-base text-[#1C1C1E] dark:text-white truncate">
              {group.name}
            </h3>
            {isCompleted ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {isEn ? 'Completed' : 'مكتملة بالكامل'}
              </span>
            ) : isUserTurnNow ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles size={11} />
                <span>{isEn ? 'Your Turn to Collect!' : 'دورك في القبض!'}</span>
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                · {isEn ? 'Active' : 'نشطة'}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-[#8E8E93] flex-wrap">
            <span className="flex items-center gap-1">
              <Users size={12} />
              <span>{group.members.length} {isEn ? 'members' : 'أعضاء'}</span>
            </span>
            <span>·</span>
            <span>
              {group.frequency === 'weekly'
                ? isEn ? 'Weekly' : 'أسبوعياً'
                : group.frequency === 'biweekly'
                ? isEn ? 'Bi-weekly' : 'كل أسبوعين'
                : isEn ? 'Monthly' : 'شهرياً'}
            </span>
            <span>·</span>
            <span className="tabular-nums">{group.startDate}</span>
          </div>
        </div>

        {/* Total Pot Payout */}
        <div className="text-right shrink-0">
          <span className="text-[10px] text-[#8E8E93] block font-semibold">
            {isEn ? 'Pot Amount' : 'مبلغ القبضة'}
          </span>
          <Amount
            value={group.totalPayout}
            currency={currency}
            hideAmounts={isHidden}
            language={isEn ? 'en' : 'ar'}
            className="text-base font-black text-[#1C1C1E] dark:text-white"
          />
        </div>
      </div>

      {/* Cycle Progress Bar */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isEn
              ? `Cycle ${progress.currentCycleNumber} of ${group.cycles.length}`
              : `الدورة ${progress.currentCycleNumber} من ${group.cycles.length}`}
          </span>
          <span className="text-[11px] text-[#8E8E93] font-semibold tabular-nums">
            {progress.completionPercentage}% {isEn ? 'completed' : 'مكتمل'}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, progress.completionPercentage)}%` }}
          />
        </div>
      </div>

      {/* Key Info Strip: User Turn & Current Recipient */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
          <span className="text-[10px] text-[#8E8E93] block font-medium">
            {isEn ? 'Current Recipient' : 'مستلم الدورة الحالية'}
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
            {progress.currentRecipient?.name || (isEn ? 'None' : 'غير محدد')}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5 tabular-nums">
            {progress.collectedForCurrentCycle.toLocaleString()} / {progress.expectedForCurrentCycle.toLocaleString()} {currencySymbol}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
          <span className="text-[10px] text-[#8E8E93] block font-medium">
            {isEn ? 'Your Turn' : 'ترتيب دورك'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {userTurn ? (isEn ? `Turn #${userTurn}` : `دور رقم ${userTurn}`) : (isEn ? 'Not assigned' : 'غير محدد')}
            </span>
          </div>
          {userTurnDate && (
            <span className="text-[10px] text-[#8E8E93] block mt-0.5 tabular-nums">
              {userTurnDate}
            </span>
          )}
        </div>
      </div>

      {/* User installment status badge */}
      {progress.userMember && !isCompleted && (
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5">
            {progress.userInstallmentDueForCurrentCycle ? (
              <>
                <Clock size={13} className="text-amber-500" />
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {isEn ? 'Your installment is pending' : 'قسطك لهذه الدورة مستحق للسداد'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {isEn ? 'You paid this cycle\'s installment' : 'تم سداد قسطك لهذه الدورة'}
                </span>
              </>
            )}
          </div>

          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
            {group.installmentAmount.toLocaleString()} {currencySymbol}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => {
            nativeHaptics.tap(soundEnabled);
            onOpenDetails(group);
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
        >
          <span>{isEn ? 'Manage & Collect' : 'إدارة ومتابعة السداد'}</span>
          {isEn ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <button
          onClick={() => {
            nativeHaptics.tap(soundEnabled);
            onShareWhatsApp(group);
          }}
          className="py-2 px-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#25D366]/30 transition-colors"
          title={isEn ? 'Share on WhatsApp' : 'مشاركة على واتساب'}
        >
          <Share2 size={14} />
          <span>{isEn ? 'WhatsApp' : 'واتساب'}</span>
        </button>
      </div>
    </motion.div>
  );
};
