import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  ListTodo,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs } from '../utils/motion';

export type TabId = 'dashboard' | 'expenses' | 'budgets' | 'bills_groceries' | 'analytics_settings';

interface TabBarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  onOpenAddExpense: () => void;
  isAddExpenseOpen?: boolean;
  unpaidBillsCount?: number;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddExpense,
  isAddExpenseOpen = false,
  unpaidBillsCount = 0,
  soundEnabled = true,
  language = 'ar',
}) => {
  const isEn = language === 'en';
  const tabs = [
    { id: 'dashboard' as TabId, label: isEn ? 'Dashboard' : 'الرئيسية', icon: LayoutDashboard },
    { id: 'expenses' as TabId, label: isEn ? 'Expenses' : 'المصاريف', icon: ReceiptText },
    { id: 'budgets' as TabId, label: isEn ? 'Budgets' : 'الميزانية', icon: PieChart },
    {
      id: 'bills_groceries' as TabId,
      label: isEn ? 'Bills & List' : 'فواتير ومشتريات',
      icon: ListTodo,
      badge: unpaidBillsCount > 0 ? unpaidBillsCount : undefined,
    },
    { id: 'analytics_settings' as TabId, label: isEn ? 'Settings' : 'الإعدادات', icon: SlidersHorizontal },
  ];

  const handleTabClick = (tabId: TabId) => {
    if (tabId !== activeTab) {
      nativeHaptics.tap(soundEnabled);
      onChangeTab(tabId);
    }
  };

  return (
    <nav
      aria-label="Navigation bar"
      className="relative w-full shrink-0 select-none z-30"
    >
      {/* Floating Center Quick Add Button */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40">
        <div className="relative flex items-center justify-center">
          {/* Subtle breathing pulse ring (idle state) */}
          {!isAddExpenseOpen && (
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.1, 0.4],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full bg-emerald-500 blur-xs pointer-events-none"
            />
          )}

          <motion.button
            whileTap={{ scale: 0.92 }}
            animate={{ rotate: isAddExpenseOpen ? 45 : 0 }}
            transition={springs.snappy}
            onClick={() => {
              nativeHaptics.tap(soundEnabled);
              onOpenAddExpense();
            }}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/35 flex items-center justify-center cursor-pointer border-4 border-[#F2F2F7] dark:border-black active:shadow-md transition-shadow"
            aria-label={isEn ? 'Quick Add Expense' : 'إضافة مصروف سريع'}
            title={isEn ? 'Quick Add Expense' : 'إضافة مصروف سريع'}
          >
            <Plus size={26} strokeWidth={2.8} />
          </motion.button>
        </div>
      </div>

      {/* iOS Blur Glass Tab Bar Surface */}
      <div className="w-full bg-white/85 dark:bg-[#161618]/90 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-[#2C2C2E] px-2 pt-1.5 pb-1 transition-colors">
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 min-h-[46px] cursor-pointer group select-none ${
                  idx === 2 ? 'mt-2' : ''
                }`}
              >
                {/* Shared-layout sliding active pill indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    transition={springs.smooth}
                    className="absolute inset-x-1.5 inset-y-0.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 pointer-events-none"
                  />
                )}

                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`transition-colors duration-200 ${
                        isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[#8E8E93] group-hover:text-[#636366] dark:group-hover:text-[#AEAEB2]'
                      }`}
                    />
                  </motion.div>

                  {/* Badge */}
                  {tab.badge !== undefined && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springs.bouncy}
                      className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-white dark:border-[#161618] tabular-nums shadow-xs"
                    >
                      {tab.badge}
                    </motion.span>
                  )}

                  <span
                    className={`text-[10px] mt-0.5 font-medium tracking-tight whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-[#8E8E93] group-hover:text-[#636366] dark:group-hover:text-[#AEAEB2]'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="w-full flex justify-center pt-2 pb-0.5">
          <div className="w-32 h-1 bg-black/25 dark:bg-white/25 rounded-full" />
        </div>
      </div>
    </nav>
  );
};
