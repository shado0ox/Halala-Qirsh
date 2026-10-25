import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  ListTodo,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';

export type TabId = 'dashboard' | 'expenses' | 'budgets' | 'bills_groceries' | 'analytics_settings';

interface TabBarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  onOpenAddExpense: () => void;
  unpaidBillsCount?: number;
  soundEnabled?: boolean;
  language?: 'ar' | 'en';
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddExpense,
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
    nativeHaptics.tap(soundEnabled);
    onChangeTab(tabId);
  };

  return (
    <div className="relative w-full shrink-0 select-none">
      {/* Bottom Floating Quick Add Button */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => {
            nativeHaptics.tap(soundEnabled);
            onOpenAddExpense();
          }}
          className="w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all duration-200 active:scale-95 active:shadow-md cursor-pointer border-4 border-[#F2F2F7] dark:border-[#1C1C1E]"
          aria-label="إضافة مصروف جديد"
          title="إضافة مصروف سريع"
        >
          <Plus size={26} strokeWidth={2.8} />
        </button>
      </div>

      {/* iOS Blur Tab Bar */}
      <div className="w-full bg-white/85 dark:bg-[#161618]/90 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-[#2C2C2E] px-2 pt-2 pb-1 transition-colors">
        <div className="grid grid-cols-5 items-center max-w-lg mx-auto">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 min-h-[44px] cursor-pointer group transition-transform duration-150 active:scale-90 ${
                  idx === 2 ? 'mt-2' : ''
                }`}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-[#8E8E93] group-hover:text-[#636366]'
                    }`}
                  />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-[#161618] tabular-nums">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 font-medium tracking-tight whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-[#8E8E93] group-hover:text-[#636366]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="w-full flex justify-center pt-2 pb-1">
          <div className="w-32 h-1 bg-black/30 dark:bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
};
