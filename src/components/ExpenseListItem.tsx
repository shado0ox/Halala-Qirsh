import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';
import { Trash2, Edit3, CreditCard, Banknote, Smartphone, ArrowRightLeft, MoreHorizontal, X } from 'lucide-react';
import { Expense, Category, PaymentMethod, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Amount } from './Amount';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs } from '../utils/motion';
import { translations } from '../utils/i18n';

interface ExpenseListItemProps {
  expense: Expense;
  category?: Category;
  currency: CurrencyCode;
  isRTL: boolean;
  soundEnabled: boolean;
  isReduced: boolean;
  hideAmounts?: boolean;
  isHighlighted?: boolean;
  language?: 'ar' | 'en';
  lang?: 'ar' | 'en';
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onClick: (expense: Expense) => void;
}

export const ExpenseListItem: React.FC<ExpenseListItemProps> = React.memo(({
  expense,
  category,
  currency,
  isRTL,
  soundEnabled,
  isReduced,
  hideAmounts = false,
  isHighlighted = false,
  language = 'ar',
  lang,
  onEdit,
  onDelete,
  onClick,
}) => {
  const effectiveLang = lang || language || 'ar';
  const t = translations[effectiveLang];
  const isEn = effectiveLang === 'en';
  const hasVibratedRef = useRef(false);
  const [isSwipedOpen, setIsSwipedOpen] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Drag boundaries: In RTL swipe to the right (positive), in LTR swipe to the left (negative)
  const dragMin = isRTL ? 0 : -130;
  const dragMax = isRTL ? 130 : 0;
  const triggerThreshold = 65;

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return <CreditCard size={11} className="text-blue-500" />;
      case 'cash':
        return <Banknote size={11} className="text-emerald-500" />;
      case 'digital':
        return <Smartphone size={11} className="text-purple-500" />;
      case 'transfer':
        return <ArrowRightLeft size={11} className="text-amber-500" />;
    }
  };

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    const absX = Math.abs(info.offset.x);
    if (absX >= triggerThreshold && !hasVibratedRef.current) {
      hasVibratedRef.current = true;
      nativeHaptics.tap(soundEnabled);
    } else if (absX < triggerThreshold) {
      hasVibratedRef.current = false;
    }
  };

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const absX = Math.abs(info.offset.x);
    if (absX >= triggerThreshold) {
      setIsSwipedOpen(true);
    } else {
      setIsSwipedOpen(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: isReduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isRTL ? 100 : -100, transition: { duration: 0.16 } }}
      transition={isReduced ? { duration: 0.12 } : springs.smooth}
      className={`relative overflow-hidden select-none group transition-colors duration-700 ${
        isHighlighted
          ? 'bg-emerald-100 dark:bg-emerald-950/70 ring-2 ring-emerald-500/50'
          : 'bg-white dark:bg-[#1C1C1E]'
      }`}
    >
      {/* Background Swipe Actions Drawer */}
      <div
        className={`absolute inset-y-0 ${
          isRTL ? 'left-0' : 'right-0'
        } flex items-center z-0 w-32`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            nativeHaptics.tap(soundEnabled);
            onEdit(expense);
          }}
          className="flex-1 h-full bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
          title={t.edit}
        >
          <Edit3 size={16} />
          <span className="text-[10px] font-bold">{t.edit}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nativeHaptics.warning(soundEnabled);
            onDelete(expense.id);
          }}
          className="flex-1 h-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
          title={t.delete}
        >
          <Trash2 size={16} />
          <span className="text-[10px] font-bold">{t.delete}</span>
        </button>
      </div>

      {/* Foreground Swipeable Item Card (drag is enabled in ALL modes including reduced motion) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: dragMin, right: dragMax }}
        dragElastic={isReduced ? 0 : 0.16}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isSwipedOpen ? (isRTL ? 110 : -110) : 0 }}
        transition={isReduced ? { duration: 0.1 } : springs.smooth}
        onClick={() => {
          if (isSwipedOpen) {
            setIsSwipedOpen(false);
          } else {
            onClick(expense);
          }
        }}
        className="relative z-10 p-3.5 bg-inherit flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-[#2C2C2E]/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <CategoryIcon
            iconName={category?.icon || 'Tag'}
            color={category?.color || '#10B981'}
            bgColor={category?.bgColor}
            size="md"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
              {expense.title}
            </div>
            <div className="text-[11px] text-[#8E8E93] flex items-center gap-1.5 mt-0.5 truncate">
              <span>{isEn && category?.nameEn ? category.nameEn : (category?.name || (isEn ? 'General' : 'عام'))}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                {getPaymentIcon(expense.paymentMethod)}
                <span>{expense.payer}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
            <Amount
              value={expense.amount}
              currency={currency}
              hideAmounts={hideAmounts}
              prefix="-"
              language={language}
            />
          </span>

          {/* Visible "..." More Options button fallback for users who cannot swipe */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nativeHaptics.tap(soundEnabled);
              setShowActionMenu(!showActionMenu);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.moreOptions}
            title={t.moreOptions}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      </motion.div>

      {/* Accessible Action Menu Dropdown / Fallback */}
      {showActionMenu && (
        <div className="relative z-20 px-3 pb-2.5 pt-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowActionMenu(false);
              onEdit(expense);
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Edit3 size={13} />
            <span>{t.edit}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowActionMenu(false);
              onDelete(expense.id);
            }}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>{t.delete}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowActionMenu(false);
            }}
            className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </motion.div>
  );
});

ExpenseListItem.displayName = 'ExpenseListItem';
