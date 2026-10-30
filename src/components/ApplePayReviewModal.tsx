import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Edit3, CreditCard, Sparkles, AlertCircle } from 'lucide-react';
import { Category, CurrencyCode, Expense } from '../types';
import { CURRENCY_SYMBOLS } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { categorizeMerchant, getLocalToday, saveLearnedRule } from '../utils/smsParser';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades } from '../utils/motion';
import { useTranslation } from '../utils/i18n';
import { ApplePayTransactionPayload } from '../utils/deepLink';

interface ApplePayReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ApplePayTransactionPayload | null;
  categories: Category[];
  currency: CurrencyCode;
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onEditInFullSheet: (prefill: {
    amount: number;
    merchant: string;
    categoryId: string;
    notes: string;
    paymentMethod: 'digital';
    source: 'apple_pay';
  }) => void;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const ApplePayReviewModal: React.FC<ApplePayReviewModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories,
  currency,
  onSaveExpense,
  onEditInFullSheet,
  soundEnabled = true,
  language = 'ar',
}) => {
  const { t } = useTranslation(language);
  const isEn = language === 'en';
  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? 'SAR' : 'ر.س');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isLearned, setIsLearned] = useState<boolean>(false);

  useEffect(() => {
    if (!transaction) return;

    if (transaction.category) {
      const match = categories.find(
        (c) =>
          c.id === transaction.category ||
          c.name.trim().toLowerCase() === transaction.category?.trim().toLowerCase()
      );
      if (match) {
        setSelectedCategoryId(match.id);
        setIsLearned(false);
        return;
      }
    }

    const { categoryId, isLearned: learned } = categorizeMerchant(
      transaction.merchant || '',
      categories
    );
    setSelectedCategoryId(categoryId || categories[0]?.id || 'cat-other');
    setIsLearned(learned);
  }, [transaction, categories]);

  if (!transaction) return null;

  const currentCat = categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const safeAmount = transaction.amount ?? 0;
  const safeMerchant = transaction.merchant || (isEn ? 'Apple Pay' : 'عملية Apple Pay');

  const handleConfirmSave = () => {
    nativeHaptics.success(soundEnabled);
    if (transaction.merchant && selectedCategoryId) {
      saveLearnedRule(transaction.merchant, selectedCategoryId);
    }

    const today = getLocalToday();
    const newExpense: Omit<Expense, 'id' | 'createdAt'> = {
      title: safeMerchant,
      amount: safeAmount,
      categoryId: selectedCategoryId,
      date: today,
      payer: 'الزوج',
      paymentMethod: 'digital',
      notes: transaction.note ? `${safeMerchant} - ${transaction.note}` : safeMerchant,
      source: 'apple_pay',
      isAutoLogged: true,
    };

    onSaveExpense(newExpense);
    onClose();
  };

  const handleFullEdit = () => {
    nativeHaptics.tap(soundEnabled);
    onEditInFullSheet({
      amount: safeAmount,
      merchant: safeMerchant,
      categoryId: selectedCategoryId,
      notes: transaction.note || safeMerchant,
      paymentMethod: 'digital',
      source: 'apple_pay',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.smooth}
            className="w-full max-w-md bg-surface dark:bg-dark-surface rounded-t-3xl sm:rounded-3xl border border-border dark:border-dark-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50 dark:border-dark-border flex items-center justify-between bg-gradient-to-b from-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-base shadow-md">
                  Pay
                </div>
                <div>
                  <h3 className="font-bold text-text-primary dark:text-dark-text-primary text-lg">
                    {t.applePayIncomingTitle}
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                    {t.applePayIncomingDesc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-raised dark:bg-dark-surface-raised flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Amount Display */}
              <div className="text-center py-4 bg-surface-raised dark:bg-dark-surface-raised rounded-2xl border border-border/50 dark:border-dark-border">
                <span className="text-xs uppercase tracking-wider text-text-secondary dark:text-dark-text-secondary font-medium">
                  {isEn ? 'Transaction Amount' : 'قيمة العملية المستلمة'}
                </span>
                <div className="text-3xl font-extrabold text-text-primary dark:text-dark-text-primary mt-1">
                  {safeAmount.toFixed(2)}{' '}
                  <span className="text-sm font-normal text-text-secondary dark:text-dark-text-secondary">
                    {currencySymbol}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{safeMerchant}</span>
                  {transaction.card && <span className="opacity-75">({transaction.card})</span>}
                </div>
              </div>

              {/* Category Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary dark:text-dark-text-secondary font-medium">
                    {t.categoryLabel}
                  </span>
                  {isLearned && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                      <Sparkles className="w-3 h-3" />
                      {isEn ? 'Learned Category' : 'تصنيف متعلم تلقائياً'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                  {categories.map((cat) => {
                    const isSelected = cat.id === selectedCategoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          nativeHaptics.tap(soundEnabled);
                          setSelectedCategoryId(cat.id);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                            : 'border-border/60 dark:border-dark-border bg-surface-raised dark:bg-dark-surface-raised text-text-primary dark:text-dark-text-primary hover:border-primary/50'
                        }`}
                      >
                        <CategoryIcon iconName={cat.icon} color={cat.color} size="sm" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes if any */}
              {transaction.note && (
                <div className="text-xs text-text-secondary dark:text-dark-text-secondary bg-surface-raised dark:bg-dark-surface-raised p-2.5 rounded-xl border border-border/50">
                  <span className="font-semibold">{t.notesLabel}: </span>
                  {transaction.note}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border/50 dark:border-dark-border bg-surface-raised/40 dark:bg-dark-surface-raised/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmSave}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-4 h-4" />
                {t.applePayConfirmSaveBtn}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFullEdit}
                  className="flex-1 py-2.5 px-3 border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary font-medium rounded-xl hover:bg-surface-raised dark:hover:bg-dark-surface-raised text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {t.applePayEditDetailsBtn}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
