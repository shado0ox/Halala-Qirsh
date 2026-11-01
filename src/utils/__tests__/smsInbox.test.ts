import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readPendingSms,
  ackPendingSms,
  processPendingSms,
  PendingSmsItem,
} from '../smsInbox';
import { DEFAULT_CATEGORIES } from '../storage';

const nativeStore = new Map<string, string>();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(({ key }: { key: string }) =>
      Promise.resolve({ value: nativeStore.get(key) ?? null })
    ),
    set: vi.fn(({ key, value }: { key: string; value: string }) => {
      nativeStore.set(key, value);
      return Promise.resolve();
    }),
    remove: vi.fn(({ key }: { key: string }) => {
      nativeStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

describe('SMS Inbox Layer (smsInbox.ts)', () => {
  beforeEach(() => {
    nativeStore.clear();
  });

  describe('readPendingSms & ackPendingSms', () => {
    it('reads and validates well-formed pending SMS items', async () => {
      const items: PendingSmsItem[] = [
        { id: 'sms-1', text: 'شراء بـ 50 رس من بنده', createdAt: 1730000000 },
        { id: 'sms-2', text: 'شراء بـ 25 رس من ماكدونالدز', createdAt: 1730000060 },
      ];
      nativeStore.set('pendingSms', JSON.stringify(items));

      const result = await readPendingSms();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sms-1');
      expect(result[1].id).toBe('sms-2');
    });

    it('filters out invalid or oversized text items', async () => {
      const oversizedText = 'A'.repeat(4005);
      const mixed = [
        { id: 'valid-1', text: 'شراء بـ 100 رس', createdAt: 1730000000 },
        { id: '', text: 'No id', createdAt: 1730000000 },
        { id: 'invalid-oversized', text: oversizedText, createdAt: 1730000000 },
        { id: 'invalid-empty-text', text: '   ', createdAt: 1730000000 },
      ];
      nativeStore.set('pendingSms', JSON.stringify(mixed));

      const result = await readPendingSms();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('valid-1');
    });

    it('ackPendingSms removes only acknowledged IDs and preserves new incoming messages', async () => {
      const initial = [
        { id: 'sms-1', text: 'رسالة 1', createdAt: 100 },
        { id: 'sms-2', text: 'رسالة 2', createdAt: 200 },
        { id: 'sms-3', text: 'رسالة 3', createdAt: 300 },
      ];
      nativeStore.set('pendingSms', JSON.stringify(initial));

      await ackPendingSms(['sms-1', 'sms-3']);

      const remainingJson = nativeStore.get('pendingSms');
      const remaining = JSON.parse(remainingJson || '[]');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('sms-2');
    });
  });

  describe('processPendingSms', () => {
    it('deduplicates identical message texts in the same batch into ignoredIds', () => {
      const batch: PendingSmsItem[] = [
        { id: 'sms-copy-1', text: 'شراء بقيمة 150.00 ر.س لدى بنده بطاقة مدى', createdAt: 1000 },
        { id: 'sms-copy-2', text: 'شراء بقيمة 150.00 ر.س لدى بنده بطاقة مدى', createdAt: 1005 },
      ];

      const res = processPendingSms(batch, DEFAULT_CATEGORIES);
      expect(res.toAdd).toHaveLength(1);
      expect(res.ignoredIds).toContain('sms-copy-2');
    });

    it('ignores deposit and incoming transfer messages into ignoredIds', () => {
      const batch: PendingSmsItem[] = [
        { id: 'dep-1', text: 'إيداع راتب بمبلغ 12000.00 ر.س في حسابك لدى بنك الراجحي', createdAt: 1000 },
        { id: 'dep-2', text: 'حوالة واردة من فهد بمبلغ 500.00 ر.س', createdAt: 1005 },
      ];

      const res = processPendingSms(batch, DEFAULT_CATEGORIES);
      expect(res.toAdd).toHaveLength(0);
      expect(res.toReview).toHaveLength(0);
      expect(res.ignoredIds).toContain('dep-1');
      expect(res.ignoredIds).toContain('dep-2');
    });

    it('successfully extracts known merchant (Panda) and maps to food category via alias', () => {
      const batch: PendingSmsItem[] = [
        {
          id: 'sms-panda',
          text: 'شراء بـ 245.50 ر.س من بطاقة مدى لدى بنده فرع التخصصي بتاريخ 2026-10-30',
          createdAt: 1730000000,
        },
      ];

      const res = processPendingSms(batch, DEFAULT_CATEGORIES);
      expect(res.toAdd).toHaveLength(1);
      expect(res.toReview).toHaveLength(0);

      const added = res.toAdd[0];
      expect(added.amount).toBe(245.5);
      expect(added.categoryId).toBe('food'); // Mapped via groceries alias!
      expect(added.source).toBe('sms');
      expect(added.isAutoLogged).toBe(true);
      expect(added.payer).toBe('الزوج');
    });

    it('sends unknown merchant or unresolved category to toReview queue', () => {
      const batch: PendingSmsItem[] = [
        {
          id: 'sms-unknown',
          text: 'شراء بقيمة 89.00 ر.س من متجر مجهول غير مسجل XYZ99 بتاريخ 2026-10-30',
          createdAt: 1730000000,
        },
      ];

      const res = processPendingSms(batch, DEFAULT_CATEGORIES);
      expect(res.toAdd).toHaveLength(0);
      expect(res.toReview).toHaveLength(1);
      expect(res.toReview[0].id).toBe('sms-unknown');
      expect(res.toReview[0].text).toContain('متجر مجهول');
    });

    it('does NOT log SMS text or extracted amounts to console (privacy guarantee)', () => {
      const logSpy = vi.spyOn(console, 'log');
      const infoSpy = vi.spyOn(console, 'info');

      const batch: PendingSmsItem[] = [
        {
          id: 'sms-secret',
          text: 'شراء بقيمة 999.00 ر.س في متجر سري للغاية',
          createdAt: 1730000000,
        },
      ];

      processPendingSms(batch, DEFAULT_CATEGORIES);

      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('999'));
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('سري للغاية'));
      expect(infoSpy).not.toHaveBeenCalledWith(expect.stringContaining('999'));

      logSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });
});
