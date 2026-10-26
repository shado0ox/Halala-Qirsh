import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, ScanFace, Fingerprint, AlertCircle, CheckCircle2 } from 'lucide-react';
import { nativeHaptics } from '../utils/nativeHaptics';
import { SecurityService, BiometryStatus } from '../utils/security';
import { springs, fades } from '../utils/motion';

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
  const [isUnlockedSuccess, setIsUnlockedSuccess] = useState<boolean>(false);

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
      setIsUnlockedSuccess(false);
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
      setIsUnlockedSuccess(true);
      nativeHaptics.success(soundEnabled);
      setTimeout(() => {
        setEnteredPin('');
        onSuccess();
      }, 350);
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

  // Keypad numbers with iOS subtitles
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

  const triggerError = (msg: string) => {
    nativeHaptics.error(soundEnabled);
    setErrorShake(true);
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorShake(false);
      setEnteredPin('');
    }, 500);
  };

  const handleKeyPress = async (digit: string) => {
    if (lockoutSeconds > 0 || enteredPin.length >= 4) return;
    nativeHaptics.tap(soundEnabled);
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      if (mode === 'unlock') {
        const isMatch = await SecurityService.verifyPasscode(nextPin);
        if (isMatch) {
          setIsUnlockedSuccess(true);
          nativeHaptics.success(soundEnabled);
          setTimeout(() => {
            setEnteredPin('');
            onSuccess();
          }, 350);
        } else {
          const lockout = await SecurityService.getLockoutRemainingSeconds();
          if (lockout > 0) {
            setLockoutSeconds(lockout);
            triggerError(
              isEnglish
                ? `Too many attempts. Locked for ${lockout}s`
                : `محاولات خاطئة كثيرة. مقفل لمدة ${lockout} ثانية`
            );
          } else {
            triggerError(
              isEnglish
                ? 'Incorrect passcode'
                : 'رمز الدخول غير صحيح'
            );
          }
        }
      } else if (mode === 'set' || mode === 'change') {
        if (!isConfirming) {
          setFirstEnteredPin(nextPin);
          setEnteredPin('');
          setIsConfirming(true);
          setErrorMessage('');
        } else {
          if (nextPin === firstEnteredPin) {
            await SecurityService.setPasscode(nextPin);
            setIsUnlockedSuccess(true);
            nativeHaptics.success(soundEnabled);
            setTimeout(() => {
              setEnteredPin('');
              setFirstEnteredPin('');
              setIsConfirming(false);
              onSuccess(nextPin);
            }, 350);
          } else {
            triggerError(isEnglish ? 'Passcodes do not match' : 'الرمز غير متطابق. أعد المحاولة');
            setIsConfirming(false);
            setFirstEnteredPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      nativeHaptics.tap(soundEnabled);
      setEnteredPin((prev) => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center select-none bg-gradient-to-b from-[#064E3B] via-[#047857] to-black text-white px-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Animated App Icon or Success Morph */}
        <motion.div
          animate={isUnlockedSuccess ? { scale: [1, 1.25, 1], rotate: [0, 10, 0] } : { scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl mb-4 transition-colors duration-300 ${
            isUnlockedSuccess
              ? 'bg-emerald-400 text-emerald-950'
              : 'bg-white/20 text-white border border-white/20'
          }`}
        >
          {isUnlockedSuccess ? <CheckCircle2 size={34} /> : <Lock size={30} />}
        </motion.div>

        {/* Title */}
        <h2 className="text-xl font-black mb-1">
          {isUnlockedSuccess
            ? isEnglish ? 'Unlocked!' : 'تم التحقق بنجاح!'
            : mode === 'unlock'
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
          <p className="text-xs text-white/75 mb-6">
            {errorMessage ||
              (mode === 'unlock'
                ? isEnglish ? 'Personal expense & budget data' : 'حماية بيانات مصاريف البيت وميزانيتك'
                : isConfirming
                ? isEnglish ? 'Re-enter your 4 digits' : 'أعد إدخال الرمز المكون من 4 أرقام'
                : isEnglish ? 'Enter 4 digits to lock app' : 'اختر 4 أرقام لقفل التطبيق')}
          </p>
        )}

        {/* 4 Pin Dots with Spring Fill & Shake */}
        <motion.div
          animate={errorShake ? { x: [-14, 14, -10, 10, -5, 5, 0] } : {}}
          transition={{ duration: 0.42 }}
          className="flex items-center gap-4 mb-8"
        >
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <motion.div
                key={idx}
                animate={{
                  scale: isFilled ? 1.18 : 1,
                  backgroundColor: isUnlockedSuccess
                    ? '#34D399'
                    : isFilled
                    ? '#FFFFFF'
                    : 'transparent',
                }}
                transition={springs.bouncy}
                className={`w-4 h-4 rounded-full border-2 ${
                  isFilled ? 'border-white shadow-md' : 'border-white/40'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full px-2 mb-4">
          {keypadNumbers.map(({ num, letters }) => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.9 }}
              type="button"
              disabled={lockoutSeconds > 0 || isUnlockedSuccess}
              onClick={() => handleKeyPress(num)}
              className="w-18 h-18 mx-auto rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 disabled:opacity-30 disabled:pointer-events-none text-white flex flex-col items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-xs"
            >
              <span className="text-2xl font-bold leading-none">{num}</span>
              {letters && <span className="text-[9px] tracking-widest text-white/60 mt-0.5">{letters}</span>}
            </motion.button>
          ))}

          {/* Bottom Left: Real Biometric Trigger */}
          <div className="flex items-center justify-center">
            {mode === 'unlock' && biometry.isAvailable && lockoutSeconds === 0 ? (
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                onClick={handleRealBiometricAuth}
                className="w-18 h-18 rounded-full flex flex-col items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title={biometry.biometryType === 'touchId' ? 'Touch ID' : 'Face ID'}
              >
                {biometry.biometryType === 'touchId' ? <Fingerprint size={28} /> : <ScanFace size={28} />}
                <span className="text-[10px] mt-1 font-bold">
                  {biometry.biometryType === 'touchId' ? 'Touch ID' : 'Face ID'}
                </span>
              </motion.button>
            ) : null}
          </div>

          {/* Zero Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            disabled={lockoutSeconds > 0 || isUnlockedSuccess}
            onClick={() => handleKeyPress('0')}
            className="w-18 h-18 mx-auto rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 disabled:opacity-30 disabled:pointer-events-none text-white flex flex-col items-center justify-center transition-colors cursor-pointer border border-white/10 shadow-xs"
          >
            <span className="text-2xl font-bold leading-none">0</span>
          </motion.button>

          {/* Bottom Right: Delete or Cancel */}
          <div className="flex items-center justify-center">
            {enteredPin.length > 0 ? (
              <motion.button
                whileTap={{ scale: 0.88 }}
                type="button"
                disabled={lockoutSeconds > 0 || isUnlockedSuccess}
                onClick={handleDelete}
                className="w-18 h-18 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <Delete size={24} />
              </motion.button>
            ) : onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-bold text-white/80 hover:text-white cursor-pointer px-3 py-2"
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
