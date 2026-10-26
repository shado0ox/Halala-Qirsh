import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Lock, Delete, ScanFace, Fingerprint, AlertCircle } from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';
import { SecurityService, BiometryStatus } from '../utils/security';

interface PasscodeLockModalProps {
  isOpen: boolean;
  mode: 'unlock' | 'set' | 'change';
  onSuccess: (newPasscode?: string) => void;
  onCancel?: () => void;
  isDark?: boolean;
  soundEnabled?: boolean;
  isEnglish?: boolean;
}

export const PasscodeLockModal: React.FC<PasscodeLockModalProps> = ({
  isOpen,
  mode,
  onSuccess,
  onCancel,
  soundEnabled = true,
  isEnglish = false,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [firstEnteredPin, setFirstEnteredPin] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [biometry, setBiometry] = useState<BiometryStatus>({ isAvailable: false, biometryType: 'none' });
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Tracks if the automatic biometric prompt has already run for this presentation
  const hasAutoPromptedRef = useRef<boolean>(false);

  // Reset auto-prompt flag whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoPromptedRef.current = false;
      setEnteredPin('');
      setFirstEnteredPin('');
      setIsConfirming(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  // Check biometric availability and existing lockout on modal mount
  useEffect(() => {
    if (!isOpen) return;

    SecurityService.checkBiometrics().then(setBiometry);

    SecurityService.getLockoutRemainingSeconds().then((secs) => {
      setLockoutSeconds(secs);
    });
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Trigger real native biometric authentication
  const handleRealBiometricAuth = useCallback(async () => {
    if (lockoutSeconds > 0 || isVerifying) return;
    setIsVerifying(true);
    nativeHaptics.tap(soundEnabled);
    const reason = isEnglish ? 'Authenticate to unlock Home Expenses' : 'المصادقة لفتح تطبيق مصاريف البيت';
    const cancelTitle = isEnglish ? 'Cancel' : 'إلغاء';
    const success = await SecurityService.authenticateBiometric(reason, cancelTitle);
    setIsVerifying(false);

    if (success) {
      nativeHaptics.success(soundEnabled);
      setEnteredPin('');
      onSuccess();
    }
  }, [lockoutSeconds, isVerifying, soundEnabled, isEnglish, onSuccess]);

  // Auto-prompt biometric ONCE per time the lock screen appears
  useEffect(() => {
    if (
      isOpen &&
      mode === 'unlock' &&
      biometry.isAvailable &&
      lockoutSeconds === 0 &&
      !hasAutoPromptedRef.current
    ) {
      hasAutoPromptedRef.current = true;
      handleRealBiometricAuth();
    }
  }, [isOpen, mode, biometry.isAvailable, lockoutSeconds, handleRealBiometricAuth]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    nativeHaptics.error(soundEnabled);
    setErrorShake(true);
    setErrorMessage(msg);
    setTimeout(() => {
      setEnteredPin('');
      setErrorShake(false);
    }, 500);
  };

  const handleKeyPress = async (digit: string) => {
    if (lockoutSeconds > 0 || isVerifying || enteredPin.length >= 4) return;
    nativeHaptics.tap(soundEnabled);
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setErrorMessage('');

    if (newPin.length === 4) {
      setIsVerifying(true);
      if (mode === 'unlock') {
        const isMatch = await SecurityService.verifyPasscode(newPin);
        setIsVerifying(false);
        if (isMatch) {
          nativeHaptics.success(soundEnabled);
          setEnteredPin('');
          onSuccess();
        } else {
          const remainingSecs = await SecurityService.getLockoutRemainingSeconds();
          if (remainingSecs > 0) {
            setLockoutSeconds(remainingSecs);
            triggerError(
              isEnglish
                ? `Too many failed attempts. Locked for ${remainingSecs}s`
                : `محاولات خاطئة متكررة. تم القفل لمدة ${remainingSecs} ثانية`
            );
          } else {
            triggerError(isEnglish ? 'Incorrect Passcode' : 'رمز الدخول غير صحيح');
          }
        }
      } else if (mode === 'set' || mode === 'change') {
        setIsVerifying(false);
        if (!isConfirming) {
          nativeHaptics.tap(soundEnabled);
          setFirstEnteredPin(newPin);
          setEnteredPin('');
          setIsConfirming(true);
        } else {
          if (newPin === firstEnteredPin) {
            await SecurityService.setPasscode(newPin);
            nativeHaptics.success(soundEnabled);
            onSuccess(newPin);
            setEnteredPin('');
            setFirstEnteredPin('');
            setIsConfirming(false);
          } else {
            triggerError(isEnglish ? 'Passcodes do not match' : 'الرمزان غير متطابقين، أعد المحاولة');
            setIsConfirming(false);
            setFirstEnteredPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds > 0 || isVerifying) return;
    nativeHaptics.tap(soundEnabled);
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const keypadNumbers = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* Top Lock Icon */}
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white mb-4 shadow-lg border border-white/20">
          <Lock size={26} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white mb-1">
          {mode === 'unlock'
            ? isEnglish ? 'Enter Passcode' : 'أدخل رمز الدخول'
            : isConfirming
            ? isEnglish ? 'Confirm Passcode' : 'تأكيد الرمز السري'
            : isEnglish ? 'Create 4-Digit Passcode' : 'تعيين رمز سري جديد'}
        </h2>

        {/* Lockout banner or subtitle */}
        {lockoutSeconds > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold mb-6 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
            <AlertCircle size={14} />
            <span>
              {isEnglish
                ? `Locked. Try again in ${lockoutSeconds}s`
                : `مغلق مؤقتاً. حاول ثانية بعد ${lockoutSeconds} ثانية`}
            </span>
          </div>
        ) : (
          <p className="text-xs text-white/70 mb-6">
            {errorMessage ||
              (mode === 'unlock'
                ? isEnglish ? 'Personal expense & budget data' : 'حماية بيانات مصاريف البيت وميزانيتك'
                : isConfirming
                ? isEnglish ? 'Re-enter your 4 digits' : 'أعد إدخال الرمز المكون من 4 أرقام'
                : isEnglish ? 'Enter 4 digits to lock app' : 'اختر 4 أرقام لقفل التطبيق')}
          </p>
        )}

        {/* 4 Pin Dots */}
        <motion.div
          animate={errorShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4 mb-8"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  isFilled
                    ? 'bg-white border-white scale-110 shadow-sm'
                    : 'bg-transparent border-white/50'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full px-2 mb-4">
          {keypadNumbers.map(({ num, letters }) => (
            <button
              key={num}
              type="button"
              disabled={lockoutSeconds > 0}
              onClick={() => handleKeyPress(num)}
              className="w-18 h-18 mx-auto rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 disabled:opacity-30 disabled:pointer-events-none text-white flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-md border border-white/10"
            >
              <span className="text-2xl font-semibold leading-none">{num}</span>
              {letters && <span className="text-[9px] tracking-widest text-white/60 mt-0.5">{letters}</span>}
            </button>
          ))}

          {/* Bottom Left: Real Biometric Trigger (only if available) */}
          <div className="flex items-center justify-center">
            {mode === 'unlock' && biometry.isAvailable && lockoutSeconds === 0 ? (
              <button
                type="button"
                onClick={handleRealBiometricAuth}
                className="w-18 h-18 rounded-full flex flex-col items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer active:scale-90"
                title={biometry.biometryType === 'touchId' ? 'Touch ID' : 'Face ID'}
              >
                {biometry.biometryType === 'touchId' ? <Fingerprint size={28} /> : <ScanFace size={28} />}
                <span className="text-[10px] mt-1 font-medium">
                  {biometry.biometryType === 'touchId' ? 'Touch ID' : 'Face ID'}
                </span>
              </button>
            ) : null}
          </div>

          {/* Zero Button */}
          <button
            type="button"
            disabled={lockoutSeconds > 0}
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 mx-auto rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 disabled:opacity-30 disabled:pointer-events-none text-white flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer backdrop-blur-md border border-white/10"
          >
            <span className="text-2xl font-semibold leading-none">0</span>
          </button>

          {/* Bottom Right: Delete or Cancel */}
          <div className="flex items-center justify-center">
            {enteredPin.length > 0 ? (
              <button
                type="button"
                disabled={lockoutSeconds > 0}
                onClick={handleDelete}
                className="w-18 h-18 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
              >
                <Delete size={24} />
              </button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
              >
                {isEnglish ? 'Cancel' : 'إلغاء'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
