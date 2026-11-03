/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Category, Expense, RecurringBill, DetectedSubscription, AppData } from '../../types';
import { getDefaultAppData } from '../storage';

describe('Category Cascading Deletion Unit Tests', () => {
  it('migrates expenses, recurring bills, and subscriptions to fallback category when category is deleted', () => {
    const catToDelete: Category = {
      id: 'custom-cat-gym',
      name: 'نادي رياضي',
      nameEn: 'Gym',
      icon: 'Dumbbell',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      monthlyLimit: 300,
      isCustom: true,
    };

    const fallbackCat: Category = {
      id: 'food',
      name: 'طعام ومطاعم',
      nameEn: 'Food & Dining',
      icon: 'Utensils',
      color: '#10B981',
      bgColor: '#D1FAE5',
      monthlyLimit: 1500,
    };

    const expense: Expense = {
      id: 'exp-1',
      title: 'اشتراك شهري بالجيم',
      amount: 250,
      categoryId: 'custom-cat-gym',
      date: '2026-11-01',
      paymentMethod: 'card',
      payer: 'الزوج',
      createdAt: Date.now(),
    };

    const bill: RecurringBill = {
      id: 'bill-1',
      title: 'فاتورة النادي',
      amount: 250,
      dueDay: 5,
      categoryId: 'custom-cat-gym',
      isPaid: false,
    };

    const subscription: DetectedSubscription = {
      id: 'sub-1',
      merchant: 'Fitness Time',
      normalizedMerchant: 'fitnesstime',
      typicalAmount: 250,
      frequency: 'monthly',
      detectedFrequency: 'monthly',
      lastChargeDate: '2026-10-01',
      nextExpectedRenewalDate: '2026-11-01',
      status: 'confirmed',
      categoryId: 'custom-cat-gym',
    };

    const initialData: AppData = {
      ...getDefaultAppData(),
      categories: [catToDelete, fallbackCat],
      expenses: [expense],
      bills: [bill],
      groceries: [],
      subscriptions: [subscription],
      jamiyyas: [],
    };

    // Simulate cascading deletion logic
    const categoryIdToDelete = 'custom-cat-gym';
    const remainingCategories = initialData.categories.filter((c) => c.id !== categoryIdToDelete);
    const fallbackCatId = remainingCategories[0]?.id || 'food';

    const updatedData: AppData = {
      ...initialData,
      categories: remainingCategories,
      expenses: initialData.expenses.map((e) =>
        e.categoryId === categoryIdToDelete ? { ...e, categoryId: fallbackCatId } : e
      ),
      bills: (initialData.bills || []).map((b) =>
        b.categoryId === categoryIdToDelete ? { ...b, categoryId: fallbackCatId } : b
      ),
      subscriptions: (initialData.subscriptions || []).map((s) =>
        s.categoryId === categoryIdToDelete ? { ...s, categoryId: fallbackCatId } : s
      ),
    };

    // Assertions
    expect(updatedData.categories.find((c) => c.id === 'custom-cat-gym')).toBeUndefined();
    expect(updatedData.categories).toHaveLength(1);
    expect(updatedData.categories[0].id).toBe('food');

    // Expense category migrated
    expect(updatedData.expenses[0].categoryId).toBe('food');

    // Bill category migrated (no dangling ID)
    expect(updatedData.bills[0].categoryId).toBe('food');

    // Subscription category migrated (no dangling ID)
    expect(updatedData.subscriptions![0].categoryId).toBe('food');
  });
});
