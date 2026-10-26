import { describe, it, expect } from 'vitest';
import { clampDayToMonth, computeUpcomingBillTriggers } from '../nativeNotifications';

describe('Bill Reminders Date Helper Tests', () => {
  describe('clampDayToMonth', () => {
    it('clamps day 31 in non-leap February (2026) to 28', () => {
      // monthIndex 1 = February
      const clamped = clampDayToMonth(2026, 1, 31);
      expect(clamped).toBe(28);
    });

    it('clamps day 31 in leap year February (2024) to 29', () => {
      const clamped = clampDayToMonth(2024, 1, 31);
      expect(clamped).toBe(29);
    });

    it('clamps day 31 in April (monthIndex 3) to 30', () => {
      const clamped = clampDayToMonth(2026, 3, 31);
      expect(clamped).toBe(30);
    });

    it('preserves valid day 15 in March', () => {
      const clamped = clampDayToMonth(2026, 2, 15);
      expect(clamped).toBe(15);
    });

    it('clamps negative or zero day to 1', () => {
      expect(clampDayToMonth(2026, 0, 0)).toBe(1);
      expect(clampDayToMonth(2026, 0, -5)).toBe(1);
    });
  });

  describe('computeUpcomingBillTriggers', () => {
    it('computes upcoming triggers when due day is today but trigger has passed', () => {
      // Current date is 15th at 12:00 PM; due day 15 with 2 lead days (trigger was 13th)
      const now = new Date(2026, 4, 15, 12, 0, 0); // May 15, 2026
      const triggers = computeUpcomingBillTriggers(15, 2, now, 3);

      expect(triggers.length).toBe(3);
      // First upcoming trigger must be for next month (June)
      expect(triggers[0].dueDate.getMonth()).toBe(5); // June
      expect(triggers[0].dueDate.getDate()).toBe(15);
      expect(triggers[0].triggerDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('computes future trigger in current month when lead days allow it', () => {
      // Current date is May 2nd; due day is May 20th with 3 lead days (trigger is May 17th)
      const now = new Date(2026, 4, 2, 10, 0, 0);
      const triggers = computeUpcomingBillTriggers(20, 3, now, 3);

      expect(triggers.length).toBe(3);
      expect(triggers[0].dueDate.getMonth()).toBe(4); // May
      expect(triggers[0].dueDate.getDate()).toBe(20);
      expect(triggers[0].triggerDate.getDate()).toBe(17);
      expect(triggers[0].triggerDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('handles lead days longer than days left in the month', () => {
      // Current date is Jan 28; due day is 2nd of each month with 7 lead days
      // For February 2nd, trigger would be Jan 26 (already passed relative to Jan 28)
      // So upcoming trigger will roll to March 2nd (trigger Feb 23)
      const now = new Date(2026, 0, 28, 14, 0, 0);
      const triggers = computeUpcomingBillTriggers(2, 7, now, 3);

      expect(triggers.length).toBe(3);
      for (const t of triggers) {
        expect(t.triggerDate.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });
});
