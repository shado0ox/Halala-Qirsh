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
import { RecurringBill, GroceryItem, Category, BudgetSettings } from '../../types';
import { SegmentedControl } from '../SegmentedControl';
import { CategoryIcon } from '../CategoryIcon';
import { formatMoney } from '../../utils/storage';
import { sound } from '../../utils/audio';
import { NotificationPermissionState } from '../../utils/notifications';

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

    sound.playSuccess(settings.soundEnabled);
    onAddBill({
      title: billTitle.trim(),
      amount,
      categoryId: billCategoryId,
      dueDay: billDueDay,
      isPaid: false,
      reminderEnabled: billReminderEnabled,
      notes: billNotes.trim() || undefined,
    });
    setBillTitle('');
    setBillAmount('');
    setBillReminderEnabled(true);
    setShowAddBillModal(false);
  };

  const handleSaveGrocery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grocName.trim()) return;
    const price = parseFloat(grocEstimatedPrice) || 0;

    sound.playSuccess(settings.soundEnabled);
    onAddGrocery({
      name: grocName.trim(),
      category: grocCategory,
      estimatedPrice: price,
      isBought: false,
      quantity: grocQuantity > 0 ? grocQuantity : 1,
      unit: grocUnit,
    });
    setGrocName('');
    setGrocEstimatedPrice('');
    setShowAddGroceryModal(false);
  };

  const handleConvertBought = () => {
    if (boughtItems.length === 0) return;
    sound.playSuccess(settings.soundEnabled);
    onConvertBoughtToExpense(boughtItems);
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
      {/* Top Header & Segmented Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight">
            التزامات ومشتريات البيت
          </h1>
          <button
            onClick={() => {
              sound.playTap(settings.soundEnabled);
              if (activeSubTab === 'bills') {
                setShowAddBillModal(true);
              } else {
                setShowAddGroceryModal(true);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            {activeSubTab === 'bills' ? '+ فاتورة دورية' : '+ سلعة للقائمة'}
          </button>
        </div>

        {/* iOS Segmented Control */}
        <SegmentedControl
          value={activeSubTab}
          onChange={setActiveSubTab}
          soundEnabled={settings.soundEnabled}
          options={[
            { value: 'bills', label: 'الفواتير والأقساط الشهرية', badge: unpaidCount },
            { value: 'groceries', label: 'قائمة مشتريات ونواقص البيت', badge: unboughtItems.length },
          ]}
        />
      </div>

      {/* ===================== TAB 1: BILLS ===================== */}
      {activeSubTab === 'bills' && (
        <div className="space-y-3.5">
          {/* Bills Summary Box */}
          <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8E8E93]">حالة فواتير هذا الشهر</span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {bills.filter((b) => b.isPaid).length} من {bills.length} مسددة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block">
                  تم سداده
                </span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatMoney(paidBillsAmount, settings.currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/40">
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold block">
                  المتبقي مستحق السداد
                </span>
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatMoney(unpaidBillsAmount, settings.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Local Bill Reminders Card (Web Notifications API) */}
          <div className="bg-white dark:bg-[#1C1C1E] p-3.5 rounded-3xl border border-blue-200/60 dark:border-blue-900/40 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BellRing size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#1C1C1E] dark:text-white block">
                    تنبيهات الفواتير المحلية (Web Notifications)
                  </span>
                  <span className="text-[10px] text-[#8E8E93]">
                    تذكير تلقائي قبل موعد استحقاق فواتير البيت
                  </span>
                </div>
              </div>

              {/* Status Badge */}
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
                  ? 'مفعلة بالمتصفح ✓'
                  : notificationPermission === 'denied'
                  ? 'محظورة بالمتصفح'
                  : 'تحتاج إذن المتصفح'}
              </span>
            </div>

            {/* Reminder Lead Days Selector */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                موعد التنبيه:
              </span>
              <div className="flex items-center gap-1 font-semibold text-[11px]">
                {[
                  { days: 0, label: 'في نفس اليوم' },
                  { days: 1, label: 'قبل يوم' },
                  { days: 3, label: 'قبل 3 أيام' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => {
                      sound.playTap(settings.soundEnabled);
                      onUpdateSettings({ notificationLeadDays: opt.days });
                    }}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                      settings.notificationLeadDays === opt.days
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Request Permission or Test */}
            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={onRequestNotificationPermission}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Bell size={14} />
                  <span>تفعيل إشعارات المتصفح الآن</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSendTestNotification}
                  className="flex-1 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200/60 dark:border-blue-900/50 cursor-pointer transition-colors"
                >
                  <Sparkles size={14} />
                  <span>إرسال إشعار تجريبي لاختبار التنبيه</span>
                </button>
              )}
            </div>
          </div>

          {/* Bills List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#8E8E93] px-1">
              جدول الفواتير المستحقة شهرياً
            </span>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              {bills.map((bill) => {
                const cat = catMap.get(bill.categoryId);
                const isReminderOn = bill.reminderEnabled !== false;

                return (
                  <div
                    key={bill.id}
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      bill.isPaid
                        ? 'bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => {
                          sound.playSuccess(settings.soundEnabled);
                          onToggleBill(bill.id);
                        }}
                        className="cursor-pointer text-blue-600 dark:text-blue-400 shrink-0"
                        title={bill.isPaid ? 'تحديد كغير مسددة' : 'تحديد كمسددة'}
                      >
                        {bill.isPaid ? (
                          <CheckCircle2 size={24} className="text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                        ) : (
                          <Circle size={24} className="text-slate-300 dark:text-slate-600 hover:text-blue-500" />
                        )}
                      </button>

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
                            <span>يوم {bill.dueDay} من الشهر</span>
                          </span>
                          <span>·</span>
                          <span>{cat?.name || 'فواتير'}</span>
                          {bill.notes && <span>· {bill.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1C1C1E] dark:text-white tabular-nums">
                        {formatMoney(bill.amount, settings.currency)}
                      </span>

                      {/* Reminder Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playTap(settings.soundEnabled);
                          onToggleBillReminder(bill.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isReminderOn
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                            : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                        }`}
                        title={isReminderOn ? 'التنبيه مفعل لهذه الفاتورة (انقر للتعطيل)' : 'التنبيه معطل (انقر للتفعيل)'}
                      >
                        {isReminderOn ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('حذف هذه الفاتورة الدورية؟')) {
                            sound.playDelete(settings.soundEnabled);
                            onDeleteBill(bill.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {bills.length === 0 && (
                <div className="p-8 text-center text-xs text-[#8E8E93]">
                  لا توجد فواتير مضافة بعد. اضغط على "+ فاتورة دورية" لإضافة كهرباء، إيجار، أو إنترنت.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GROCERIES ===================== */}
      {activeSubTab === 'groceries' && (
        <div className="space-y-3.5">
          {/* Action Banner to Convert to Expense */}
          {boughtItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                  تم شراء {boughtItems.length} أصناف بنجاح!
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  إجمالي التكلفة التقريبية: {formatMoney(totalBoughtEst, settings.currency)}
                </span>
              </div>

              <button
                onClick={handleConvertBought}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Receipt size={14} />
                <span>ترحيل لمصروف فعلي</span>
              </button>
            </div>
          )}

          {/* Unbought Groceries */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#8E8E93] px-1 flex items-center justify-between">
              <span>أصناف مطلوب شراؤها ({unboughtItems.length})</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400">حدد المربع عند الشراء</span>
            </span>

            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden shadow-2xs">
              {unboughtItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        sound.playTap(settings.soundEnabled);
                        onToggleGrocery(item.id);
                      }}
                      className="cursor-pointer text-slate-300 hover:text-blue-500 shrink-0"
                    >
                      <Circle size={22} />
                    </button>

                    <div>
                      <div className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#8E8E93] flex items-center gap-1">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>
                          الكمية: {item.quantity} {item.unit}
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

                    <button
                      onClick={() => {
                        sound.playDelete(settings.soundEnabled);
                        onDeleteGrocery(item.id);
                      }}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {unboughtItems.length === 0 && (
                <div className="p-6 text-center text-xs text-[#8E8E93]">
                  قائمة المشتريات فارغة حالياً! اضغط على "+ سلعة للقائمة" لإضافة ما يحتاجه البيت.
                </div>
              )}
            </div>
          </div>

          {/* Already Bought Groceries */}
          {boughtItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#8E8E93] px-1">
                تم شراؤها في هذه الجولة ({boughtItems.length})
              </span>

              <div className="bg-white/60 dark:bg-[#1C1C1E]/60 rounded-2xl border border-slate-200/50 dark:border-slate-800 divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] overflow-hidden opacity-80">
                {boughtItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 px-3 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          sound.playTap(settings.soundEnabled);
                          onToggleGrocery(item.id);
                        }}
                        className="cursor-pointer text-emerald-500 shrink-0"
                      >
                        <CheckCircle2 size={20} className="fill-emerald-100 dark:fill-emerald-950" />
                      </button>

                      <div className="line-through text-xs text-[#8E8E93]">
                        {item.name} ({item.quantity} {item.unit})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8E8E93] tabular-nums">
                        {formatMoney(item.estimatedPrice * item.quantity, settings.currency)}
                      </span>
                      <button
                        onClick={() => {
                          sound.playDelete(settings.soundEnabled);
                          onDeleteGrocery(item.id);
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: ADD BILL ===================== */}
      {showAddBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAddBillModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
          <form
            onSubmit={handleSaveBill}
            className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">إضافة فاتورة دورية</span>
              <button
                type="button"
                onClick={() => setShowAddBillModal(false)}
                className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93]"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">اسم الفاتورة</label>
              <input
                type="text"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder="مثلاً: كهرباء البيت، إنترنت، قسط سيارة..."
                className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">المبلغ التقريبي</label>
                <input
                  type="number"
                  step="any"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">يوم الاستحقاق</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={billDueDay}
                  onChange={(e) => setBillDueDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden tabular-nums"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">الفئة</label>
              <select
                value={billCategoryId}
                onChange={(e) => setBillCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Notification Reminder Checkbox */}
            <div className="p-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-blue-500" />
                <span className="text-xs font-semibold text-[#1C1C1E] dark:text-white">
                  تفعيل التنبيه والتذكير المحلي
                </span>
              </div>
              <input
                type="checkbox"
                checked={billReminderEnabled}
                onChange={(e) => setBillReminderEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer accent-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer mt-2"
            >
              <Check size={16} />
              <span>حفظ الفاتورة</span>
            </button>
          </form>
        </div>
      )}

      {/* ===================== MODAL: ADD GROCERY ===================== */}
      {showAddGroceryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAddGroceryModal(false)} className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
          <form
            onSubmit={handleSaveGrocery}
            className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 z-10 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <span className="text-sm font-bold text-[#1C1C1E] dark:text-white">إضافة سلعة لقائمة البيت</span>
              <button
                type="button"
                onClick={() => setShowAddGroceryModal(false)}
                className="w-7 h-7 rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93]"
              >
                <X size={15} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">اسم السلعة / المنتج</label>
              <input
                type="text"
                value={grocName}
                onChange={(e) => setGrocName(e.target.value)}
                placeholder="مثلاً: حليب، بيض، أرز، زيت، مناديل..."
                className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">الكمية</label>
                <input
                  type="number"
                  min="1"
                  value={grocQuantity}
                  onChange={(e) => setGrocQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">الوحدة</label>
                <select
                  value={grocUnit}
                  onChange={(e) => setGrocUnit(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden"
                >
                  <option value="حبة">حبة</option>
                  <option value="كجم">كجم</option>
                  <option value="علبة">علبة</option>
                  <option value="طبق">طبق</option>
                  <option value="لتر">لتر</option>
                  <option value="كيس">كيس</option>
                  <option value="كرتون">كرتون</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">سعر تقريبي</label>
                <input
                  type="number"
                  step="any"
                  value={grocEstimatedPrice}
                  onChange={(e) => setGrocEstimatedPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer mt-2"
            >
              <Check size={16} />
              <span>إضافة للقائمة</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
