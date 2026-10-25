import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { sound } from './audio';

class NativeHapticsController {
  private isCapacitor(): boolean {
    return typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
  }

  // Light tap for tabs, keypresses
  async tap(soundEnabled: boolean = true) {
    if (this.isCapacitor()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Fallback
      }
    }
    sound.playTap(soundEnabled);
  }

  // Medium impact for button confirmations, toggles
  async medium(soundEnabled: boolean = true) {
    if (this.isCapacitor()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {
        // Fallback
      }
    }
    sound.playTap(soundEnabled);
  }

  // Success notification for saving an expense or paying a bill
  async success(soundEnabled: boolean = true) {
    if (this.isCapacitor()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {
        // Fallback
      }
    }
    sound.playSuccess(soundEnabled);
  }

  // Warning or deletion
  async warning(soundEnabled: boolean = true) {
    if (this.isCapacitor()) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch {
        // Fallback
      }
    }
    sound.playDelete(soundEnabled);
  }

  // Error vibration
  async error(soundEnabled: boolean = true) {
    if (this.isCapacitor()) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch {
        // Fallback
      }
    }
    sound.playDelete(soundEnabled);
  }
}

export const nativeHaptics = new NativeHapticsController();
