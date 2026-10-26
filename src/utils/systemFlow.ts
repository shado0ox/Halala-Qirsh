/**
 * Global tracker for active iOS native system UI flows.
 * Prevents the app from falsely re-locking when native system dialogs
 * (Biometrics prompt, Share Sheet, file picker, notification permission prompt)
 * trigger an appStateChange inactive/active transition.
 */

let systemFlowCount = 0;

export function startSystemFlow(): void {
  systemFlowCount++;
}

export function endSystemFlow(gracePeriodMs: number = 1000): void {
  setTimeout(() => {
    systemFlowCount = Math.max(0, systemFlowCount - 1);
  }, gracePeriodMs);
}

export function isSystemFlowActive(): boolean {
  return systemFlowCount > 0;
}

export async function withSystemFlow<T>(fn: () => Promise<T>, gracePeriodMs: number = 1000): Promise<T> {
  systemFlowCount++;
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      systemFlowCount = Math.max(0, systemFlowCount - 1);
    }, gracePeriodMs);
  }
}
