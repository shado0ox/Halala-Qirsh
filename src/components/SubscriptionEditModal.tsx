import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Trash2, Calendar, CreditCard, Bell, Sparkles } from 'lucide-react';
import { DetectedSubscription, SubscriptionFrequency, CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';
import { useTranslation } from '../utils/i18n';
import { getFrequencyLabel } from '../utils/subscriptionReminders';
import { formatDateToYmd, calculateNextRenewalDate } from '../utils/subscriptionDetector';

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
    // Auto-update next renewal date if not manually customized
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
      status: 'confirmed',
      detectedAt: subscription?.detectedAt || Date.now(),
      chargeCount: subscription?.chargeCount || 1,
      priceHistory: subscription?.priceHistory || [{ date: today, amount: parsedAmount }],
      reminderDaysBefore: leadDays,
      notes: notes.trim() || undefined,
      categoryId: subscription?.categoryId,
    };

    nativeHaptics.success(soundEnabled);
    onSave(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springs.smooth}
          className="w-full max-w-lg bg-surface dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl border border-border dark:border-dark-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-border/50 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <CreditCard size={18} />
              </div>
              <h3 className="font-bold text-base text-text-primary dark:text-dark-text-primary">
                {subscription ? t.editSubscriptionModalTitle : t.newSubscriptionModalTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-raised dark:bg-dark-surface-raised flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
            {/* Merchant Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1">
                {t.merchantNameLabel}
              </label>
              <input
                type="text"
                required
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder={t.merchantNamePlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>

            {/* Typical Amount */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1">
                {t.typicalAmountLabel} ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-sm tabular-nums"
              />
            </div>

            {/* Frequency Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1.5">
                {t.frequencyLabel}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {FREQUENCIES.map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => handleFrequencyChange(freq)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      frequency === freq
                        ? 'border-primary bg-primary text-white shadow-xs'
                        : 'border-border dark:border-dark-border bg-surface-raised dark:bg-dark-surface-raised text-text-secondary dark:text-dark-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {getFrequencyLabel(freq, language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Renewal Date */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1">
                {t.nextRenewalDateLabel}
              </label>
              <input
                type="date"
                required
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>

            {/* Reminder Lead Days */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1.5 flex items-center gap-1.5">
                <Bell size={13} className="text-amber-500" />
                <span>{t.renewalLeadDaysLabel}</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      nativeHaptics.tap(soundEnabled);
                      setLeadDays(days);
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      leadDays === days
                        ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'border-border dark:border-dark-border bg-surface-raised dark:bg-dark-surface-raised text-text-secondary dark:text-dark-text-secondary'
                    }`}
                  >
                    {days} {t.daysBeforeLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary dark:text-dark-text-secondary mb-1">
                {isEn ? 'Notes (Optional)' : 'ملاحظات إضافية (اختياري)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? 'e.g. Shared with family, cancel before trial ends' : 'مثال: مشترك مع العائلة، تجربة مجانية تنتهي قريباً...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-text-primary dark:text-dark-text-primary font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-border/50 dark:border-dark-border flex items-center justify-between gap-2">
              {subscription && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.warning(soundEnabled);
                    onDelete(subscription.id);
                    onClose();
                  }}
                  className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  <span>{t.deleteSubscriptionBtn}</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Check size={14} />
                  <span>{t.save}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
