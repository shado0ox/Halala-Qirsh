import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Users,
  Calendar,
  Coins,
  ShieldCheck,
  CreditCard,
  Sparkles,
  User,
  Crown,
} from 'lucide-react';
import { JamiyyaFrequency, CurrencyCode } from '../../types';
import { CURRENCY_SYMBOLS } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { springs } from '../../utils/motion';
import { formatDateToYmd } from '../../utils/jamiyyaEngine';
import { handleModalBackdropClick, dismissKeyboard } from '../../utils/keyboard';

export interface CustomMemberInput {
  id: string;
  name: string;
  phone: string;
  isCurrentUser: boolean;
  isOrganizer: boolean;
}

interface CreateJamiyyaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  isEn?: boolean;
  soundEnabled?: boolean;
  onCreateGroup: (groupData: {
    name: string;
    totalPayout: number;
    installmentAmount: number;
    membersCount: number;
    frequency: JamiyyaFrequency;
    startDate: string;
    bankAccountInfo?: string;
    notes?: string;
    reminderDaysBefore: number;
    members: Array<{
      name: string;
      phone?: string;
      isCurrentUser?: boolean;
      isOrganizer?: boolean;
    }>;
  }) => void;
}

const COMMON_COUNTS = [5, 6, 8, 10, 12];

export const CreateJamiyyaModal: React.FC<CreateJamiyyaModalProps> = ({
  isOpen,
  onClose,
  currency,
  isEn = false,
  soundEnabled = true,
  onCreateGroup,
}) => {
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');

  const [name, setName] = useState<string>('');
  const [totalPayoutStr, setTotalPayoutStr] = useState<string>('50000');
  const [installmentStr, setInstallmentStr] = useState<string>('5000');
  const [frequency, setFrequency] = useState<JamiyyaFrequency>('monthly');
  const [startDate, setStartDate] = useState<string>(formatDateToYmd(new Date()));
  const [bankAccountInfo, setBankAccountInfo] = useState<string>('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(3);

  // Editable members list
  const [members, setMembers] = useState<CustomMemberInput[]>([
    { id: '1', name: isEn ? 'Me (Admin)' : 'أنا (المنسق)', phone: '', isCurrentUser: true, isOrganizer: true },
    { id: '2', name: isEn ? 'Member 2' : 'عضو 2', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '3', name: isEn ? 'Member 3' : 'عضو 3', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '4', name: isEn ? 'Member 4' : 'عضو 4', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '5', name: isEn ? 'Member 5' : 'عضو 5', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '6', name: isEn ? 'Member 6' : 'عضو 6', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '7', name: isEn ? 'Member 7' : 'عضو 7', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '8', name: isEn ? 'Member 8' : 'عضو 8', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '9', name: isEn ? 'Member 9' : 'عضو 9', phone: '', isCurrentUser: false, isOrganizer: false },
    { id: '10', name: isEn ? 'Member 10' : 'عضو 10', phone: '', isCurrentUser: false, isOrganizer: false },
  ]);

  const membersCount = members.length;
  const payout = parseFloat(totalPayoutStr) || 0;
  const installment = parseFloat(installmentStr) || 0;

  // Handle manual member count change (via input or presets)
  const setExactMembersCount = (newCount: number) => {
    const validCount = Math.max(2, Math.min(50, Math.round(newCount)));
    nativeHaptics.tap(soundEnabled);

    setMembers((prev) => {
      if (validCount === prev.length) return prev;

      if (validCount > prev.length) {
        const added: CustomMemberInput[] = [];
        for (let i = prev.length; i < validCount; i++) {
          added.push({
            id: `mem-${Date.now()}-${i}`,
            name: isEn ? `Member ${i + 1}` : `عضو ${i + 1}`,
            phone: '',
            isCurrentUser: false,
            isOrganizer: false,
          });
        }
        return [...prev, ...added];
      } else {
        const trimmed = prev.slice(0, validCount);
        // Ensure at least one member is marked as current user
        if (!trimmed.some((m) => m.isCurrentUser) && trimmed.length > 0) {
          trimmed[0].isCurrentUser = true;
        }
        return trimmed;
      }
    });

    // Keep installment fixed and recalculate total pot
    if (installment > 0) {
      setTotalPayoutStr(Math.round(installment * validCount).toString());
    }
  };

  // Add individual member
  const handleAddMember = () => {
    nativeHaptics.success(soundEnabled);
    const nextIdx = members.length + 1;
    const newMember: CustomMemberInput = {
      id: `mem-${Date.now()}-${nextIdx}`,
      name: isEn ? `Member ${nextIdx}` : `عضو ${nextIdx}`,
      phone: '',
      isCurrentUser: false,
      isOrganizer: false,
    };
    setMembers((prev) => [...prev, newMember]);

    if (installment > 0) {
      setTotalPayoutStr(Math.round(installment * nextIdx).toString());
    }
  };

  // Remove individual member
  const handleRemoveMember = (indexToRemove: number) => {
    if (members.length <= 2) return;
    nativeHaptics.tap(soundEnabled);

    setMembers((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (!updated.some((m) => m.isCurrentUser) && updated.length > 0) {
        updated[0].isCurrentUser = true;
      }
      return updated;
    });

    const newLen = members.length - 1;
    if (installment > 0) {
      setTotalPayoutStr(Math.round(installment * newLen).toString());
    }
  };

  // Update member field
  const handleMemberChange = (index: number, field: keyof CustomMemberInput, val: any) => {
    setMembers((prev) => {
      const updated = [...prev];
      if (field === 'isCurrentUser') {
        // Only one member can be current user
        return updated.map((m, i) => ({
          ...m,
          isCurrentUser: i === index ? Boolean(val) : false,
        }));
      }
      if (field === 'isOrganizer') {
        return updated.map((m, i) => ({
          ...m,
          isOrganizer: i === index ? Boolean(val) : false,
        }));
      }
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // When total pot is typed
  const handleTotalPayoutChange = (valStr: string) => {
    setTotalPayoutStr(valStr);
    const pot = parseFloat(valStr) || 0;
    if (pot > 0 && membersCount > 0) {
      setInstallmentStr(Math.round(pot / membersCount).toString());
    }
  };

  // When installment is typed
  const handleInstallmentChange = (valStr: string) => {
    setInstallmentStr(valStr);
    const inst = parseFloat(valStr) || 0;
    if (inst > 0 && membersCount > 0) {
      setTotalPayoutStr(Math.round(inst * membersCount).toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || payout <= 0 || installment <= 0 || membersCount < 2) return;

    nativeHaptics.success(soundEnabled);

    const finalizedMembers = members.map((m, idx) => ({
      name: m.name.trim() || (idx === 0 ? (isEn ? 'Me' : 'أنا') : isEn ? `Member ${idx + 1}` : `عضو ${idx + 1}`),
      phone: m.phone.trim() || undefined,
      isCurrentUser: m.isCurrentUser,
      isOrganizer: m.isOrganizer,
    }));

    onCreateGroup({
      name: name.trim(),
      totalPayout: payout,
      installmentAmount: installment,
      membersCount,
      frequency,
      startDate,
      bankAccountInfo: bankAccountInfo.trim() || undefined,
      reminderDaysBefore,
      members: finalizedMembers,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-lg max-h-[92vh] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                🪙
              </div>
              <div>
                <h3 className="text-base font-black text-[#1C1C1E] dark:text-white">
                  {isEn ? 'New Jam\'iyya Group' : 'إنشاء جمعية مالية جديدة'}
                </h3>
                <span className="text-[11px] text-[#8E8E93]">
                  {isEn ? 'Customize members, turns, pot & installments' : 'تخصيص عدد الأعضاء والأدوار والأقساط بسهولة'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 no-scrollbar flex-1">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                {isEn ? 'Group Name' : 'اسم الجمعية'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? 'e.g. Family Savings, Work Jam\'iyya' : 'مثال: جمعية الأهل، جمعية الزملاء، جمعية الصيف'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Members Count Customizer (Editable & Stepper) */}
            <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {isEn ? 'Number of Members (Cycles)' : 'عدد الأعضاء والدورات (قابل للتعديل)'}
                  </label>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    {isEn ? 'Each member receives the pot once in turn' : 'كل عضو يستلم القبضة مرة واحدة في دوره'}
                  </span>
                </div>

                {/* Stepper buttons & direct numeric input */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] border border-emerald-500/30 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setExactMembersCount(membersCount - 1)}
                    disabled={membersCount <= 2}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>

                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={membersCount}
                    onChange={(e) => setExactMembersCount(parseInt(e.target.value, 10) || 2)}
                    className="w-10 text-center font-black text-sm text-[#1C1C1E] dark:text-white outline-hidden tabular-nums bg-transparent"
                  />

                  <button
                    type="button"
                    onClick={() => setExactMembersCount(membersCount + 1)}
                    disabled={membersCount >= 50}
                    className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {isEn ? 'Presets:' : 'خيارات سريعة:'}
                </span>
                {COMMON_COUNTS.map((cnt) => {
                  const isSelected = cnt === membersCount;
                  return (
                    <button
                      key={`preset-${cnt}`}
                      type="button"
                      onClick={() => setExactMembersCount(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {cnt} {isEn ? 'Members' : 'أعضاء'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Numbers: Payout Pot & Installment */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                  {isEn ? `Total Pot (${currencySymbol})` : `مبلغ القبضة الكامل (${currencySymbol})`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={100}
                  value={totalPayoutStr}
                  onChange={(e) => handleTotalPayoutChange(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                />
                <span className="text-[10px] text-[#8E8E93] mt-0.5 block">
                  {isEn ? `= ${membersCount} × ${installment} ${currencySymbol}` : `= ${membersCount} أعضاء × ${installment} ${currencySymbol}`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                  {isEn ? `Installment per Member (${currencySymbol})` : `سهم القسط للعضو (${currencySymbol})`}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={50}
                  value={installmentStr}
                  onChange={(e) => handleInstallmentChange(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                />
                <span className="text-[10px] text-[#8E8E93] mt-0.5 block">
                  {isEn ? 'Monthly/cycle share' : 'قسط الدورة الواحدة'}
                </span>
              </div>
            </div>

            {/* Frequency & Start Date */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                  {isEn ? 'Cycle Frequency' : 'دورية السداد'}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as JamiyyaFrequency)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="monthly">{isEn ? 'Monthly' : 'شهرياً'}</option>
                  <option value="biweekly">{isEn ? 'Every 2 Weeks' : 'كل أسبوعين'}</option>
                  <option value="weekly">{isEn ? 'Weekly' : 'أسبوعياً'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                  {isEn ? 'Start Date' : 'تاريخ الانطلاق'}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                />
              </div>
            </div>

            {/* Bank / Transfer Info (Optional for WhatsApp sharing) */}
            <div>
              <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                {isEn ? 'Payment Destination / IBAN (Optional for WhatsApp share)' : 'بيانات الحساب أو وسيلة التحويل (اختياري للواتساب)'}
              </label>
              <input
                type="text"
                value={bankAccountInfo}
                onChange={(e) => setBankAccountInfo(e.target.value)}
                placeholder={isEn ? 'e.g. IBAN: SA..., STC Pay: 05...' : 'مثال: آيبان الراجحي: SA... أو رقم STC Pay'}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Members Customizer List */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  <span>{isEn ? `Members & Turns (${membersCount})` : `تخصيص أسماء الأعضاء والأدوار (${membersCount})`}</span>
                </span>
                <span className="text-[11px] text-[#8E8E93]">
                  {isEn ? 'Edit name, phone, or swap' : 'عدل الاسم والجوال وحدد دورك'}
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
                {members.map((m, idx) => (
                  <div
                    key={m.id || `mem-row-${idx}`}
                    className="p-2.5 rounded-xl bg-[#F9FBF9] dark:bg-[#252528] border border-slate-200/60 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      {/* Turn Number Badge */}
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </div>

                      {/* Name & Phone Inputs */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                          placeholder={isEn ? `Member ${idx + 1}` : `اسم العضو ${idx + 1}`}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] text-xs font-bold text-[#1C1C1E] dark:text-white border border-slate-200 dark:border-slate-700 outline-hidden focus:border-emerald-500"
                        />
                        <input
                          type="tel"
                          value={m.phone}
                          onChange={(e) => handleMemberChange(idx, 'phone', e.target.value)}
                          placeholder={isEn ? 'Phone (Optional)' : 'الجوال (اختياري)'}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1C1C1E] text-xs text-[#1C1C1E] dark:text-white border border-slate-200 dark:border-slate-700 outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      {/* Remove Member Button */}
                      {members.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors shrink-0"
                          title={isEn ? 'Remove member' : 'حذف العضو'}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Quick Role Badges (Me & Organizer) */}
                    <div className="flex items-center gap-2 text-[10px] px-8">
                      <button
                        type="button"
                        onClick={() => handleMemberChange(idx, 'isCurrentUser', !m.isCurrentUser)}
                        className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          m.isCurrentUser
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <User size={10} />
                        <span>{isEn ? 'Me' : 'أنا'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMemberChange(idx, 'isOrganizer', !m.isOrganizer)}
                        className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          m.isOrganizer
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Crown size={10} />
                        <span>{isEn ? 'Organizer' : 'المنسق'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Member Button */}
              <button
                type="button"
                onClick={handleAddMember}
                className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>{isEn ? 'Add Member to Group' : 'إضافة عضو جديد للجمعية'}</span>
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>{isEn ? 'Create Jam\'iyya Group' : 'بدء الجمعية واعتماد الأدوار'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
