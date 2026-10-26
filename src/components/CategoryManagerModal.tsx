import React, { useState } from 'react';
import { X, Check, Trash2, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category, CurrencyCode } from '../types';
import { AVAILABLE_ICONS, COLOR_PALETTE, CategoryIcon } from './CategoryIcon';
import { sound } from '../utils/audio';
import { CURRENCY_SYMBOLS } from '../utils/storage';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currency: CurrencyCode;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  soundEnabled?: boolean;
  onShowToast?: (msg: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  currency,
  onSaveCategory,
  onDeleteCategory,
  soundEnabled = true,
  onShowToast,
}) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState<string>('');
  const [iconName, setIconName] = useState<string>('Tag');
  const [color, setColor] = useState<string>('#3B82F6');
  const [bgColor, setBgColor] = useState<string>('#EFF6FF');
  const [monthlyLimit, setMonthlyLimit] = useState<string>('500');
  const [error, setError] = useState<string>('');

  const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || 'ر.س';

  const startCreate = () => {
    sound.playTap(soundEnabled);
    setIsCreatingNew(true);
    setEditingCategory(null);
    setName('');
    setIconName('ShoppingCart');
    setColor('#3B82F6');
    setBgColor('#EFF6FF');
    setMonthlyLimit('1000');
    setError('');
  };

  const startEdit = (cat: Category) => {
    sound.playTap(soundEnabled);
    setEditingCategory(cat);
    setIsCreatingNew(false);
    setName(cat.name);
    setIconName(cat.icon);
    setColor(cat.color);
    setBgColor(cat.bgColor);
    setMonthlyLimit(String(cat.monthlyLimit));
    setError('');
  };

  const cancelEdit = () => {
    sound.playTap(soundEnabled);
    setEditingCategory(null);
    setIsCreatingNew(false);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم التصنيف');
      return;
    }
    const limit = parseFloat(monthlyLimit);
    if (isNaN(limit) || limit < 0) {
      setError('يرجى إدخال ميزانية شهرية صحيحة');
      return;
    }

    const catToSave: Category = {
      id: editingCategory ? editingCategory.id : `cat-custom-${Date.now()}`,
      name: name.trim(),
      icon: iconName,
      color,
      bgColor,
      monthlyLimit: limit,
      isCustom: editingCategory ? editingCategory.isCustom : true,
    };

    sound.playSuccess(soundEnabled);
    onSaveCategory(catToSave);
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    sound.playDelete(soundEnabled);
    onDeleteCategory(id);
    if (editingCategory?.id === id) {
      cancelEdit();
    }
  };

  const iconKeys = Object.keys(AVAILABLE_ICONS);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              sound.playTap(soundEnabled);
              onClose();
            }}
            className="absolute inset-0 bg-black/55"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-md max-h-[85vh] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-200/50 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
              <button
                onClick={() => {
                  sound.playTap(soundEnabled);
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-sm md:text-base font-bold text-[#1C1C1E] dark:text-white">
                {isCreatingNew
                  ? 'إضافة تصنيف جديد'
                  : editingCategory
                  ? 'تعديل التصنيف والميزانية'
                  : 'إدارة تصنيفات المصاريف والميزانية'}
              </h2>

              {!isCreatingNew && !editingCategory ? (
                <button
                  onClick={startCreate}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>جديد</span>
                </button>
              ) : (
                <button
                  onClick={cancelEdit}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {isCreatingNew || editingCategory ? (
                /* Edit/Create Form */
                <form onSubmit={handleSave} className="space-y-4">
                  {error && (
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium text-center">
                      {error}
                    </div>
                  )}

                  {/* Live Preview */}
                  <div className="p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryIcon iconName={iconName} color={color} bgColor={bgColor} size="md" />
                      <div>
                        <div className="text-sm font-bold text-[#1C1C1E] dark:text-white">
                          {name || 'اسم التصنيف'}
                        </div>
                        <div className="text-xs text-[#8E8E93]">
                          الميزانية المقترحة: {monthlyLimit || '0'} {currencySymbol}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold">
                      معاينة
                    </span>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      اسم التصنيف (مثل: حلويات ومقاهي، ملابس أطفال...)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                      }}
                      placeholder="اسم التصنيف..."
                      className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500/50"
                      autoFocus
                    />
                  </div>

                  {/* Monthly Budget Limit */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1">
                      الميزانية الشهرية المخصصة لهذا التصنيف ({currencySymbol})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={monthlyLimit}
                        onChange={(e) => {
                          setMonthlyLimit(e.target.value);
                          setError('');
                        }}
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-bold text-[#1C1C1E] dark:text-white outline-hidden focus:ring-2 focus:ring-blue-500/50 tabular-nums"
                      />
                      <span className="text-xs font-bold text-slate-500 shrink-0">{currencySymbol} شهرياً</span>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                      لون التصنيف
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((pal) => (
                        <button
                          key={pal.color}
                          type="button"
                          onClick={() => {
                            sound.playTap(soundEnabled);
                            setColor(pal.color);
                            setBgColor(pal.bgColor);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                            color === pal.color ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: pal.color }}
                        >
                          {color === pal.color && <Check size={14} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#636366] dark:text-[#AEAEB2] mb-1.5">
                      رمز وأيقونة التصنيف
                    </label>
                    <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl no-scrollbar">
                      {iconKeys.map((k) => {
                        const isCurrent = iconName === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => {
                              sound.playTap(soundEnabled);
                              setIconName(k);
                            }}
                            className={`p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <CategoryIcon iconName={k} color={isCurrent ? '#ffffff' : color} size="sm" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
                    >
                      <Check size={16} strokeWidth={2.5} />
                      <span>{editingCategory ? 'حفظ التعديلات' : 'إنشاء التصنيف'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 h-11 rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                /* List of All Categories with Edit/Delete */
                <div className="space-y-2">
                  <div className="text-xs text-[#8E8E93] px-1 flex items-center justify-between">
                    <span>جميع تصنيفات مصاريف البيت ({categories.length})</span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">انقر للتعديل أو تغيير الميزانية</span>
                  </div>

                  <div className="bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#3A3A3C]">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="p-3 flex items-center justify-between hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="flex items-center gap-3 flex-1 text-right cursor-pointer"
                        >
                          <CategoryIcon iconName={cat.icon} color={cat.color} bgColor={cat.bgColor} size="md" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#1C1C1E] dark:text-white">
                                {cat.name}
                              </span>
                              {cat.isCustom && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-0.5">
                                  <Sparkles size={10} /> مخصص
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#8E8E93] tabular-nums">
                              الميزانية المحددة: {cat.monthlyLimit.toLocaleString('ar-SA')} {currencySymbol}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                          >
                            تعديل
                          </button>
                          {cat.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                              title="حذف التصنيف"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Category Button */}
                  <button
                    type="button"
                    onClick={startCreate}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all mt-3"
                  >
                    <Plus size={16} />
                    <span>إضافة تصنيف جديد لمصاريف المنزل</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
