import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpDown,
  UserCheck,
  UserX,
  CreditCard,
  Calendar,
  AlertTriangle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Plus,
  Coins,
  Trash2,
} from 'lucide-react';
import {
  JamiyyaGroup,
  JamiyyaMember,
  CurrencyCode,
  Expense,
} from '../../types';
import { CURRENCY_SYMBOLS } from '../../utils/storage';
import {
  getJamiyyaProgress,
  swapMemberTurns,
  markMemberPayment,
  markPayoutReceived,
  replaceMember,
  generateJamiyyaShareText,
  formatDateToYmd,
} from '../../utils/jamiyyaEngine';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs } from '../../utils/motion';
import { handleModalBackdropClick, dismissKeyboard } from '../../utils/keyboard';
import { Amount } from '../Amount';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

interface JamiyyaDetailModalProps {
  isOpen: boolean;
  group: JamiyyaGroup | null;
  currency: CurrencyCode;
  isEn?: boolean;
  soundEnabled?: boolean;
  onClose: () => void;
  onUpdateGroup: (updatedGroup: JamiyyaGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onLogExpense?: (expense: Omit<Expense, 'id' | 'createdAt'>) => string; // returns created expense ID
  onLogIncome?: (amount: number, title: string, date: string, notes?: string) => string;
}

export const JamiyyaDetailModal: React.FC<JamiyyaDetailModalProps> = ({
  isOpen,
  group,
  currency,
  isEn = false,
  soundEnabled = true,
  onClose,
  onUpdateGroup,
  onDeleteGroup,
  onLogExpense,
  onLogIncome,
}) => {
  if (!isOpen || !group) return null;

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');
  const progress = getJamiyyaProgress(group);

  const [activeTab, setActiveTab] = useState<'cycles' | 'members' | 'summary'>('cycles');
  const [selectedCycleNumber, setSelectedCycleNumber] = useState<number>(progress.currentCycleNumber);
  const [copiedShareText, setCopiedShareText] = useState<boolean>(false);

  // Swap modal state
  const [swapModalOpen, setSwapModalOpen] = useState<boolean>(false);
  const [swapSourceMemberId, setSwapSourceMemberId] = useState<string>('');
  const [swapTargetMemberId, setSwapTargetMemberId] = useState<string>('');

  // Replace member modal state
  const [replaceModalOpen, setReplaceModalOpen] = useState<boolean>(false);
  const [replaceTargetMemberId, setReplaceTargetMemberId] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');

  // Optional auto-logging toggles
  const [logAsExpenseChecked, setLogAsExpenseChecked] = useState<boolean>(true);
  const [logAsIncomeChecked, setLogAsIncomeChecked] = useState<boolean>(true);

  const currentCycle = group.cycles.find((c) => c.cycleNumber === selectedCycleNumber) || group.cycles[0];
  const recipientMember = group.members.find((m) => m.id === currentCycle?.recipientMemberId);
  const isUserRecipient = recipientMember?.isCurrentUser;

  // Payments for selected cycle
  const cyclePayments = group.payments.filter((p) => p.cycleNumber === selectedCycleNumber);
  const paymentMap = new Map(cyclePayments.map((p) => [p.memberId, p]));

  const collectedAmount = cyclePayments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + (p.amountPaid || group.installmentAmount), 0);

  // Toggle member payment
  const handleTogglePayment = (member: JamiyyaMember) => {
    const record = paymentMap.get(member.id);
    const newIsPaid = !record?.isPaid;
    nativeHaptics.tap(soundEnabled);

    let linkedExpenseId = record?.linkedExpenseId;

    // If marking as paid for the user and user wants to log as an expense in budget
    if (newIsPaid && member.isCurrentUser && logAsExpenseChecked && onLogExpense) {
      linkedExpenseId = onLogExpense({
        title: `${isEn ? 'Jam\'iyya Installment' : 'قسط جمعية'}: ${group.name} (دورة ${selectedCycleNumber})`,
        amount: group.installmentAmount,
        categoryId: 'housing', // or default general category
        date: formatDateToYmd(new Date()),
        paymentMethod: 'transfer',
        payer: 'الزوج',
        notes: `سداد قسط الدورة رقم ${selectedCycleNumber} في ${group.name}`,
        source: 'jamiyya',
        jamiyyaId: group.id,
        jamiyyaCycleNumber: selectedCycleNumber,
      });
    }

    const updated = markMemberPayment(
      group,
      selectedCycleNumber,
      member.id,
      newIsPaid,
      newIsPaid ? formatDateToYmd(new Date()) : undefined,
      linkedExpenseId
    );
    onUpdateGroup(updated);
  };

  // Toggle payout delivery
  const handleTogglePayout = () => {
    const newStatus = !currentCycle.payoutReceived;
    nativeHaptics.success(soundEnabled);

    let linkedIncomeId = currentCycle.linkedIncomeExpenseId;
    if (newStatus && isUserRecipient && logAsIncomeChecked && onLogIncome) {
      linkedIncomeId = onLogIncome(
        group.totalPayout,
        `${isEn ? 'Jam\'iyya Pot Received' : 'قبض جمعية'}: ${group.name}`,
        formatDateToYmd(new Date()),
        `استلام مبلغ جمعية ${group.name} بالكامل للدورة ${selectedCycleNumber}`
      );
    }

    const updated = markPayoutReceived(
      group,
      selectedCycleNumber,
      newStatus,
      newStatus ? formatDateToYmd(new Date()) : undefined,
      linkedIncomeId
    );
    onUpdateGroup(updated);
  };

  // Execute turn swap
  const handleConfirmSwap = () => {
    if (!swapSourceMemberId || !swapTargetMemberId || swapSourceMemberId === swapTargetMemberId) return;
    nativeHaptics.success(soundEnabled);
    const updated = swapMemberTurns(group, swapSourceMemberId, swapTargetMemberId);
    onUpdateGroup(updated);
    setSwapModalOpen(false);
  };

  // Execute member replacement
  const handleConfirmReplace = () => {
    if (!replaceTargetMemberId || !newMemberName.trim()) return;
    nativeHaptics.success(soundEnabled);
    const updated = replaceMember(group, replaceTargetMemberId, {
      name: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
    });
    onUpdateGroup(updated);
    setReplaceModalOpen(false);
    setNewMemberName('');
    setNewMemberPhone('');
  };

  // Share via WhatsApp or Native
  const handleShare = async () => {
    nativeHaptics.tap(soundEnabled);
    const shareText = generateJamiyyaShareText(group, isEn ? 'en' : 'ar', currencySymbol);

    try {
      const canShare = await Share.canShare().then((res) => res.value).catch(() => false);
      if (canShare) {
        await Share.share({
          title: group.name,
          text: shareText,
        });
        return;
      }
    } catch {
      // Fallback below
    }

    // Fallback: Copy to clipboard and open WhatsApp Web/URI
    try {
      await Clipboard.write({ string: shareText });
      setCopiedShareText(true);
      setTimeout(() => setCopiedShareText(false), 2500);

      const encoded = encodeURIComponent(shareText);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } catch {
      // Fallback copy
      navigator.clipboard?.writeText(shareText);
      setCopiedShareText(true);
      setTimeout(() => setCopiedShareText(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => handleModalBackdropClick(e, onClose, soundEnabled)}
          className="absolute inset-0 bg-black/60 cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={springs.smooth}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
              dismissKeyboard();
            }
          }}
          className="relative w-full max-w-lg h-[92vh] max-h-[850px] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#1C1C1E] dark:text-white truncate">
                  {group.name}
                </h2>
                {group.status === 'completed' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    {isEn ? 'Completed' : 'مكتملة'}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#8E8E93] mt-0.5 flex items-center gap-2">
                <span>{group.members.length} {isEn ? 'members' : 'أعضاء'}</span>
                <span>·</span>
                <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">
                  {group.totalPayout.toLocaleString()} {currencySymbol} {isEn ? 'pot' : 'القبضة'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#25D366]/30 transition-colors"
                title={isEn ? 'Share on WhatsApp' : 'مشاركة على واتساب'}
              >
                <Share2 size={13} />
                <span>{copiedShareText ? (isEn ? 'Copied!' : 'تم النسخ!') : isEn ? 'Share' : 'واتساب'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Subtabs: Cycles vs Members vs Summary */}
          <div className="px-4 pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('cycles');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cycles'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-2xs'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                {isEn ? 'Cycles & Payments' : 'الدورات والتسديد'}
              </button>

              <button
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('members');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'members'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-2xs'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                {isEn ? 'Turns & Members' : 'جدول الأدوار والأعضاء'}
              </button>

              <button
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setActiveTab('summary');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white shadow-2xs'
                    : 'text-[#8E8E93] hover:text-[#1C1C1E]'
                }`}
              >
                {isEn ? 'Overview' : 'الموقف المالي'}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {/* VIEW 1: CYCLES & PAYMENTS */}
            {activeTab === 'cycles' && (
              <div className="space-y-4">
                {/* Horizontal Cycle Selector Ribbon */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#8E8E93]">
                    <span>{isEn ? 'Select Cycle' : 'اختر الدورة'}</span>
                    <span className="tabular-nums">
                      {isEn
                        ? `Cycle ${selectedCycleNumber} of ${group.cycles.length}`
                        : `الدورة ${selectedCycleNumber} من ${group.cycles.length}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {group.cycles.map((cy) => {
                      const isSelected = cy.cycleNumber === selectedCycleNumber;
                      const isCurrent = cy.cycleNumber === progress.currentCycleNumber;
                      return (
                        <button
                          key={`tab-cy-${cy.cycleNumber}`}
                          onClick={() => {
                            nativeHaptics.tap(soundEnabled);
                            setSelectedCycleNumber(cy.cycleNumber);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : cy.payoutReceived
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : isCurrent
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{isEn ? `C${cy.cycleNumber}` : `دورة ${cy.cycleNumber}`}</span>
                          {cy.payoutReceived && <Check size={12} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pot Recipient Hero Banner for selected cycle */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 border border-emerald-500/25 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
                        {isEn ? 'Pot Recipient (Turn)' : 'صاحب الدور ومستلم القبضة'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <h4 className="text-base font-black text-[#1C1C1E] dark:text-white">
                          {recipientMember?.name || (isEn ? 'Member' : 'عضو')}
                        </h4>
                        {recipientMember?.isCurrentUser && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            {isEn ? 'You!' : 'أنت!'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#8E8E93] mt-0.5 block flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{isEn ? 'Due date:' : 'موعد الاستحقاق:'} {currentCycle.dueDate}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {group.totalPayout.toLocaleString()} {currencySymbol}
                      </span>
                      <span className="text-[10px] text-[#8E8E93] block font-medium">
                        {isEn ? 'Expected Pot' : 'إجمالي مبلغ الدورة'}
                      </span>
                    </div>
                  </div>

                  {/* Pot Collection Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        {isEn ? 'Collected Pot:' : 'المحصّل من الأقساط:'}
                      </span>
                      <span className="font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                        {collectedAmount.toLocaleString()} / {group.totalPayout.toLocaleString()} {currencySymbol}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((collectedAmount / group.totalPayout) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Deliver / Receive Pot Button */}
                  <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTogglePayout}
                      className={`py-2 px-3.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        currentCycle.payoutReceived
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#1C1C1E] text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {currentCycle.payoutReceived
                          ? isEn
                            ? `Pot Delivered (${currentCycle.payoutDate || ''})`
                            : `تم تسليم القبضة (${currentCycle.payoutDate || ''})`
                          : isEn
                          ? 'Mark Pot as Delivered/Received'
                          : 'تسجيل تسليم/استلام القبضة'}
                      </span>
                    </button>

                    {isUserRecipient && !currentCycle.payoutReceived && onLogIncome && (
                      <label className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={logAsIncomeChecked}
                          onChange={(e) => setLogAsIncomeChecked(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{isEn ? 'Record as income in budget' : 'تسجيل كدخل في الميزانية'}</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Member Installment Payments Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {isEn ? 'Member Installment Payments' : 'كشف سداد الأقساط لهذه الدورة'}
                    </span>
                    <span className="text-xs text-[#8E8E93] font-semibold tabular-nums">
                      {cyclePayments.filter((p) => p.isPaid).length} / {group.members.length} {isEn ? 'paid' : 'سدّدوا'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-2xs">
                    {group.members.map((mem) => {
                      const record = paymentMap.get(mem.id);
                      const isPaid = Boolean(record?.isPaid);
                      const isTurnMember = mem.id === currentCycle.recipientMemberId;

                      return (
                        <div
                          key={`pay-row-${mem.id}-${selectedCycleNumber}`}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black flex items-center justify-center tabular-nums text-slate-700 dark:text-slate-300">
                                {mem.payoutTurn}
                              </span>
                              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
                                {mem.name}
                              </span>
                              {mem.isCurrentUser && (
                                <span className="text-[10px] font-extrabold text-emerald-600">
                                  ({isEn ? 'You' : 'أنت'})
                                </span>
                              )}
                              {isTurnMember && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  · {isEn ? 'Recipient' : 'صاحب القبضة'}
                                </span>
                              )}
                            </div>

                            {isPaid && record?.paidDate && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                                {isEn ? `Paid on ${record.paidDate}` : `تم السداد بتاريخ ${record.paidDate}`}
                              </span>
                            )}
                          </div>

                          {/* Toggle Payment Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-white tabular-nums">
                              {group.installmentAmount.toLocaleString()} {currencySymbol}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleTogglePayment(mem)}
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                isPaid
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {isPaid ? <Check size={13} strokeWidth={3} /> : <Clock size={13} />}
                              <span>{isPaid ? (isEn ? 'Paid' : 'سدّد') : isEn ? 'Unpaid' : 'متبقي'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: TURNS & MEMBERS SCHEDULE */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {isEn ? 'Payout Schedule & Turns' : 'جدول استلام الأدوار والأسهم'}
                    </h4>
                    <span className="text-[11px] text-[#8E8E93]">
                      {isEn ? 'Swap turns or replace members anytime' : 'يمكنك تبديل الأدوار أو استبدال أي عضو بسهولة'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      nativeHaptics.tap(soundEnabled);
                      setSwapSourceMemberId(group.members[0]?.id || '');
                      setSwapTargetMemberId(group.members[1]?.id || '');
                      setSwapModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowUpDown size={13} />
                    <span>{isEn ? 'Swap Turns' : 'تبديل الأدوار'}</span>
                  </button>
                </div>

                {/* Members list sorted by payoutTurn */}
                <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-2xs">
                  {[...group.members]
                    .sort((a, b) => a.payoutTurn - b.payoutTurn)
                    .map((mem) => {
                      const cycle = group.cycles.find((c) => c.cycleNumber === mem.payoutTurn);
                      const memberSummary = progress.memberSummaries.find((s) => s.member.id === mem.id);

                      return (
                        <div
                          key={`turn-row-${mem.id}`}
                          className="p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 tabular-nums">
                              {mem.payoutTurn}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
                                  {mem.name}
                                </span>
                                {mem.isCurrentUser && (
                                  <span className="text-[10px] font-extrabold text-emerald-600">
                                    ({isEn ? 'You' : 'أنت'})
                                  </span>
                                )}
                                {mem.isOrganizer && (
                                  <span className="text-[10px] font-bold text-[#8E8E93]">
                                    ({isEn ? 'Admin' : 'المنسق'})
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-[#8E8E93] mt-0.5 flex items-center gap-2">
                                <span>{cycle?.dueDate}</span>
                                <span>·</span>
                                <span>
                                  {isEn ? 'Paid' : 'سدّد'}: {memberSummary?.paidCyclesCount || 0}/{group.cycles.length}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {cycle?.payoutReceived ? (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Check size={12} strokeWidth={3} />
                                <span>{isEn ? 'Pot Taken' : 'قبض حصته'}</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  nativeHaptics.tap(soundEnabled);
                                  setReplaceTargetMemberId(mem.id);
                                  setNewMemberName('');
                                  setNewMemberPhone('');
                                  setReplaceModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                {isEn ? 'Replace' : 'استبدال'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* VIEW 3: FINANCIAL OVERVIEW & DISCREPANCIES */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] text-[#8E8E93] block font-semibold">
                      {isEn ? 'Total Collected' : 'إجمالي المحصّل حتى الآن'}
                    </span>
                    <Amount
                      value={progress.totalCollectedOverall}
                      currency={currency}
                      language={isEn ? 'en' : 'ar'}
                      className="text-lg font-black text-[#1C1C1E] dark:text-white"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <span className="text-[11px] text-[#8E8E93] block font-semibold">
                      {isEn ? 'Total Expected' : 'المبلغ الكامل المستهدف'}
                    </span>
                    <Amount
                      value={progress.totalExpectedOverall}
                      currency={currency}
                      language={isEn ? 'en' : 'ar'}
                      className="text-lg font-black text-[#1C1C1E] dark:text-white"
                    />
                  </div>
                </div>

                {/* User's Personal Breakdown Card */}
                {progress.userMember && (
                  <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                      {isEn ? 'Your Personal Contribution' : 'موقفك المالي الشخصي في الجمعية'}
                    </h4>

                    {(() => {
                      const userSum = progress.memberSummaries.find((s) => s.isCurrentUser);
                      if (!userSum) return null;
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[11px] text-[#8E8E93] block">
                              {isEn ? 'Total You Paid' : 'إجمالي ما دفعته:'}
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {userSum.totalPaid.toLocaleString()} {currencySymbol}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-[#8E8E93] block">
                              {isEn ? 'Remaining to Pay' : 'المتبقي عليك:'}
                            </span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">
                              {userSum.totalRemaining.toLocaleString()} {currencySymbol}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Discrepancies & Audit Log */}
                {group.discrepancies && group.discrepancies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 px-1">
                      <AlertTriangle size={13} />
                      <span>{isEn ? 'Discrepancies & Changes Log' : 'سجل التغييرات والبدائل'}</span>
                    </span>

                    <div className="space-y-2">
                      {group.discrepancies.map((d) => (
                        <div
                          key={d.id}
                          className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[10px] text-amber-800/80 dark:text-amber-300/80 font-bold">
                            <span>{d.date}</span>
                            <span>{d.type}</span>
                          </div>
                          <p className="text-amber-900 dark:text-amber-100 font-medium">
                            {d.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group Completion & Danger Zone */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {group.status !== 'completed' && (
                    <button
                      onClick={() => {
                        nativeHaptics.success(soundEnabled);
                        onUpdateGroup({ ...group, status: 'completed' });
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      {isEn ? 'Mark Jam\'iyya as Completed' : 'تعليم الجمعية كمكتملة ومقفلة'}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      nativeHaptics.impactLight(soundEnabled);
                      if (window.confirm(isEn ? 'Delete this Jam\'iyya group permanently?' : 'هل أنت متأكد من حذف هذه الجمعية نهائياً؟')) {
                        onDeleteGroup(group.id);
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>{isEn ? 'Delete Group' : 'حذف الجمعية'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Swap Turns Modal */}
        {swapModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSwapModalOpen(false)} />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4">
              <h4 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                {isEn ? 'Swap Payout Turns' : 'تبديل دور الاستلام بين عضوين'}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#8E8E93] mb-1">
                    {isEn ? 'First Member' : 'العضو الأول'}
                  </label>
                  <select
                    value={swapSourceMemberId}
                    onChange={(e) => setSwapSourceMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden"
                  >
                    {group.members.map((m) => (
                      <option key={`m1-${m.id}`} value={m.id}>
                        {m.name} (دور رقم {m.payoutTurn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8E8E93] mb-1">
                    {isEn ? 'Second Member to Swap With' : 'العضو المراد التبديل معه'}
                  </label>
                  <select
                    value={swapTargetMemberId}
                    onChange={(e) => setSwapTargetMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden"
                  >
                    {group.members.map((m) => (
                      <option key={`m2-${m.id}`} value={m.id}>
                        {m.name} (دور رقم {m.payoutTurn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSwapModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                  <button
                    onClick={handleConfirmSwap}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700"
                  >
                    {isEn ? 'Confirm Swap' : 'تأكيد التبديل'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Replace Member Modal */}
        {replaceModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setReplaceModalOpen(false)} />
            <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4">
              <h4 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                {isEn ? 'Replace Member' : 'استبدال عضو في الجمعية'}
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#8E8E93] mb-1">
                    {isEn ? 'New Member Name' : 'اسم العضو الجديد البديل'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder={isEn ? 'Full Name' : 'الاسم الكامل'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8E8E93] mb-1">
                    {isEn ? 'Phone (Optional)' : 'رقم الجوال (اختياري للتذكيرات)'}
                  </label>
                  <input
                    type="tel"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="05..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setReplaceModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'إلغاء'}
                  </button>
                  <button
                    onClick={handleConfirmReplace}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700"
                  >
                    {isEn ? 'Confirm' : 'اعتماد البديل'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
