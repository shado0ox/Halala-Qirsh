/**
 * Decides whether the app must lock when it returns to the foreground.
 * Inputs come from the native `pause` / `resume` events (real background <-> foreground),
 * NOT from appStateChange, because the Face ID sheet also triggers inactive -> active.
 */
export function shouldLockOnResume(opts: {
  passcodeEnabled: boolean;
  systemFlowActive: boolean;
  backgroundedAt: number; // ms timestamp of the last `pause`, 0 if unknown
  now: number;
  timeoutSec: number; // 0 = immediately
}): boolean {
  const { passcodeEnabled, systemFlowActive, backgroundedAt, now, timeoutSec } = opts;
  if (!passcodeEnabled || systemFlowActive) return false;
  if (backgroundedAt <= 0) return false; // never really went to background
  return (now - backgroundedAt) / 1000 >= timeoutSec;
}
