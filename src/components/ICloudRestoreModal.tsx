/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, CheckCircle, AlertTriangle, X, RefreshCw, Database } from 'lucide-react';
import { ICloudBackupMetadata } from '../utils/icloudSync';
import { nativeHaptics } from '../utils/nativeHaptics';
import { springs, fades, useMotionConfig } from '../utils/motion';

interface ICloudRestoreModalProps {
  isOpen: boolean;
  metadata?: ICloudBackupMetadata;
  isLoading?: boolean;
  isEn?: boolean;
  soundEnabled?: boolean;
  animations?: 'full' | 'reduced' | 'off';
  onConfirm: () => void;
  onClose: () => void;
}

export const ICloudRestoreModal: React.FC<ICloudRestoreModalProps> = ({
  isOpen,
  metadata,
  isLoading = false,
  isEn = false,
  soundEnabled = true,
  animations = 'full',
  onConfirm,
  onClose,
}) => {
  const motionConfig = useMotionConfig(animations);
  const isReduced = motionConfig.isReduced;

  if (!isOpen) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return isEn ? 'Unknown' : 'غير معروف';
    const d = new Date(timestamp);
    return d.toLocaleString(isEn ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    return `${Math.round(bytes / 1024 * 10) / 10} KB`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={isReduced ? { duration: 0.1 } : springs.smooth}
          className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <Cloud size={20} />
            </div>
            <button
              onClick={() => {
                nativeHaptics.tap(soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#8E8E93] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <h3 className="text-base font-black text-[#1C1C1E] dark:text-white">
              {isEn ? 'Restore from Apple iCloud' : 'استرجاع النسخة من Apple iCloud'}
            </h3>
            <p className="text-xs text-[#8E8E93] mt-1 leading-relaxed">
              {isEn
                ? 'Found a verified backup tied to your Apple ID. Restoring will replace local device data.'
                : 'تم العثور على نسخة احتياطية مؤكدة مربوطة بحساب Apple الخاص بك. الاسترجاع سيستبدل بيانات الجهاز بهذه النسخة.'}
            </p>
          </div>

          {/* Backup Details Card */}
          <div className="p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#8E8E93]">
              <span>{isEn ? 'Backup Date' : 'تاريخ النسخة'}</span>
              <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                {formatDate(metadata?.timestamp)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#8E8E93]">
              <span>{isEn ? 'Expenses count' : 'عدد المصاريف'}</span>
              <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                {metadata?.expenseCount ?? 0} {isEn ? 'items' : 'مصروف'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#8E8E93]">
              <span>{isEn ? 'Categories count' : 'عدد التصنيفات'}</span>
              <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                {metadata?.categoriesCount ?? 0} {isEn ? 'categories' : 'تصنيفات'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#8E8E93]">
              <span>{isEn ? 'Cloud Size' : 'حجم النسخة'}</span>
              <span className="font-bold text-[#1C1C1E] dark:text-white tabular-nums">
                {formatSize(metadata?.sizeBytes)}
              </span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              {isEn
                ? 'This action will overwrite any recent changes made offline on this device.'
                : 'سيتم استبدال أي تعديلات محلية غير محفوظة بالبيانات المسترجعة من iCloud.'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                nativeHaptics.tap(soundEnabled);
                onClose();
              }}
              className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                nativeHaptics.success(soundEnabled);
                onConfirm();
              }}
              className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              <span>{isEn ? 'Confirm Restore' : 'تأكيد الاسترجاع'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
