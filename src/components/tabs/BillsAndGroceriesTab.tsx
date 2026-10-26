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
                ? isEn ? `${unpaidCount} unpaid bills this month` : `${unpaidCount} فواتير متبقية للاستحقاق`
                : isEn ? `${unboughtItems.length} items needed` : `${unboughtItems.length} أصناف مطلوبة للقائمة`}
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
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            {activeSubTab === 'bills'
              ? (isEn ? '+ Recurring Bill' : '+ فاتورة دورية')
              : (isEn ? '+ Grocery Item' : '+ سلعة للقائمة')}
          </motion.button>
        </div>

        {/* Segmented Control */}
        <SegmentedControl
          value={activeSubTab}
          onChange={setActiveSubTab}
          soundEnabled={settings.soundEnabled}
          options={[
            { value: 'bills', label: isEn ? 'Monthly Bills' : 'الفواتير والأقساط الشهرية', badge: unpaidCount },
            { value: 'groceries', label: isEn ? 'Household Groceries' : 'قائمة مشتريات ونواقص البيت', badge: unboughtItems.length },
          ]}
        />
      </div>

      {/* ===================== TAB 1: BILLS ===================== */}
      {activeSubTab === 'bills' && (
        <div className="space-y-3.5 pb-6">
          {/* Bills Summary Box */}
          <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8E8E93]">
                {isEn ? 'Monthly Bills Status' : 'حالة فواتير هذا الشهر'}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {bills.filter((b) => b.isPaid).length} {isEn ? 'of' : 'من'} {bills.length} {isEn ? 'paid' : 'مسددة'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block">
                  {isEn ? 'Paid' : 'تم سداده'}
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatMoney(paidBillsAmount, settings.currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold block">
                  {isEn ? 'Remaining Due' : 'المتبقي مستحق السداد'}
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatMoney(unpaidBillsAmount, settings.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Local Bill Reminders Card */}
          <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <BellRing size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                    {isEn ? 'Local Apple Notifications' : 'تنبيهات الفواتير المحلية (Apple)'}
                  </span>
                  <span className="text-[10px] text-[#8E8E93]">
                    {isEn ? 'Automatic reminder before bill due date' : 'تذكير محلي قبل موعد الاستحقاق'}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : notificationPermission === 'denied'
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {notificationPermission === 'granted'
                  ? (isEn ? 'Active ✓' : 'مفعلة ✓')
                  : notificationPermission === 'denied'
                  ? (isEn ? 'Denied' : 'محظورة')
                  : (isEn ? 'Action needed' : 'تحتاج إذن')}
              </span>
            </div>

            {/* Reminder Lead Days Selector */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                {isEn ? 'Remind me:' : 'موعد التنبيه:'}
              </span>
              <div className="flex items-center gap-1 font-semibold text-[11px]">
                {[
                  { days: 0, label: isEn ? 'On Due Day' : 'في نفس اليوم' },
                  { days: 1, label: isEn ? '1 Day Before' : 'قبل يوم' },
                  { days: 3, label: isEn ? '3 Days Before' : 'قبل 3 أيام' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => {
                      nativeHaptics.tap(settings.soundEnabled);
                      onUpdateSettings({ notificationLeadDays: opt.days });
                    }}
                    className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                      settings.notificationLeadDays === opt.days
                        ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Bell size={14} />
                  <span>{isEn ? 'Enable Local Reminders' : 'تفعيل إشعارات الجهاز الآن'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSendTestNotification}
                  className="flex-1 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200/60 dark:border-emerald-900/50 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{isEn ? 'Send Test Reminder' : 'إرسال إشعار تجريبي لاختبار التنبيه'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bills List with Path Animation & Urgency Glow */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#8E8E93] px-1">
              {isEn ? 'Monthly Bills Schedule' : 'جدول الفواتير المستحقة شهرياً'}
            </span>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              <AnimatePresence initial={false}>
                {bills.map((bill) => {
                  const cat = catMap.get(bill.categoryId);
                  const isReminderOn = bill.reminderEnabled !== false;
                  const isUrgent = !bill.isPaid && Math.abs(bill.dueDay - todayDay) <= (settings.notificationLeadDays || 1);

                  return (
                    <motion.div
                      layout
                      key={bill.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={springs.smooth}
                      className={`p-3.5 flex items-center justify-between transition-colors relative ${
                        bill.isPaid
                          ? 'bg-slate-50/50 dark:bg-slate-900/25 opacity-70'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Urgency glow if due soon */}
                      {isUrgent && (
                        <motion.div
                          animate={{ opacity: [0.3, 0.8, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute inset-y-0 right-0 w-1 bg-amber-500 rounded-r-md pointer-events-none"
                        />
                      )}

                      <div className="flex items-center gap-3">
                        {/* Animated Checkmark Path Checkbox */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            nativeHaptics.success(settings.soundEnabled);
                            onToggleBill(bill.id);
                          }}
                          className="cursor-pointer text-emerald-600 dark:text-emerald-400 shrink-0"
                          title={bill.isPaid ? 'تحديد كغير مسددة' : 'تحديد كمسددة'}
                        >
                          {bill.isPaid ? (
                            <svg className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" fill="#10B981" />
                              <motion.path
                                d="M8 12.5l2.5 2.5 5.5-5.5"
                                stroke="#FFFFFF"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={springs.bouncy}
                              />
                            </svg>
                          ) : (
                            <Circle size={24} className="text-slate-300 dark:text-slate-600 hover:text-emerald-500" />
                          )}
                        </motion.button>

                        <CategoryIcon
                          iconName={cat?.icon || 'Zap'}
                          color={cat?.color || '#F59E0B'}
                          bgColor={cat?.bgColor}
                          size="md"
                        />

                        <div>
                          <div
                            className={`text-xs font-bold ${
                              bill.isPaid
                                ? 'line-through text-[#8E8E93]'
                                : 'text-[#1C1C1E] dark:text-white'
                            }`}
                          >
                            {bill.title}
                          </div>
                          <div className="text-[11px] text-[#8E8E93] flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <Calendar size={11} />
                              <span>{isEn ? `Day ${bill.dueDay} of month` : `يوم ${bill.dueDay} من الشهر`}</span>
                            </span>
                            <span>·</span>
                            <span>{isEn ? (cat?.nameEn || cat?.name || 'Bills') : (cat?.name || 'فواتير')}</span>
                            {bill.notes && <span>· {bill.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#1C1C1E] dark:text-white tabular-nums">
                          {formatMoney(bill.amount, settings.currency)}
                        </span>

                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => {
                            nativeHaptics.tap(settings.soundEnabled);
                            onToggleBillReminder(bill.id);
                          }}
                          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                            isReminderOn
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                          }`}
                          title={isReminderOn ? 'Reminder enabled' : 'Reminder disabled'}
                        >
                          {isReminderOn ? <Bell size={14} /> : <BellOff size={14} />}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            nativeHaptics.impactLight(settings.soundEnabled);
                            onDeleteBill(bill.id);
                          }}
                          className="p-1 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {bills.length === 0 && (
                <div className="p-8 text-center text-xs text-[#8E8E93]">
                  {isEn
                    ? 'No bills added yet. Tap "+ Recurring Bill" to add rent, utilities, or subscriptions.'
                    : 'لا توجد فواتير مضافة بعد. اضغط على "+ فاتورة دورية" لإضافة كهرباء، إيجار، أو إنترنت.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GROCERIES ===================== */}
      {activeSubTab === 'groceries' && (
        <div className="space-y-3.5 pb-6">
          {/* Action Banner to Convert to Expense */}
          {boughtItems.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                  {isEn ? `${boughtItems.length} items purchased!` : `تم شراء ${boughtItems.length} أصناف بنجاح!`}
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  {isEn ? 'Estimated Total: ' : 'إجمالي التكلفة التقريبية: '}
                  <AnimatedCounter
                    value={totalBoughtEst}
                    formatFn={(v) => formatMoney(v, settings.currency)}
                    isReduced={isReduced}
                  />
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleConvertBought}
                className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Receipt size={14} />
                <span>{isEn ? 'Log as Expense' : 'ترحيل لمصروف فعلي'}</span>
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
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                          ~{formatMoney(item.estimatedPrice * item.quantity, settings.currency)}
                        </span>
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

          {/* Bought Items Group with Strike-through line drawing */}
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

      {/* Add Bill Modal */}
      <AnimatePresence>
        {showAddBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBillModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
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
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/50 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      {isEn ? 'Due Day (1-31)' : 'يوم الاستحقاق (1-31)'}
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
                    {isEn ? 'Category' : 'التصنيف'}
                  </label>
                  <select
                    value={billCategoryId}
                    onChange={(e) => setBillCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isEn ? (c.nameEn || c.name) : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Schedule local reminder' : 'جدولة تنبيه محلي'}
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

      {/* Add Grocery Modal */}
      <AnimatePresence>
        {showAddGroceryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGroceryModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
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
