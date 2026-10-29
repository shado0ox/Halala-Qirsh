import { describe, it, expect } from 'vitest';
import { shouldLockOnResume } from '../autoLock';

describe('shouldLockOnResume', () => {
  // (1) يقفل فوراً بعد رحلة خلفية حقيقية مع timeout 0
  it('locks immediately after a real background trip with timeout 0', () => {
    const backgroundedAt = 1000000;
    const now = 1000100; // 100ms later
    const result = shouldLockOnResume({
      passcodeEnabled: true,
      systemFlowActive: false,
      backgroundedAt,
      now,
      timeoutSec: 0,
    });
    expect(result).toBe(true);
  });

  // (2) لا يقفل لو backgroundedAt = 0
  it('does not lock if backgroundedAt = 0 (never really went to background)', () => {
    const result = shouldLockOnResume({
      passcodeEnabled: true,
      systemFlowActive: false,
      backgroundedAt: 0,
      now: 1000500,
      timeoutSec: 0,
    });
    expect(result).toBe(false);
  });

  // (3) يحترم timeout 30: لا يقفل عند 29 ثانية ويقفل عند 30
  it('respects timeout 30: does not lock at 29 seconds, locks at 30 seconds', () => {
    const backgroundedAt = 1000000;
    const at29Sec = backgroundedAt + 29 * 1000;
    const at30Sec = backgroundedAt + 30 * 1000;

    const result29 = shouldLockOnResume({
      passcodeEnabled: true,
      systemFlowActive: false,
      backgroundedAt,
      now: at29Sec,
      timeoutSec: 30,
    });
    expect(result29).toBe(false);

    const result30 = shouldLockOnResume({
      passcodeEnabled: true,
      systemFlowActive: false,
      backgroundedAt,
      now: at30Sec,
      timeoutSec: 30,
    });
    expect(result30).toBe(true);
  });

  // (4) لا يقفل لو passcodeEnabled false أو systemFlowActive true
  it('does not lock if passcodeEnabled is false or systemFlowActive is true', () => {
    const backgroundedAt = 1000000;
    const now = 1050000; // 50s later

    const resultDisabled = shouldLockOnResume({
      passcodeEnabled: false,
      systemFlowActive: false,
      backgroundedAt,
      now,
      timeoutSec: 0,
    });
    expect(resultDisabled).toBe(false);

    const resultFlowActive = shouldLockOnResume({
      passcodeEnabled: true,
      systemFlowActive: true,
      backgroundedAt,
      now,
      timeoutSec: 0,
    });
    expect(resultFlowActive).toBe(false);
  });
});
