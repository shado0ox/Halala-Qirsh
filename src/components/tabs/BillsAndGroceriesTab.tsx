import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  ShoppingBag,
  ListPlus,
  Receipt,
  X,
  Check,
  Bell,
  BellOff,
  BellRing,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RecurringBill, GroceryItem, Category, BudgetSettings } from '../../types';
import { SegmentedControl } from '../SegmentedControl';
import { CategoryIcon } from '../CategoryIcon';
import { Amount } from '../Amount';
import { formatMoney } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { NotificationPermissionState } from '../../utils/notifications';
import { AnimatedCounter } from '../AnimatedCounter';
import { springs, fades, useMotionConfig } from '../../utils/motion';

interface BillsAndGroceriesTabProps {
  bills: RecurringBill[];
  groceries: GroceryItem[];
  categories: Category[];
  settings: BudgetSettings;
  onToggleBill: (billId: string) => void;
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onDeleteBill: (billId: string) => void;
  onToggleBillReminder: (billId: string) => void;
  onToggleGrocery: (itemId: string) => void;
  onAddGrocery: (item: Omit<GroceryItem, 'id'>) => void;
  onDeleteGrocery: (itemId: string) => void;
  onConvertBoughtToExpense: (items: GroceryItem[]) => void;
  onRequestNotificationPermission: () => Promise<void>;
  onSendTestNotification: () => void;
  notificationPermission: NotificationPermissionState;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
}

export const BillsAndGroceriesTab: React.FC<BillsAndGroceriesTabProps> = ({
  bills,
  groceries,
  categories,
  settings,
  onToggleBill,
  onAddBill,
  onDeleteBill,
  onToggleBillReminder,
  onToggleGrocery,
  onAddGrocery,
  onDeleteGrocery,
  onConvertBoughtToExpense,
  onRequestNotificationPermission,
  onSendTestNotification,
  notificationPermission,
  onUpdateSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'groceries'>('bills');
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isEn = settings.language === 'en';
  const lang = settings.language || 'ar';
  const isHidden = Boolean(settings.hideAmounts);

  // Add Bill Modal
  const [showAddBillModal, setShowAddBillModal] = useState<boolean>(false);
  const [billTitle, setBillTitle] = useState<string>('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [billDueDay, setBillDueDay] = useState<number>(1);
  const [billCategoryId, setBillCategoryId] = useState<string>(categories[1]?.id || categories[0]?.id || '');
  const [billNotes, setBillNotes] = useState<string>('');
  const [billReminderEnabled, setBillReminderEnabled] = useState<boolean>(true);

  // Add Grocery Modal
  const [showAddGroceryModal, setShowAddGroceryModal] = useState<boolean>(false);
  const [grocName, setGrocName] = useState<string>('');
  const [grocCategory, setGrocCategory] = useState<string>('خضار وفواكه');
  const [grocEstimatedPrice, setGrocEstimatedPrice] = useState<string>('');
  const [grocQuantity, setGrocQuantity] = useState<number>(1);
  const [grocUnit, setGrocUnit] = useState<string>('حبة');

  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Today's day of month
  const todayDay = new Date().getDate();

  // Bills calculations
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidBillsAmount = bills.filter((b) => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
  const unpaidBillsAmount = totalBillsAmount - paidBillsAmount;
  const unpaidCount = bills.filter((b) => !b.isPaid).length;

  // Groceries calculations
  const boughtItems = groceries.filter((g) => g.isBought);
  const unboughtItems = groceries.filter((g) => !g.isBought);
  const totalBoughtEst = boughtItems.reduce((sum, g) => sum + g.estimatedPrice * g.quantity, 0);

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(billAmount);
    if (!billTitle.trim() || isNaN(amount) || amount <= 0) return;

    nativeHaptics.success(settings.soundEnabled);
    onAddBill({
      title: billTitle.trim(),
      amount,
      categoryId: billCategoryId,
      dueDay: billDueDay,
      isPaid: false,
      notes: billNotes.trim() || undefined,
      reminderEnabled: billReminderEnabled,
    });

    setBillTitle('');
    setBillAmount('');
    setBillDueDay(1);
    setBillNotes('');
    setShowAddBillModal(false);
  };

  const handleSaveGrocery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grocName.trim()) return;
    const estPrice = parseFloat(grocEstimatedPrice) || 0;

    nativeHaptics.success(settings.soundEnabled);
    onAddGrocery({
      name: grocName.trim(),
      category: grocCategory,
      estimatedPrice: estPrice,
      isBought: false,
      quantity: grocQuantity > 0 ? grocQuantity : 1,
      unit: grocUnit,
    });

    setGrocName('');
    setGrocEstimatedPrice('');
    setGrocQuantity(1);
    setShowAddGroceryModal(false);
  };

  const handleConvertBought = () => {
    if (boughtItems.length === 0) return;
    nativeHaptics.success(settings.soundEnabled);
    onConvertBoughtToExpense(boughtItems);
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#1C1C1E] dark:text-white tracking-tight">
              {isEn ? 'Bills & Groceries' : 'الفواتير ونواقص البيت'}
            </h1>
            <span className="text-xs text-[#8E8E93] font-medium">
              {activeSubTab === 'bills'
                ? isEn
                  ? `${unpaidCount} unpaid household bills`
                  : `${unpaidCount} فواتير متبقية للسداد`
                : isEn
                ? `${unboughtItems.length} items needed`
                : `${unboughtItems.length} أغراض وطلبات مطلوبة`}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              nativeHaptics.tap(settings.soundEnabled);
              if (activeSubTab === 'bills') {
                setShowAddBillModal(true);
              } else {
                setShowAddGroceryModal(true);
              }
            }}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>{activeSubTab === 'bills' ? (isEn ? 'New Bill' : 'إضافة فاتورة') : (isEn ? 'Add Item' : 'إضافة سلعة')}</span>
          </motion.button>
        </div>

        {/* Sub-Tab Selector */}
        <SegmentedControl
          options={[
            { id: 'bills', label: isEn ? 'Recurring Bills' : 'فواتير دورية' },
            { id: 'groceries', label: isEn ? 'Grocery List' : 'قائمة النواقص' },
          ]}
          value={activeSubTab}
          onChange={(val) => {
            nativeHaptics.tap(settings.soundEnabled);
            setActiveSubTab(val as any);
          }}
          isReduced={isReduced}
        />
      </div>

      {/* SUB-TAB 1: RECURRING BILLS */}
      {activeSubTab === 'bills' && (
        <div className="space-y-3.5 pb-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Unpaid Balance' : 'متبقي للسداد'}
              </span>
              <Amount
                value={unpaidBillsAmount}
                currency={settings.currency}
                lang={lang}
                hideAmounts={isHidden}
                className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5"
              />
              <span className="text-[10px] text-[#8E8E93]">
                {unpaidCount} {isEn ? 'bills' : 'فواتير'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Paid This Month' : 'تم سداده'}
              </span>
              <Amount
                value={paidBillsAmount}
                currency={settings.currency}
                lang={lang}
                hideAmounts={isHidden}
                className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5"
              />
              <span className="text-[10px] text-[#8E8E93]">
                {bills.length - unpaidCount} {isEn ? 'bills' : 'فواتير'}
              </span>
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#8E8E93] px-1">
              {isEn ? `Monthly Bills (${bills.length})` : `فواتير الشهر (${bills.length})`}
            </span>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              <AnimatePresence initial={false}>
                {bills.map((bill) => {
                  const cat = catMap.get(bill.categoryId);
                  const isDueSoon = !bill.isPaid && Math.abs(bill.dueDay - todayDay) <= 4;

                  return (
                    <motion.div
                      layout
                      key={bill.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -60 }}
                      transition={springs.smooth}
                      className={`p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        bill.isPaid ? 'opacity-65' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            nativeHaptics.tap(settings.soundEnabled);
                            onToggleBill(bill.id);
                          }}
                          className="cursor-pointer"
                        >
                          {bill.isPaid ? (
                            <CheckCircle2 size={24} className="text-emerald-600 fill-emerald-100 dark:fill-emerald-950" />
                          ) : (
                            <Circle size={24} className="text-slate-300 hover:text-emerald-600" />
                          )}
                        </motion.button>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold ${
                                bill.isPaid
                                  ? 'line-through text-[#8E8E93]'
                                  : 'text-[#1C1C1E] dark:text-white'
                              }`}
                            >
                              {bill.title}
                            </span>
                            {isDueSoon && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold">
                                {isEn ? 'Due Soon' : 'قريباً'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8E8E93] flex items-center gap-1.5">
                            <span>{isEn ? (cat?.nameEn || cat?.name || 'Bill') : (cat?.name || 'فاتورة')}</span>
                            <span>·</span>
                            <span>{isEn ? `Due day ${bill.dueDay}` : `يوم ${bill.dueDay} شهرياً`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Amount
                          value={bill.amount}
                          currency={settings.currency}
                          lang={lang}
                          hideAmounts={isHidden}
                          className="text-xs font-extrabold text-[#1C1C1E] dark:text-white tabular-nums"
                        />

                        {/* Reminder Bell Toggle */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            nativeHaptics.tap(settings.soundEnabled);
                            onToggleBillReminder(bill.id);
                          }}
                          className={`p-1.5 rounded-xl cursor-pointer ${
                            bill.reminderEnabled !== false
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
                              : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                          }`}
                          title={isEn ? 'Toggle Local Reminder' : 'تفعيل أو إيقاف التنبيه'}
                        >
                          {bill.reminderEnabled !== false ? <BellRing size={13} /> : <BellOff size={13} />}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            nativeHaptics.impactLight(settings.soundEnabled);
                            onDeleteBill(bill.id);
                          }}
                          className="p-1.5 rounded-xl text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {bills.length === 0 && (
                <div className="p-7 text-center space-y-2">
                  <motion.div
                    animate={isReduced ? {} : { y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center"
                  >
                    <Receipt size={22} />
                  </motion.div>
                  <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                    {isEn ? 'No recurring bills added' : 'لا توجد فواتير دورية مسجلة'}
                  </div>
                  <p className="text-[11px] text-[#8E8E93] max-w-xs mx-auto">
                    {isEn ? 'Add monthly rent, electricity, phone, or internet bills.' : 'أضف فواتير الكهرباء، الإيجار، الجوال، أو الإنترنت لتصلك تذكيرات دورية.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GROCERIES LIST */}
      {activeSubTab === 'groceries' && (
        <div className="space-y-3.5 pb-6">
          {/* Action to convert bought items to an actual expense */}
          {boughtItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 block">
                  {boughtItems.length} {isEn ? 'purchased items' : 'أصناف تم شراؤها'}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  {isEn ? 'Est. Total: ' : 'الإجمالي التقديري: '}
                  <Amount
                    value={totalBoughtEst}
                    currency={settings.currency}
                    lang={lang}
                    hideAmounts={isHidden}
                  />
                </span>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleConvertBought}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>{isEn ? 'Record as Expense' : 'ترحيل كمصروف'}</span>
              </motion.button>
            </motion.div>
          )}

          {/* Unbought Groceries */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#8E8E93] px-1 flex items-center justify-between">
              <span>{isEn ? `Items to buy (${unboughtItems.length})` : `أصناف مطلوب شراؤها (${unboughtItems.length})`}</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {isEn ? 'Check circle when bought' : 'حدد المربع عند الشراء'}
              </span>
            </span>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              <AnimatePresence initial={false}>
                {unboughtItems.map((item) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={springs.smooth}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          nativeHaptics.tap(settings.soundEnabled);
                          onToggleGrocery(item.id);
                        }}
                        className="cursor-pointer text-slate-300 hover:text-emerald-600 shrink-0"
                      >
                        <Circle size={22} />
                      </motion.button>

                      <div>
                        <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[#8E8E93] flex items-center gap-1">
                          <span>{item.category}</span>
                          <span>·</span>
                          <span>
                            {isEn ? `Qty: ${item.quantity} ${item.unit}` : `الكمية: ${item.quantity} ${item.unit}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.estimatedPrice > 0 && (
                        <Amount
                          value={item.estimatedPrice * item.quantity}
                          currency={settings.currency}
                          lang={lang}
                          hideAmounts={isHidden}
                          prefix="~"
                          className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums"
                        />
                      )}

                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          nativeHaptics.impactLight(settings.soundEnabled);
                          onDeleteGrocery(item.id);
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {unboughtItems.length === 0 && (
                <div className="p-7 text-center space-y-2">
                  <motion.div
                    animate={isReduced ? {} : { y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center"
                  >
                    <ShoppingBag size={22} />
                  </motion.div>
                  <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                    {isEn ? 'All household items are stocked!' : 'تم شراء جميع نواقص البيت!'}
                  </div>
                  <p className="text-[11px] text-[#8E8E93] max-w-xs mx-auto">
                    {isEn ? 'Tap + to add items needed for the home.' : 'اضغط على + لإضافة أي طلبات أو مشتريات ناقصة.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bought Items Group */}
          {boughtItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#8E8E93] px-1">
                {isEn ? `Purchased Items (${boughtItems.length})` : `أصناف تم شراؤها (${boughtItems.length})`}
              </span>

              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden opacity-75 shadow-2xs">
                <AnimatePresence initial={false}>
                  {boughtItems.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            nativeHaptics.tap(settings.soundEnabled);
                            onToggleGrocery(item.id);
                          }}
                          className="cursor-pointer text-emerald-500 shrink-0"
                        >
                          <CheckCircle2 size={22} className="fill-emerald-100 dark:fill-emerald-950" />
                        </button>

                        <div>
                          <div className="text-xs font-bold text-[#8E8E93] line-through relative">
                            {item.name}
                          </div>
                          <span className="text-[10px] text-[#8E8E93]">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          nativeHaptics.impactLight(settings.soundEnabled);
                          onDeleteGrocery(item.id);
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Bill Modal (Zero backdrop-blur to preserve 60fps) */}
      <AnimatePresence>
        {showAddBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBillModal(false)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={springs.smooth}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Add Recurring Bill' : 'إضافة فاتورة دورية جديدة'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveBill} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                    {isEn ? 'Bill Title' : 'اسم أو بيان الفاتورة'}
                  </label>
                  <input
                    type="text"
                    required
                    value={billTitle}
                    onChange={(e) => setBillTitle(e.target.value)}
                    placeholder={isEn ? 'e.g. Electricity, Rent, Fiber' : 'مثال: فاتورة الكهرباء، إيجار البيت، إنترنت ألياف'}
                    className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      {isEn ? 'Amount' : 'المبلغ التقديري'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      {isEn ? 'Due Day (1-31)' : 'يوم الاستحقاق'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={billDueDay}
                      onChange={(e) => setBillDueDay(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                    {isEn ? 'Category' : 'التصنيف التابع له'}
                  </label>
                  <select
                    value={billCategoryId}
                    onChange={(e) => setBillCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isEn ? (c.nameEn || c.name) : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isEn ? 'Send Notification Reminder' : 'إرسال تنبيه قبل الموعد'}
                  </span>
                  <input
                    type="checkbox"
                    checked={billReminderEnabled}
                    onChange={(e) => setBillReminderEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {isEn ? 'Save Bill' : 'حفظ الفاتورة'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Grocery Modal (Zero backdrop-blur to preserve 60fps) */}
      <AnimatePresence>
        {showAddGroceryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGroceryModal(false)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={springs.smooth}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Add Grocery Item' : 'إضافة سلعة لقائمة البيت'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddGroceryModal(false)}
                  className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveGrocery} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                    {isEn ? 'Item Name' : 'اسم السلعة المطلوبة'}
                  </label>
                  <input
                    type="text"
                    required
                    value={grocName}
                    onChange={(e) => setGrocName(e.target.value)}
                    placeholder={isEn ? 'e.g. Milk, Apples, Bread' : 'مثال: حليب، بيض، أرز بسمتي، منظفات'}
                    className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-semibold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      {isEn ? 'Quantity' : 'الكمية'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={grocQuantity}
                      onChange={(e) => setGrocQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      {isEn ? 'Unit' : 'الوحدة'}
                    </label>
                    <input
                      type="text"
                      value={grocUnit}
                      onChange={(e) => setGrocUnit(e.target.value)}
                      placeholder={isEn ? 'pcs / kg' : 'حبة / كجم / كرتون'}
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                    {isEn ? 'Est. Price (Optional)' : 'السعر التقريبي للقطعة (اختياري)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={grocEstimatedPrice}
                    onChange={(e) => setGrocEstimatedPrice(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  {isEn ? 'Add to List' : 'إضافة للقائمة'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
