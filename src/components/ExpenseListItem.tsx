import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Trash2, Edit3, CreditCard, Banknote, Smartphone, ArrowRightLeft } from 'lucide-react';
import { Expense, Category, PaymentMethod, CurrencyCode } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatMoney } from '../utils/storage';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs } from '../utils/motion';

interface ExpenseListItemProps {
  expense: Expense;
  category?: Category;
  currency: CurrencyCode;
  isRTL: boolean;
  soundEnabled: boolean;
  isReduced: boolean;
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
  onEdit,
  onDelete,
  onClick,
}) => {
  const x = useMotionValue(0);
  const hasVibratedRef = useRef(false);
  const [isSwipedOpen, setIsSwipedOpen] = useState(false);

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isRTL ? 100 : -100, transition: { duration: 0.18 } }}
      transition={springs.smooth}
      className="relative overflow-hidden bg-white dark:bg-[#1C1C1E] select-none group"
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
          title="تعديل المصروف"
        >
          <Edit3 size={16} />
          <span className="text-[10px] font-bold">تعديل</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nativeHaptics.impactLight(soundEnabled);
            onDelete(expense.id);
          }}
          className="flex-1 h-full bg-red-600 hover:bg-red-700 text-white flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
          title="حذف المصروف"
        >
          <Trash2 size={16} />
          <span className="text-[10px] font-bold">حذف</span>
        </button>
      </div>

      {/* Foreground Swipeable Item Card */}
      <motion.div
        drag={isReduced ? false : 'x'}
        dragConstraints={{ left: dragMin, right: dragMax }}
        dragElastic={0.16}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: isSwipedOpen ? (isRTL ? 110 : -110) : 0 }}
        transition={springs.smooth}
        onClick={() => {
          if (isSwipedOpen) {
            setIsSwipedOpen(false);
          } else {
            onClick(expense);
          }
        }}
        className="relative z-10 p-3.5 bg-white dark:bg-[#1C1C1E] flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-[#2C2C2E]/60 transition-colors"
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
              <span>{category?.name || 'عام'}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                {getPaymentIcon(expense.paymentMethod)}
                <span>{expense.payer}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
            -{formatMoney(expense.amount, currency)}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
});

ExpenseListItem.displayName = 'ExpenseListItem';
