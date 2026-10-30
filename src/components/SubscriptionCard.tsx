import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  TrendingUp,
  Check,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { DetectedSubscription, CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { getFrequencyLabel } from '../utils/subscriptionReminders';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs } from '../utils/motion';
import { useTranslation } from '../utils/i18n';
import { getDaysBetweenDates, formatDateToYmd } from '../utils/subscriptionDetector';

interface SubscriptionCardProps {
  subscription: DetectedSubscription;
  currency?: CurrencyCode;
  language?: 'ar' | 'en';
  isEn?: boolean;
  isHidden?: boolean;
  soundEnabled?: boolean;
  onConfirm?: (sub: DetectedSubscription) => void;
  onDismiss?: (sub: DetectedSubscription) => void;
  onEdit?: (sub: DetectedSubscription) => void;
  onDelete?: (subId: string) => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  currency = 'SAR',
  language,
  isEn: isEnProp,
  isHidden = false,
  soundEnabled = true,
  onConfirm,
  onDismiss,
  onEdit,
  onDelete,
}) => {
  const effectiveLang: 'ar' | 'en' = language || (isEnProp ? 'en' : 'ar');
  const isEn = effectiveLang === 'en';
  const { t } = useTranslation(effectiveLang);
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');

  const todayStr = formatDateToYmd(new Date());
  const renewalDate = subscription.nextExpectedRenewalDate;
  const daysDiff = renewalDate ? getDaysBetweenDates(todayStr, renewalDate) : null;
  const isPast = renewalDate ? renewalDate < todayStr : false;
  const isDueToday = renewalDate === todayStr;
  const isDueSoon = daysDiff !== null && daysDiff <= 3 && !isPast;

  const frequencyLabel = getFrequencyLabel(
    subscription.detectedFrequency || subscription.frequency || 'monthly',
    effectiveLang
  );
  const displayName = subscription.merchant || subscription.merchantName || '';

  return (
    <motion.div
      layout
      transition={springs.smooth}
      className={`relative p-4 rounded-2xl border transition-all ${
        subscription.status === 'detected'
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/30 dark:border-amber-500/30'
          : 'bg-white dark:bg-[#1C1C1E] border-slate-200/80 dark:border-slate-800 shadow-2xs'
      }`}
    >
      {/* Top Row: Merchant, Frequency, Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-[#0B2319] dark:text-white truncate">
              {displayName}
            </h3>

            {subscription.status === 'detected' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                <Sparkles size={11} />
                <span>{isEn ? 'Detected' : 'مرصود تلقائياً'}</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                · {frequencyLabel}
              </span>
            )}
          </div>

          {/* Renewal timing indicator */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock size={12} className={isDueSoon ? 'text-amber-500' : 'text-slate-400'} />
            <span className={isDueSoon ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>
              {isDueToday
                ? t.renewsToday
                : daysDiff === 1 && !isPast
                ? t.renewsTomorrow
                : isPast
                ? isEn
                  ? 'Renewal overdue'
                  : 'متأخر عن موعد التجديد'
                : `${t.renewsIn} ${renewalDate} (${daysDiff} ${isEn ? 'days' : 'أيام'})`}
            </span>
          </div>
        </div>

        {/* Typical Amount */}
        <div className="text-right shrink-0">
          <div className="text-base font-extrabold text-[#0B2319] dark:text-white tabular-nums">
            {isHidden ? '••••••' : subscription.typicalAmount.toFixed(2)}{' '}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
              {currencySymbol}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">/{frequencyLabel}</span>
        </div>
      </div>

      {/* Price Increase Alert Banner if detected */}
      {subscription.priceIncrease && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="shrink-0 text-red-600 dark:text-red-400" />
            <span className="font-semibold">
              {isEn
                ? `Price increased from ${subscription.priceIncrease.oldAmount} to ${subscription.priceIncrease.newAmount} ${currencySymbol}`
                : `ارتفع السعر من ${subscription.priceIncrease.oldAmount} إلى ${subscription.priceIncrease.newAmount} ${currencySymbol}`}
            </span>
          </div>
          <span className="font-bold text-[11px] shrink-0 text-red-600 dark:text-red-400">
            +{subscription.priceIncrease.percentage}%
          </span>
        </div>
      )}

      {/* Notes if any */}
      {subscription.notes && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic">
          {subscription.notes}
        </p>
      )}

      {/* Action Buttons Row */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {subscription.status === 'detected' ? (
          <>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.success(soundEnabled);
                  onConfirm?.(subscription);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Check size={13} />
                <span>{t.confirmSubscriptionBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  onDismiss?.(subscription);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <X size={13} />
                <span>{t.dismissSubscriptionBtn}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap(soundEnabled);
                onEdit?.(subscription);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={t.edit}
            >
              <Edit3 size={14} />
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar size={12} />
              <span>
                {t.lastChargeDateLabel}: {subscription.lastChargeDate}
              </span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.tap(soundEnabled);
                  onEdit?.(subscription);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer transition-colors"
                title={t.edit}
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  nativeHaptics.warning(soundEnabled);
                  onDelete?.(subscription.id);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 cursor-pointer transition-colors"
                title={t.delete}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};
