import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, ChevronDown } from 'lucide-react';
import { springs, fades } from '../../utils/motion';
import { handleModalBackdropClick, dismissKeyboard, useKeyboardState } from '../../utils/keyboard';
import { KeyboardDismissButton } from '../KeyboardDismissButton';
import { nativeHaptics } from '../../utils/nativeHaptics';

/* -------------------------------------------------------------------------- */
/*                                FormField                                   */
/* -------------------------------------------------------------------------- */

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className = '',
  badge,
}) => {
  return (
    <div className={`w-full min-w-0 box-border flex flex-col ${className}`}>
      {label && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label
            htmlFor={htmlFor}
            className="text-xs font-bold text-[#636366] dark:text-[#AEAEB2] truncate select-none"
          >
            {label}
            {required && <span className="text-red-500 ms-1" aria-hidden="true">*</span>}
          </label>
          {badge}
        </div>
      )}

      <div className="w-full min-w-0">{children}</div>

      {error ? (
        <p className="mt-1.5 text-[11px] font-bold text-red-500 flex items-center gap-1 leading-tight">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[#8E8E93] leading-tight truncate">{hint}</p>
      ) : null}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                TextInput                                   */
/* -------------------------------------------------------------------------- */

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  hasError?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ hasError = false, startIcon, endIcon, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full min-w-0 flex items-center">
        {startIcon && (
          <div className="absolute start-3.5 pointer-events-none text-[#8E8E93] flex items-center justify-center">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full min-w-0 min-h-[44px] h-11 sm:h-12 px-3.5 text-sm font-semibold rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] border transition-all outline-hidden box-border ${
            startIcon ? 'ps-10' : ''
          } ${endIcon ? 'pe-10' : ''} ${
            hasError
              ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-emerald-500/20'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {endIcon && (
          <div className="absolute end-3.5 pointer-events-none text-[#8E8E93] flex items-center justify-center">
            {endIcon}
          </div>
        )}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

/* -------------------------------------------------------------------------- */
/*                               AmountInput                                  */
/* -------------------------------------------------------------------------- */

export interface AmountInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  currencySymbol?: string;
  hasError?: boolean;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ currencySymbol = 'ر.س', hasError = false, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full min-w-0 flex items-center">
        <input
          ref={ref}
          type="number"
          step="any"
          inputMode="decimal"
          className={`w-full min-w-0 min-h-[44px] h-11 sm:h-12 ps-3.5 pe-16 text-base sm:text-lg font-black tracking-tight rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] border tabular-nums transition-all outline-hidden box-border ${
            hasError
              ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-emerald-500/20'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        <div className="absolute end-3 pointer-events-none px-2 py-1 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold text-[#5C8271] dark:text-[#8E8E93] select-none">
          {currencySymbol}
        </div>
      </div>
    );
  }
);
AmountInput.displayName = 'AmountInput';

/* -------------------------------------------------------------------------- */
/*                              SelectDropdown                                */
/* -------------------------------------------------------------------------- */

export interface SelectDropdownProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const SelectDropdown = forwardRef<HTMLSelectElement, SelectDropdownProps>(
  ({ hasError = false, children, className = '', ...props }, ref) => {
    return (
      <div className="relative w-full min-w-0 flex items-center">
        <select
          ref={ref}
          className={`w-full min-w-0 min-h-[44px] h-11 sm:h-12 ps-3.5 pe-10 text-sm font-semibold rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white border appearance-none cursor-pointer transition-all outline-hidden box-border ${
            hasError
              ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-emerald-500/20'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute end-3.5 pointer-events-none text-[#8E8E93] flex items-center justify-center">
          <ChevronDown size={18} />
        </div>
      </div>
    );
  }
);
SelectDropdown.displayName = 'SelectDropdown';

/* -------------------------------------------------------------------------- */
/*                               TextAreaInput                                */
/* -------------------------------------------------------------------------- */

export interface TextAreaInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
  ({ hasError = false, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full min-w-0 min-h-[88px] p-3.5 text-sm font-semibold rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] border transition-all outline-hidden box-border resize-y ${
          hasError
            ? 'border-red-400 dark:border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : 'border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-[#1C1C1E] focus:ring-2 focus:ring-emerald-500/20'
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
TextAreaInput.displayName = 'TextAreaInput';

/* -------------------------------------------------------------------------- */
/*                               ToggleSwitch                                 */
/* -------------------------------------------------------------------------- */

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) => {
  return (
    <label
      htmlFor={id}
      className={`w-full min-w-0 flex items-center justify-between p-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] gap-3 cursor-pointer select-none transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200/70 dark:hover:bg-[#3A3A3C]'
      }`}
    >
      <div className="flex-1 min-w-0">
        {label && (
          <span className="block text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white truncate">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-[11px] text-[#8E8E93] mt-0.5 truncate">
            {description}
          </span>
        )}
      </div>

      <div className="relative inline-flex items-center shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors relative ${
            checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
              checked ? 'translate-x-5.5 rtl:-translate-x-5.5' : 'translate-x-0.5 rtl:-translate-x-0.5'
            }`}
          />
        </div>
      </div>
    </label>
  );
};

/* -------------------------------------------------------------------------- */
/*                                FormButton                                  */
/* -------------------------------------------------------------------------- */

export interface FormButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  isLoading?: boolean;
  startIcon?: React.ReactNode;
}

export const FormButton = forwardRef<HTMLButtonElement, FormButtonProps>(
  (
    {
      variant = 'primary',
      isLoading = false,
      startIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    let variantStyles = '';

    switch (variant) {
      case 'primary':
        variantStyles =
          'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-md shadow-emerald-600/25 hover:brightness-105 active:scale-[0.98]';
        break;
      case 'secondary':
        variantStyles =
          'bg-slate-100 dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-[#3A3A3C] active:scale-[0.98]';
        break;
      case 'destructive':
        variantStyles =
          'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 active:scale-[0.98]';
        break;
      case 'ghost':
        variantStyles =
          'text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white active:scale-[0.98]';
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`min-h-[44px] h-11 sm:h-12 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all select-none box-border disabled:opacity-50 disabled:pointer-events-none ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          startIcon
        )}
        <span>{children}</span>
      </button>
    );
  }
);
FormButton.displayName = 'FormButton';

/* -------------------------------------------------------------------------- */
/*                                FormFooter                                  */
/* -------------------------------------------------------------------------- */

export interface FormFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const FormFooter: React.FC<FormFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full min-w-0 pt-3 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 ${className}`}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            FormModalWrapper                                */
/* -------------------------------------------------------------------------- */

export interface FormModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  soundEnabled?: boolean;
  isEnglish?: boolean;
  maxWidthClass?: string;
}

export const FormModalWrapper: React.FC<FormModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerAction,
  children,
  soundEnabled = true,
  isEnglish = false,
  maxWidthClass = 'max-w-lg',
}) => {
  const { isKeyboardOpen } = useKeyboardState();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none p-0 sm:p-4">
          {/* iOS Dimmed Backdrop (Dismisses keyboard first if open) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fades.fast}
            onClick={(e) => handleModalBackdropClick(e, onClose, soundEnabled)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Responsive Modal/Sheet Panel */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) {
                nativeHaptics.tap(soundEnabled);
                onClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springs.smooth}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!['input', 'button', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
                dismissKeyboard();
              }
            }}
            className={`relative w-full ${maxWidthClass} max-h-[88dvh] sm:max-h-[85dvh] bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border-t sm:border border-slate-200/50 dark:border-slate-800 box-border`}
          >
            {/* Grabber Handle for Mobile Sheet */}
            <div className="w-full flex sm:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 bg-[#C7C7CC] dark:bg-[#48484A] rounded-full" />
            </div>

            {/* Unified Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {icon && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-[#1C1C1E] dark:text-white truncate">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-[10px] sm:text-xs text-[#5C8271] dark:text-[#8E8E93] truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <KeyboardDismissButton
                  visible={isKeyboardOpen}
                  isEnglish={isEnglish}
                  soundEnabled={soundEnabled}
                />
                {headerAction}
                <button
                  type="button"
                  onClick={() => {
                    nativeHaptics.tap(soundEnabled);
                    onClose();
                  }}
                  className="w-8 h-8 min-h-[32px] rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer"
                  aria-label={isEnglish ? 'Close' : 'إغلاق'}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content with Safe Area Bottom Padding */}
            <div
              style={{ paddingBottom: 'calc(var(--sab) + 24px)' }}
              className="flex-1 w-full overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar box-border"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
