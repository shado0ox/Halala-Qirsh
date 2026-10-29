import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncQuickCategories,
  readPendingQuickExpenses,
  ackQuickExpenses,
} from '../quickExpenseQueue';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Category } from '../../types';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

const mockCategories: Category[] = [
  {
    id: 'food',
    name: 'البقالة والسوبرماركت',
    nameEn: 'Groceries & Food',
    icon: 'ShoppingCart',
    color: '#10B981',
    bgColor: '#ECFDF5',
    monthlyLimit: 2500,
  },
  {
    id: 'bills',
    name: 'فواتير وخدمات المنزل',
    nameEn: 'Utilities & Bills',
    icon: 'Zap',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    monthlyLimit: 900,
  },
];

describe('quickExpenseQueue Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncQuickCategories', () => {
    it('returns immediately without writing on web platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await syncQuickCategories(mockCategories, 'ar');

      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('saves category IDs and Arabic names on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await syncQuickCategories(mockCategories, 'ar');

      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'quickCategories',
        value: JSON.stringify([
          { id: 'food', name: 'البقالة والسوبرماركت' },
          { id: 'bills', name: 'فواتير وخدمات المنزل' },
        ]),
      });
    });

    it('saves category IDs and English names when language is en', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      await syncQuickCategories(mockCategories, 'en');

      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'quickCategories',
        value: JSON.stringify([
          { id: 'food', name: 'Groceries & Food' },
          { id: 'bills', name: 'Utilities & Bills' },
        ]),
      });
    });
  });

  describe('readPendingQuickExpenses', () => {
    it('returns empty array on web platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const items = await readPendingQuickExpenses();
      expect(items).toEqual([]);
      expect(Preferences.get).not.toHaveBeenCalled();
    });

    it('handles corrupted JSON safely without throwing and without clearing the queue', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Preferences.get).mockResolvedValue({ value: 'invalid-json{{{' });

      const items = await readPendingQuickExpenses();

      expect(items).toEqual([]);
      // Crucial: corrupted JSON must not wipe out the store
      expect(Preferences.set).not.toHaveBeenCalled();
    });

    it('handles non-array JSON value safely', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Preferences.get).mockResolvedValue({ value: '{"not": "an array"}' });

      const items = await readPendingQuickExpenses();
      expect(items).toEqual([]);
    });

    it('filters out invalid items and keeps valid expenses', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const rawQueue = [
        // Valid item
        {
          id: 'q-1',
          amount: 150.5,
          categoryId: 'food',
          date: '2026-10-29',
          note: 'سوبرماركت',
          createdAt: 1730000000,
        },
        // Invalid: amount <= 0
        {
          id: 'q-2',
          amount: 0,
          categoryId: 'food',
          date: '2026-10-29',
        },
        // Invalid: amount >= 1,000,000
        {
          id: 'q-3',
          amount: 1000000,
          categoryId: 'food',
          date: '2026-10-29',
        },
        // Invalid: missing categoryId
        {
          id: 'q-4',
          amount: 50,
          categoryId: '',
          date: '2026-10-29',
        },
        // Invalid: bad date format
        {
          id: 'q-5',
          amount: 75,
          categoryId: 'bills',
          date: '29-10-2026',
        },
        // Invalid: missing id
        {
          id: '',
          amount: 25,
          categoryId: 'food',
          date: '2026-10-29',
        },
      ];

      vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(rawQueue) });

      const result = await readPendingQuickExpenses();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-1');
      expect(result[0].amount).toBe(150.5);
      expect(result[0].categoryId).toBe('food');
    });
  });

  describe('ackQuickExpenses', () => {
    it('does nothing on web platform or empty list', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await ackQuickExpenses(['q-1']);
      expect(Preferences.get).not.toHaveBeenCalled();

      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      await ackQuickExpenses([]);
      expect(Preferences.get).not.toHaveBeenCalled();
    });

    it('removes only the specified acknowledged IDs and keeps remaining expenses', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const initialQueue = [
        { id: 'q-1', amount: 50, categoryId: 'food', date: '2026-10-29' },
        { id: 'q-2', amount: 120, categoryId: 'bills', date: '2026-10-29' },
        { id: 'q-3', amount: 300, categoryId: 'housing', date: '2026-10-29' },
      ];

      vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(initialQueue) });

      // Ack only q-1 and q-3
      await ackQuickExpenses(['q-1', 'q-3']);

      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'pendingExpenses',
        value: JSON.stringify([
          { id: 'q-2', amount: 120, categoryId: 'bills', date: '2026-10-29' },
        ]),
      });
    });
  });
});
