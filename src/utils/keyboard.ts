import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';
import { nativeHaptics } from './nativeHaptics';

/**
 * Checks if a form input, textarea, or editable element is currently focused.
 */
export function isKeyboardActive(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName ? active.tagName.toLowerCase() : '';
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    active.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Dismisses the virtual keyboard by blurring the active element and calling Capacitor Keyboard.hide().
 */
export async function dismissKeyboard(): Promise<boolean> {
  const wasActive = isKeyboardActive();
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (Capacitor.isNativePlatform()) {
    try {
      await Keyboard.hide();
    } catch {
      // Ignore in non-supported native environments
    }
  }
  return wasActive;
}

/**
 * Safely handles backdrop clicks on modals & sheets:
 * If the keyboard is currently active, dismissing it without closing the sheet.
 * If the keyboard is not active, executes the modal's onClose callback.
 */
export async function handleModalBackdropClick(
  e: React.MouseEvent,
  onClose: () => void,
  soundEnabled = true
): Promise<void> {
  e.stopPropagation();
  if (isKeyboardActive()) {
    nativeHaptics.tap(soundEnabled);
    await dismissKeyboard();
    return;
  }
  nativeHaptics.tap(soundEnabled);
  onClose();
}

/**
 * Hook to monitor keyboard/input focus state in React components.
 */
export function useKeyboardState() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(() => isKeyboardActive());

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      // Small timeout to allow next element to receive focus before deciding
      setTimeout(() => {
        setIsKeyboardOpen(isKeyboardActive());
      }, 50);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return {
    isKeyboardOpen,
    dismissKeyboard,
  };
}
