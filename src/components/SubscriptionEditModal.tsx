import React, { useState, useEffect } from 'react';
import { Trash2, CreditCard, Bell } from 'lucide-react';
import { DetectedSubscription, SubscriptionFrequency, CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { useTranslation } from '../utils/i18n';
import { getFrequencyLabel } from '../utils/subscriptionReminders';
import { formatDateToYmd, calculateNextRenewalDate } from '../utils/subscriptionDetector';
import {
  FormModalWrapper,
  FormField,
  TextInput,
  AmountInput,
  FormButton,
  FormFooter,
} from './ui/FormComponents';

interface SubscriptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: DetectedSubscription | null;
  currency?: CurrencyCode;
  language?: 'ar' | 'en';
  isEn?: boolean;
  soundEnabled?: boolean;
  onSave: (sub: DetectedSubscription) => void;
  onDelete?: (id: string) => void;
}

const FREQUENCIES: SubscriptionFrequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const SubscriptionEditModal: React.FC<SubscriptionEditModalProps> = ({
  isOpen,
  onClose,
  subscription,
  currency = 'SAR',
  language,
  isEn: isEnProp,
  soundEnabled = true,
  onSave,
  onDelete,
}) => {
  const effectiveLang: 'ar' | 'en' = language || (isEnProp ? 'en' : 'ar');
  const isEn = effectiveLang === 'en';
  const { t } = useTranslation(effectiveLang);
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');

  const [merchant, setMerchant] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState<string>('');
  const [leadDays, setLeadDays] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (subscription) {
      setMerchant(subscription.merchant);
      setAmountStr(String(subscription.typicalAmount || ''));
      setFrequency(subscription.detectedFrequency || 'monthly');
      setNextRenewalDate(
        subscription.nextExpectedRenewalDate ||
          calculateNextRenewalDate(formatDateToYmd(new Date()), subscription.detectedFrequency)
      );
      setLeadDays(subscription.reminderDaysBefore ?? 3);
      setNotes(subscription.notes || '');
    } else {
      setMerchant('');
      setAmountStr('');
      setFrequency('monthly');
      setNextRenewalDate(calculateNextRenewalDate(formatDateToYmd(new Date()), 'monthly'));
      setLeadDays(3);
      setNotes('');
    }
  }, [subscription, isOpen]);

  if (!isOpen) return null;

  const handleFrequencyChange = (newFreq: SubscriptionFrequency) => {
    nativeHaptics.tap(soundEnabled);
    setFrequency(newFreq);
    const baseDate = subscription?.lastChargeDate || formatDateToYmd(new Date());
    setNextRenewalDate(calculateNextRenewalDate(baseDate, newFreq));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant.trim()) return;

    const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);
    const today = formatDateToYmd(new Date());

    const updated: DetectedSubscription = {
      id: subscription?.id || `sub-manual-${Date.now()}`,
      merchant: merchant.trim(),
      normalizedMerchant: subscription?.normalizedMerchant || merchant.trim().toLowerCase(),
      typicalAmount: parsedAmount,
      detectedFrequency: frequency,
      lastChargeDate: subscription?.lastChargeDate || today,
      nextExpectedRenewalDate: nextRenewalDate || calculateNextRenewalDate(today, frequency),
      reminderDaysBefore: leadDays,
      status: 'confirmed',
      notes: notes.trim() || undefined,
      isUserEdited: true,
    };

    nativeHaptics.success(soundEnabled);
    onSave(updated);
    onClose();
  };

  return (
    <FormModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={subscription ? t.editSubscriptionModalTitle : t.newSubscriptionModalTitle}
      icon={<CreditCard size={18} />}
      soundEnabled={soundEnabled}
      isEnglish={isEn}
    >
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Merchant Name */}
        <FormField label={t.merchantNameLabel} required>
          <TextInput
            type="text"
            required
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder={t.merchantNamePlaceholder}
          />
        </FormField>

        {/* Typical Amount */}
        <FormField label={t.typicalAmountLabel} required>
          <AmountInput
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            currencySymbol={currencySymbol}
          />
        </FormField>

        {/* Frequency Selector */}
        <FormField label={t.frequencyLabel}>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq}
                type="button"
                onClick={() => handleFrequencyChange(freq)}
                className={`min-h-[44px] py-2 px-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                  frequency === freq
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-transparent bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {getFrequencyLabel(freq, language)}
              </button>
            ))}
          </div>
        </FormField>

        {/* Next Renewal Date */}
        <FormField label={t.nextRenewalDateLabel} required>
          <TextInput
            type="date"
            required
            value={nextRenewalDate}
            onChange={(e) => setNextRenewalDate(e.target.value)}
          />
        </FormField>

        {/* Reminder Lead Days */}
        <FormField
          label={t.renewalLeadDaysLabel}
          badge={<Bell size={13} className="text-amber-500" />}
        >
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 7].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  setLeadDays(days);
                }}
                className={`min-h-[44px] py-2 px-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                  leadDays === days
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                    : 'border-transparent bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {days} {isEn ? 'days' : 'أيام'}
              </button>
            ))}
          </div>
        </FormField>

        {/* Notes */}
        <FormField label={isEn ? 'Notes (Optional)' : 'ملاحظات إضافية (اختياري)'}>
          <TextInput
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isEn
                ? 'e.g. Shared with family, cancel before trial ends'
                : 'مثال: مشترك مع العائلة، تجربة مجانية تنتهي قريباً...'
            }
          />
        </FormField>

        {/* Actions Footer */}
        <FormFooter className="justify-between">
          {subscription && onDelete ? (
            <FormButton
              type="button"
              variant="destructive"
              onClick={() => {
                nativeHaptics.warning(soundEnabled);
                onDelete(subscription.id);
                onClose();
              }}
              startIcon={<Trash2 size={16} />}
              className="w-full sm:w-auto"
            >
              {t.deleteSubscriptionBtn}
            </FormButton>
          ) : (
            <div className="hidden sm:block" />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <FormButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              {t.cancel}
            </FormButton>
            <FormButton
              type="submit"
              variant="primary"
              className="flex-1 sm:flex-initial"
            >
              {t.save}
            </FormButton>
          </div>
        </FormFooter>
      </form>
    </FormModalWrapper>
  );
};
