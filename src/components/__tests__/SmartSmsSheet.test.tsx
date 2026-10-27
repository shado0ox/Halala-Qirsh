import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartSmsSheet } from '../SmartSmsSheet';
import { Category } from '../../types';
import * as smsParser from '../../utils/smsParser';

// Mock native haptics
vi.mock('../../utils/nativeHaptics', () => ({
  nativeHaptics: {
    tap: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

// Mock Capacitor Clipboard
vi.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    read: vi.fn().mockResolvedValue({ value: '' }),
    write: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockCategories: Category[] = [
  {
    id: 'food',
    name: 'طعام ومشتريات',
    nameEn: 'Food & Groceries',
    icon: 'ShoppingBag',
    color: '#10B981',
    bgColor: '#E6F4EA',
    monthlyLimit: 2000,
    isCustom: false,
  },
  {
    id: 'cafe',
    name: 'كافيهات ومطاعم',
    nameEn: 'Cafes & Dining',
    icon: 'Coffee',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    monthlyLimit: 800,
    isCustom: false,
  },
];

describe('SmartSmsSheet Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('disables save button and displays "اختر تصنيفاً" when needsCategory is true, and does NOT call onSaveExpense', async () => {
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <SmartSmsSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="ar"
      />
    );

    // SMS from unknown merchant without keyword
    const unknownSms = 'شراء عبر مدى بمبلغ 120.50 رس لدى متجر الأفق الجديد بتاريخ 2026-05-10';
    const textarea = screen.getByPlaceholderText(/الصق الرسالة هنا/i);
    fireEvent.change(textarea, { target: { value: unknownSms } });

    // Click Parse
    const parseBtn = screen.getByRole('button', { name: /تحليل/i });
    fireEvent.click(parseBtn);

    // In preview mode: Merchant should be extracted as "متجر الأفق الجديد"
    expect(screen.getByDisplayValue('متجر الأفق الجديد')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120.5')).toBeInTheDocument();

    // The category container should have warning styling
    const categoryContainer = screen.getByTestId('category-picker-container');
    expect(categoryContainer.className).toContain('border-red-500');

    // The warning banner should be visible
    const warningBanner = screen.getByTestId('category-warning-banner');
    expect(warningBanner).toHaveTextContent('اختر تصنيفاً');

    // Save button must be disabled and have text "اختر تصنيفاً"
    const saveButton = screen.getByTestId('save-parsed-expense');
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent('اختر تصنيفاً');

    // Clicking the disabled button should NOT trigger onSaveExpense
    fireEvent.click(saveButton);
    expect(onSaveExpense).not.toHaveBeenCalled();

    // Now user clicks on a category button (Food)
    const foodCategoryBtn = screen.getByRole('button', { name: /طعام ومشتريات/i });
    fireEvent.click(foodCategoryBtn);

    // Button should now be ENABLED with text "حفظ المصروف المستخرج"
    expect(saveButton).not.toBeDisabled();
    expect(saveButton).toHaveTextContent('حفظ المصروف المستخرج');

    // Clicking save should successfully invoke onSaveExpense
    fireEvent.click(saveButton);
    expect(onSaveExpense).toHaveBeenCalledTimes(1);
    expect(onSaveExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'متجر الأفق الجديد',
        amount: 120.5,
        categoryId: 'food',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('supports English interface with "Choose a category" when categoryId is empty', async () => {
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <SmartSmsSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="en"
      />
    );

    const unknownSms = 'Purchase: SAR 95.00 at MysteryShop via Mada on 2026-05-10';
    const textarea = screen.getByPlaceholderText(/Paste SMS here/i);
    fireEvent.change(textarea, { target: { value: unknownSms } });

    const parseBtn = screen.getByRole('button', { name: /Parse/i });
    fireEvent.click(parseBtn);

    const saveButton = screen.getByTestId('save-parsed-expense');
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent('Choose a category');

    fireEvent.click(saveButton);
    expect(onSaveExpense).not.toHaveBeenCalled();
  });

  it('does NOT call saveLearnedRule if merchant is "عملية بنكية"', async () => {
    const saveRuleSpy = vi.spyOn(smsParser, 'saveLearnedRule');
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <SmartSmsSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="ar"
      />
    );

    // SMS with no merchant recognizable -> defaults to 'عملية بنكية'
    const genericSms = 'خصم 75.00 رس في 2026-05-10';
    const textarea = screen.getByPlaceholderText(/الصق الرسالة هنا/i);
    fireEvent.change(textarea, { target: { value: genericSms } });

    const parseBtn = screen.getByRole('button', { name: /تحليل/i });
    fireEvent.click(parseBtn);

    // Merchant defaults to 'عملية بنكية'
    expect(screen.getByDisplayValue('عملية بنكية')).toBeInTheDocument();

    // Select category
    const foodCategoryBtn = screen.getByRole('button', { name: /طعام ومشتريات/i });
    fireEvent.click(foodCategoryBtn);

    // Save
    const saveButton = screen.getByTestId('save-parsed-expense');
    fireEvent.click(saveButton);

    expect(onSaveExpense).toHaveBeenCalledTimes(1);
    // saveLearnedRule must NOT be called for 'عملية بنكية'
    expect(saveRuleSpy).not.toHaveBeenCalledWith('عملية بنكية', expect.any(String));
  });

  it('resets and wipes raw SMS upon closing', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SmartSmsSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={vi.fn()}
        soundEnabled={false}
        language="ar"
      />
    );

    const textarea = screen.getByPlaceholderText(/الصق الرسالة هنا/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Secret sensitive bank message' } });
    expect(textarea.value).toBe('Secret sensitive bank message');

    // Click close button
    const closeButtons = screen.getAllByRole('button');
    // First button in header is the X button
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();

    // Reopen sheet: rawSms should be wiped
    rerender(
      <SmartSmsSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={vi.fn()}
        soundEnabled={false}
        language="ar"
      />
    );
    const textareaAfter = screen.getByPlaceholderText(/الصق الرسالة هنا/i) as HTMLTextAreaElement;
    expect(textareaAfter.value).toBe('');
  });
});
