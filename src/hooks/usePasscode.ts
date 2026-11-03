/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { BudgetSettings } from '../types';
import { SecurityService } from '../utils/security';
import { isSystemFlowActive } from '../utils/systemFlow';
import { shouldLockOnResume } from '../utils/autoLock';
import { loadAppData } from '../utils/storage';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export type PasscodeModalMode = 'set' | 'change' | 'verify' | null;

interface UsePasscodeProps {
  settings: BudgetSettings;
  onUpdateSettings: (newSettings: Partial<BudgetSettings>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  onAppForeground?: () => void;
}

export function usePasscode({
  settings,
  onUpdateSettings,
  showToast,
  setConfirmDialog,
  onAppForeground,
}: UsePasscodeProps) {
  // Synchronously initialize isLocked to prevent financial data flash at startup
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const initial = loadAppData();
    return Boolean(initial?.settings?.isPasscodeEnabled);
  });
  const [passcodeModalMode, setPasscodeModalMode] = useState<PasscodeModalMode>(null);
  const [verifyConfig, setVerifyConfig] = useState<{ title?: string; subtitle?: string }>({});
  const onVerifySuccessRef = useRef<(() => void) | null>(null);

  const [isAppInactive, setIsAppInactive] = useState<boolean>(false);
  const [isSplashActive, setIsSplashActive] = useState<boolean>(true);

  const isLockedRef = useRef<boolean>(isLocked);
  isLockedRef.current = isLocked;
  const backgroundTimestampRef = useRef<number>(0);
  const onAppForegroundRef = useRef(onAppForeground);
  onAppForegroundRef.current = onAppForeground;

  // App state changes
  useEffect(() => {
    const listenerPromise = CapApp.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        setIsAppInactive(true);
      } else {
        setIsAppInactive(false);
        onAppForegroundRef.current?.();
      }
    });

    const pausePromise = CapApp.addListener('pause', () => {
      backgroundTimestampRef.current = Date.now();
    });
    const resumePromise = CapApp.addListener('resume', () => {
      const backgroundedAt = backgroundTimestampRef.current;
      backgroundTimestampRef.current = 0;
      if (
        shouldLockOnResume({
          passcodeEnabled: Boolean(settings.isPasscodeEnabled),
          systemFlowActive: isSystemFlowActive(),
          backgroundedAt,
          now: Date.now(),
          timeoutSec: settings.autoLockTimeout ?? 30,
        })
      ) {
        setIsLocked(true);
      }
    });

    return () => {
      listenerPromise.then((h) => h.remove()).catch(() => {});
      pausePromise.then((h) => h.remove()).catch(() => {});
      resumePromise.then((h) => h.remove()).catch(() => {});
    };
  }, [settings.isPasscodeEnabled, settings.autoLockTimeout]);

  /**
   * Request biometric or passcode security verification before executing a sensitive action
   */
  const requestSecurityVerification = useCallback(
    (title: string, subtitle: string, onVerified: () => void) => {
      setVerifyConfig({ title, subtitle });
      onVerifySuccessRef.current = onVerified;
      setPasscodeModalMode('verify');
    },
    []
  );

  const handlePasscodeSuccess = useCallback(
    (_newPin?: string) => {
      if (isLocked) {
        setIsLocked(false);
      } else if (passcodeModalMode === 'verify') {
        const action = onVerifySuccessRef.current;
        onVerifySuccessRef.current = null;
        setPasscodeModalMode(null);
        if (action) {
          action();
        }
      } else if (passcodeModalMode === 'change') {
        setPasscodeModalMode(null);
        showToast(
          settings.language === 'en'
            ? 'Passcode updated successfully'
            : 'تم تغيير رمز الدخول بنجاح'
        );
      } else if (passcodeModalMode === 'set') {
        onUpdateSettings({ isPasscodeEnabled: true });
        setPasscodeModalMode(null);
        showToast(settings.language === 'en' ? 'Passcode enabled' : 'تم تفعيل رمز الدخول بنجاح');
      }
    },
    [isLocked, passcodeModalMode, onUpdateSettings, settings.language, showToast]
  );

  const handleDisablePasscode = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: settings.language === 'en' ? 'Remove Passcode' : 'إلغاء رمز الدخول',
      message:
        settings.language === 'en'
          ? 'Are you sure you want to disable passcode security for this app?'
          : 'هل أنت متأكد من تعطيل قفل الرمز السري للتطبيق؟',
      isDestructive: true,
      onConfirm: () => {
        setConfirmDialog((c) => ({ ...c, isOpen: false }));
        // Require Face ID or Passcode verification before removing passcode!
        requestSecurityVerification(
          settings.language === 'en' ? 'Confirm Passcode Removal' : 'تأكيد إلغاء رمز الدخول',
          settings.language === 'en'
            ? 'Verify your identity to disable passcode security'
            : 'أثبت هويتك أولاً لتأكيد إلغاء حماية رمز الدخول',
          async () => {
            await SecurityService.removePasscode();
            onUpdateSettings({ isPasscodeEnabled: false });
            showToast(settings.language === 'en' ? 'Passcode removed' : 'تم إلغاء رمز الدخول');
          }
        );
      },
    });
  }, [setConfirmDialog, settings.language, requestSecurityVerification, onUpdateSettings, showToast]);

  return {
    isLocked,
    setIsLocked,
    isLockedRef,
    passcodeModalMode,
    setPasscodeModalMode,
    verifyConfig,
    requestSecurityVerification,
    isAppInactive,
    setIsAppInactive,
    isSplashActive,
    setIsSplashActive,
    backgroundTimestampRef,
    handlePasscodeSuccess,
    handleDisablePasscode,
  };
}
