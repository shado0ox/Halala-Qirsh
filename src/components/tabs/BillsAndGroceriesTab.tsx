import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RecurringBill,
  GroceryItem,
  Category,
  BudgetSettings,
  DetectedSubscription,
  JamiyyaGroup,
  Expense,
} from '../../types';
import { SegmentedControl } from '../SegmentedControl';
import { CategoryIcon } from '../CategoryIcon';
import { Amount } from '../Amount';
import { formatMoney, CURRENCY_SYMBOLS } from '../../utils/storage';
import { nativeHaptics } from '../../utils/nativeHaptics';
import { NotificationPermissionState } from '../../utils/notifications';
import { springs, fades, useMotionConfig } from '../../utils/motion';
import { handleModalBackdropClick, dismissKeyboard, useKeyboardState } from '../../utils/keyboard';
import { KeyboardDismissButton } from '../KeyboardDismissButton';
import { SubscriptionCard } from '../SubscriptionCard';
import { SubscriptionEditModal } from '../SubscriptionEditModal';
import {
  getUpcomingSubscriptionRenewals,
  getSubscriptionPriceAlerts,
} from '../../utils/subscriptionReminders';
import { JamiyyaGroupCard } from '../jamiyya/JamiyyaGroupCard';
import { CreateJamiyyaModal } from '../jamiyya/CreateJamiyyaModal';
import { JamiyyaDetailModal } from '../jamiyya/JamiyyaDetailModal';
import { CreateJamiyyaInput, generateJamiyyaShareText } from '../../utils/jamiyyaEngine';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

interface BillsAndGroceriesTabProps {
  bills: RecurringBill[];
  groceries: GroceryItem[];
  categories: Category[];
  settings: BudgetSettings;
  subscriptions?: DetectedSubscription[];
  jamiyyas?: JamiyyaGroup[];
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
  onConfirmSubscription?: (subId: string) => void;
  onDismissSubscription?: (subId: string) => void;
  onSaveSubscription?: (sub: DetectedSubscription) => void;
  onDeleteSubscription?: (subId: string) => void;
  onCreateJamiyya?: (data: CreateJamiyyaInput) => void;
  onUpdateJamiyya?: (updated: JamiyyaGroup) => void;
  onDeleteJamiyya?: (id: string) => void;
  onLogJamiyyaExpense?: (expense: Omit<Expense, 'id' | 'createdAt'>) => string;
  onLogJamiyyaIncome?: (amount: number, title: string, date: string, notes?: string) => string;
  initialSubTab?: 'bills' | 'subscriptions' | 'jamiyya' | 'groceries';
}

export const BillsAndGroceriesTab: React.FC<BillsAndGroceriesTabProps> = ({
  bills,
  groceries,
  categories,
  settings,
  subscriptions = [],
  jamiyyas = [],
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
  onConfirmSubscription,
  onDismissSubscription,
  onSaveSubscription,
  onDeleteSubscription,
  onCreateJamiyya,
  onUpdateJamiyya,
  onDeleteJamiyya,
  onLogJamiyyaExpense,
  onLogJamiyyaIncome,
  initialSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'subscriptions' | 'jamiyya' | 'groceries'>(
    initialSubTab || 'bills'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [editingSubscription, setEditingSubscription] = useState<DetectedSubscription | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [isCreateJamiyyaOpen, setIsCreateJamiyyaOpen] = useState<boolean>(false);
  const [selectedJamiyyaForDetail, setSelectedJamiyyaForDetail] = useState<JamiyyaGroup | null>(null);
  const motionConfig = useMotionConfig(settings.animations);
  const isReduced = motionConfig.isReduced;
  const isEn = settings.language === 'en';
  const lang = settings.language || 'ar';
  const isHidden = Boolean(settings.hideAmounts);
  const { isKeyboardOpen } = useKeyboardState();

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
  const [grocCategory, setGrocCategory] = useState<string>(isEn ? 'Produce' : 'خضار وفواكه');
  const [grocEstimatedPrice, setGrocEstimatedPrice] = useState<string>('');
  const [grocQuantity, setGrocQuantity] = useState<number>(1);
  const [grocUnit, setGrocUnit] = useState<string>(isEn ? 'pcs' : 'حبة');

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

  // Subscriptions calculations
  const confirmedSubs = subscriptions.filter((s) => s.status === 'confirmed');
  const detectedSubs = subscriptions.filter((s) => s.status === 'detected');
  const totalMonthlySubsCommitment = confirmedSubs.reduce((sum, s) => {
    const freq = s.detectedFrequency || s.frequency || 'monthly';
    if (freq === 'weekly') return sum + s.typicalAmount * 4.33;
    if (freq === 'biweekly') return sum + s.typicalAmount * 2.16;
    if (freq === 'monthly') return sum + s.typicalAmount;
    if (freq === 'quarterly') return sum + s.typicalAmount / 3;
    if (freq === 'yearly') return sum + s.typicalAmount / 12;
    return sum + s.typicalAmount;
  }, 0);

  const upcomingRenewals = getUpcomingSubscriptionRenewals(confirmedSubs, { leadDays: 7 });
  const priceAlerts = getSubscriptionPriceAlerts(subscriptions);

  // Jam'iyya calculations
  const activeJamiyyas = jamiyyas.filter((j) => j.status === 'active');
  const completedJamiyyas = jamiyyas.filter((j) => j.status === 'completed');
  const totalActiveJamiyyaPot = activeJamiyyas.reduce((sum, j) => sum + j.totalPayout, 0);

  const handleShareJamiyyaWhatsApp = async (grp: JamiyyaGroup) => {
    nativeHaptics.tap(settings.soundEnabled);
    const currencySymbol = CURRENCY_SYMBOLS[settings.currency]?.symbol || (isEn ? 'SAR' : 'ر.س');
    const shareText = generateJamiyyaShareText(grp, isEn ? 'en' : 'ar', currencySymbol);

    try {
      const canShare = await Share.canShare().then((res) => res.value).catch(() => false);
      if (canShare) {
        await Share.share({ title: grp.name, text: shareText });
        return;
      }
    } catch {
      // fallback
    }

    try {
      await Clipboard.write({ string: shareText });
      const encoded = encodeURIComponent(shareText);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } catch {
      navigator.clipboard?.writeText(shareText);
    }
  };

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
                : activeSubTab === 'subscriptions'
                ? isEn
                  ? `${confirmedSubs.length} active (${detectedSubs.length} detected)`
                  : `${confirmedSubs.length} اشتراك نشط (${detectedSubs.length} رصد جديد)`
                : activeSubTab === 'jamiyya'
                ? isEn
                  ? `${activeJamiyyas.length} active groups (${completedJamiyyas.length} completed)`
                  : `${activeJamiyyas.length} جمعية نشطة (${completedJamiyyas.length} مكتملة)`
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
              } else if (activeSubTab === 'subscriptions') {
                const todayYmd = new Date().toISOString().slice(0, 10);
                setEditingSubscription({
                  id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  merchant: '',
                  normalizedMerchant: '',
                  typicalAmount: 0,
                  detectedFrequency: 'monthly',
                  lastChargeDate: todayYmd,
                  nextExpectedRenewalDate: todayYmd,
                  reminderDaysBefore: 3,
                  status: 'confirmed',
                  autoDetected: false,
                });
                setIsSubscriptionModalOpen(true);
              } else if (activeSubTab === 'jamiyya') {
                setIsCreateJamiyyaOpen(true);
              } else {
                setShowAddGroceryModal(true);
              }
            }}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/25 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>
              {activeSubTab === 'bills'
                ? isEn ? 'New Bill' : 'إضافة فاتورة'
                : activeSubTab === 'subscriptions'
                ? isEn ? 'New Sub' : 'إضافة اشتراك'
                : activeSubTab === 'jamiyya'
                ? isEn ? 'New Group' : 'بدء جمعية'
                : isEn ? 'Add Item' : 'إضافة سلعة'}
            </span>
          </motion.button>
        </div>

        {/* Sub-Tab Selector */}
        <SegmentedControl
          options={[
            { id: 'bills', label: isEn ? 'Bills' : 'فواتير دورية' },
            {
              id: 'subscriptions',
              label: isEn ? 'Subscriptions' : 'الاشتراكات',
              badge: detectedSubs.length > 0 ? detectedSubs.length : undefined,
            },
            {
              id: 'jamiyya',
              label: isEn ? 'Jam\'iyya' : 'الجمعيات',
              badge: activeJamiyyas.length > 0 ? activeJamiyyas.length : undefined,
            },
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

      {/* SUB-TAB 2: SUBSCRIPTIONS */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-3.5 pb-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Monthly Commitment' : 'الالتزام الشهري التقريبي'}
              </span>
              <Amount
                value={totalMonthlySubsCommitment}
                currency={settings.currency}
                hideAmounts={isHidden}
                language={lang}
                className="text-lg font-black text-[#1C1C1E] dark:text-white"
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Active Subscriptions' : 'الاشتراكات النشطة'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {confirmedSubs.length}
                </span>
                {detectedSubs.length > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                    (+{detectedSubs.length} {isEn ? 'detected' : 'مرصود'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price Increase Alerts Banner */}
          {priceAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1">
                <TrendingUp size={14} className="text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {isEn ? 'Price Increase Detected' : 'تنبيه ارتفاع في أسعار الاشتراكات'}
                </span>
              </div>
              <div className="space-y-2">
                {priceAlerts.map((alert) => {
                  const targetSub = subscriptions.find((s) => s.id === alert.subscriptionId);
                  return (
                    <div
                      key={`alert-${alert.id}`}
                      className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-200 truncate">
                          {alert.merchant}
                        </div>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 leading-tight">
                          {isEn ? alert.bodyEn : alert.bodyAr}
                        </p>
                      </div>
                      {targetSub && (
                        <button
                          onClick={() => {
                            nativeHaptics.tap(settings.soundEnabled);
                            setEditingSubscription(targetSub);
                            setIsSubscriptionModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold shrink-0 cursor-pointer hover:bg-amber-700 transition-colors"
                        >
                          {isEn ? 'Update' : 'تحديث'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Renewals in Next 7 Days Banner */}
          {upcomingRenewals.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {isEn ? 'Upcoming Renewals' : 'تجديدات قادمة قريباً'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {upcomingRenewals.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {upcomingRenewals.slice(0, 3).map((item) => (
                  <div
                    key={`upcoming-${item.id}`}
                    className="flex items-center justify-between text-xs py-1 border-t border-emerald-200/50 dark:border-emerald-800/50 first:border-0"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.merchant}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                        {item.daysRemaining === 0
                          ? isEn ? 'Today' : 'اليوم'
                          : item.daysRemaining === 1
                          ? isEn ? 'Tomorrow' : 'غداً'
                          : isEn ? `in ${item.daysRemaining} days` : `خلال ${item.daysRemaining} أيام`}
                      </span>
                      <Amount
                        value={item.amount}
                        currency={settings.currency}
                        hideAmounts={isHidden}
                        language={lang}
                        className="font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Auto-Detected Subscriptions (Needs Confirmation) */}
          {detectedSubs.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                    {isEn ? 'Detected from Transactions' : 'اشتراكات تم رصدها تلقائياً'}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                  {detectedSubs.length}
                </span>
              </div>
              <p className="text-[11px] text-[#8E8E93] px-1 -mt-1">
                {isEn
                  ? 'Halala-Qirsh detected recurring charges in your history. Confirm to track or dismiss.'
                  : 'تعرّف هللة وقرش على هذه العمليات المتكررة في مصاريفك. اضغط تأكيد للمتابعة أو تجاهل.'}
              </p>

              <div className="space-y-2.5">
                {detectedSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    isEn={isEn}
                    isHidden={isHidden}
                    onConfirm={() => {
                      nativeHaptics.success(settings.soundEnabled);
                      onConfirmSubscription?.(sub.id);
                    }}
                    onDismiss={() => {
                      nativeHaptics.impactLight(settings.soundEnabled);
                      onDismissSubscription?.(sub.id);
                    }}
                    onEdit={() => {
                      nativeHaptics.tap(settings.soundEnabled);
                      setEditingSubscription(sub);
                      setIsSubscriptionModalOpen(true);
                    }}
                    onDelete={() => {
                      nativeHaptics.impactLight(settings.soundEnabled);
                      onDeleteSubscription?.(sub.id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Active / Confirmed Subscriptions */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                {isEn ? 'Active Subscriptions' : 'الاشتراكات المعتمدة'}
              </span>
              <span className="text-xs text-[#8E8E93] font-semibold tabular-nums">
                {confirmedSubs.length}
              </span>
            </div>

            {confirmedSubs.length > 0 ? (
              <div className="space-y-2.5">
                {confirmedSubs.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    isEn={isEn}
                    isHidden={isHidden}
                    onEdit={() => {
                      nativeHaptics.tap(settings.soundEnabled);
                      setEditingSubscription(sub);
                      setIsSubscriptionModalOpen(true);
                    }}
                    onDelete={() => {
                      nativeHaptics.impactLight(settings.soundEnabled);
                      onDeleteSubscription?.(sub.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 space-y-2.5 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <RefreshCw size={22} />
                </div>
                <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                  {isEn ? 'No active subscriptions' : 'لا توجد اشتراكات معتمدة حالياً'}
                </div>
                <p className="text-[11px] text-[#8E8E93] max-w-xs mx-auto leading-relaxed">
                  {isEn
                    ? 'Halala-Qirsh automatically detects recurring services (Netflix, Spotify, STC, Gym, etc.) as you log expenses, or you can add one manually.'
                    : 'يتعرّف النظام تلقائياً على الاشتراكات مثل نتفلكس، سبوتيفاي، النوادي وفواتير الاتصالات مع تسجيل المصاريف، أو يمكنك إضافة اشتراك يدوياً الآن.'}
                </p>
                <button
                  onClick={() => {
                    nativeHaptics.tap(settings.soundEnabled);
                    const todayYmd = new Date().toISOString().slice(0, 10);
                    setEditingSubscription({
                      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      merchant: '',
                      normalizedMerchant: '',
                      typicalAmount: 0,
                      detectedFrequency: 'monthly',
                      lastChargeDate: todayYmd,
                      nextExpectedRenewalDate: todayYmd,
                      reminderDaysBefore: 3,
                      status: 'confirmed',
                      autoDetected: false,
                    });
                    setIsSubscriptionModalOpen(true);
                  }}
                  className="mt-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>{isEn ? 'Add Subscription Manually' : 'إضافة اشتراك يدوياً'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: JAMIYYA GROUPS */}
      {activeSubTab === 'jamiyya' && (
        <div className="space-y-3.5 pb-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Active Groups' : 'الجمعيات النشطة'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {activeJamiyyas.length}
                </span>
                {completedJamiyyas.length > 0 && (
                  <span className="text-[11px] text-[#8E8E93]">
                    ({completedJamiyyas.length} {isEn ? 'completed' : 'مكتملة'})
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-[#8E8E93] block font-semibold">
                {isEn ? 'Active Pots Value' : 'إجمالي مبالغ الجمعيات'}
              </span>
              <Amount
                value={totalActiveJamiyyaPot}
                currency={settings.currency}
                hideAmounts={isHidden}
                language={lang}
                className="text-lg font-black text-[#1C1C1E] dark:text-white"
              />
            </div>
          </div>

          {/* Active Jam'iyyas List */}
          {activeJamiyyas.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Ongoing Groups' : 'الجمعيات الجارية'}
                </span>
                <span className="text-xs text-[#8E8E93] font-semibold tabular-nums">
                  {activeJamiyyas.length}
                </span>
              </div>

              <div className="space-y-3">
                {activeJamiyyas.map((grp) => (
                  <JamiyyaGroupCard
                    key={grp.id}
                    group={grp}
                    currency={settings.currency}
                    isEn={isEn}
                    isHidden={isHidden}
                    soundEnabled={settings.soundEnabled}
                    onOpenDetails={(g) => setSelectedJamiyyaForDetail(g)}
                    onShareWhatsApp={handleShareJamiyyaWhatsApp}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200/70 dark:border-slate-800 space-y-3 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
                🪙
              </div>
              <div className="text-sm font-black text-[#1C1C1E] dark:text-white">
                {isEn ? 'No Active Jam\'iyya Groups' : 'لا توجد جمعيات مالية مسجلة حالياً'}
              </div>
              <p className="text-xs text-[#8E8E93] max-w-sm mx-auto leading-relaxed">
                {isEn
                  ? 'Organize your family or coworker rotating savings groups (ROSCAs). Track turns, monthly installment payments, and share updates on WhatsApp with one click!'
                  : 'نظّم جمعياتك العائلية أو جمعيات الزملاء، تابع الأدوار والاستلام، وسجّل سداد الأقساط الشهرية مع إمكانية مشاركة التحديثات على واتساب بضغطة زر!'}
              </p>
              <button
                onClick={() => {
                  nativeHaptics.tap(settings.soundEnabled);
                  setIsCreateJamiyyaOpen(true);
                }}
                className="mt-1 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/25"
              >
                <Plus size={15} />
                <span>{isEn ? 'Start New Jam\'iyya' : 'بدء جمعية جديدة الآن'}</span>
              </button>
            </div>
          )}

          {/* Completed Jam'iyyas (if any) */}
          {completedJamiyyas.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-bold text-[#8E8E93] px-1">
                {isEn ? `Completed Groups (${completedJamiyyas.length})` : `جمعيات مكتملة (${completedJamiyyas.length})`}
              </span>

              <div className="space-y-2.5">
                {completedJamiyyas.map((grp) => (
                  <JamiyyaGroupCard
                    key={grp.id}
                    group={grp}
                    currency={settings.currency}
                    isEn={isEn}
                    isHidden={isHidden}
                    soundEnabled={settings.soundEnabled}
                    onOpenDetails={(g) => setSelectedJamiyyaForDetail(g)}
                    onShareWhatsApp={handleShareJamiyyaWhatsApp}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: GROCERIES LIST */}
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
              onClick={(e) => handleModalBackdropClick(e, () => setShowAddBillModal(false), settings.soundEnabled)}
              className="absolute inset-0 bg-black/55 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={springs.smooth}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
                  dismissKeyboard();
                }
              }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Add Recurring Bill' : 'إضافة فاتورة دورية جديدة'}
                </h3>
                <div className="flex items-center gap-2">
                  <KeyboardDismissButton
                    visible={isKeyboardOpen}
                    isEnglish={isEn}
                    soundEnabled={settings.soundEnabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddBillModal(false)}
                    className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
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
              onClick={(e) => handleModalBackdropClick(e, () => setShowAddGroceryModal(false), settings.soundEnabled)}
              className="absolute inset-0 bg-black/55 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              transition={springs.smooth}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
                  dismissKeyboard();
                }
              }}
              className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
                <h3 className="text-sm font-black text-[#1C1C1E] dark:text-white">
                  {isEn ? 'Add Grocery Item' : 'إضافة سلعة لقائمة البيت'}
                </h3>
                <div className="flex items-center gap-2">
                  <KeyboardDismissButton
                    visible={isKeyboardOpen}
                    isEnglish={isEn}
                    soundEnabled={settings.soundEnabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddGroceryModal(false)}
                    className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
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

      {/* Subscription Edit / Add Modal */}
      <SubscriptionEditModal
        isOpen={isSubscriptionModalOpen}
        subscription={editingSubscription}
        isEn={isEn}
        soundEnabled={settings.soundEnabled}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        onSave={(savedSub) => {
          onSaveSubscription?.(savedSub);
          setIsSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        onDelete={(subId) => {
          onDeleteSubscription?.(subId);
          setIsSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
      />

      {/* Create Jam'iyya Modal */}
      <CreateJamiyyaModal
        isOpen={isCreateJamiyyaOpen}
        onClose={() => setIsCreateJamiyyaOpen(false)}
        currency={settings.currency}
        isEn={isEn}
        soundEnabled={settings.soundEnabled}
        onCreateGroup={(data) => {
          onCreateJamiyya?.(data);
          setIsCreateJamiyyaOpen(false);
        }}
      />

      {/* Jam'iyya Detail Modal */}
      <JamiyyaDetailModal
        isOpen={Boolean(selectedJamiyyaForDetail)}
        group={selectedJamiyyaForDetail}
        currency={settings.currency}
        isEn={isEn}
        soundEnabled={settings.soundEnabled}
        onClose={() => setSelectedJamiyyaForDetail(null)}
        onUpdateGroup={(updated) => {
          onUpdateJamiyya?.(updated);
          setSelectedJamiyyaForDetail(updated);
        }}
        onDeleteGroup={(id) => {
          onDeleteJamiyya?.(id);
          setSelectedJamiyyaForDetail(null);
        }}
        onLogExpense={onLogJamiyyaExpense}
        onLogIncome={onLogJamiyyaIncome}
      />
    </div>
  );
};
