import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddExpenseSheet } from '../AddExpenseSheet';
import { Category, Expense } from '../../types';
import { translations } from '../../utils/i18n';

const t = translations.en;

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
    id: 'bills',
    name: 'فواتير والتزامات',
    nameEn: 'Bills & Utilities',
    icon: 'Receipt',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    monthlyLimit: 1500,
    isCustom: false,
  },
];

describe('AddExpenseSheet Component Regression Tests', () => {
  it('fills amount and title and clicks Save: onSaveExpense is called exactly once and onClose is called', () => {
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <AddExpenseSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="en"
      />
    );

    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '150' } });

    const titleInput = screen.getByPlaceholderText(t.descPlaceholder);
    fireEvent.change(titleInput, { target: { value: 'Grocery Store' } });

    const saveButton = screen.getByRole('button', { name: t.save });
    fireEvent.click(saveButton);

    expect(onSaveExpense).toHaveBeenCalledTimes(1);
    expect(onSaveExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Grocery Store',
        amount: 150,
        categoryId: 'food',
      }),
      expect.anything()
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks Save twice quickly: onSaveExpense is still called exactly once', () => {
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <AddExpenseSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="en"
      />
    );

    const amountInput = screen.getByPlaceholderText('0');
    fireEvent.change(amountInput, { target: { value: '75' } });

    const titleInput = screen.getByPlaceholderText(t.descPlaceholder);
    fireEvent.change(titleInput, { target: { value: 'Coffee' } });

    const saveButton = screen.getByRole('button', { name: t.save });
    // First click
    fireEvent.click(saveButton);
    // Second rapid click
    fireEvent.click(saveButton);

    expect(onSaveExpense).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks Save with an empty title or amount: onSaveExpense is NOT called and validation error is shown', () => {
    const onSaveExpense = vi.fn();
    const onClose = vi.fn();

    render(
      <AddExpenseSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        soundEnabled={false}
        language="en"
      />
    );

    const saveButton = screen.getByRole('button', { name: t.save });

    // Attempt save with both fields empty
    fireEvent.click(saveButton);
    expect(onSaveExpense).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(t.validationDescRequired)).toBeInTheDocument();

    // Fill title but leave amount empty
    const titleInput = screen.getByPlaceholderText(t.descPlaceholder);
    fireEvent.change(titleInput, { target: { value: 'Lunch' } });
    fireEvent.click(saveButton);
    expect(onSaveExpense).not.toHaveBeenCalled();
    expect(screen.getByText(t.validationAmountRequired)).toBeInTheDocument();
  });

  it('edit mode: saves the updated data and preserves id in parent handler', () => {
    const existingExpense: Expense = {
      id: 'exp-12345',
      title: 'Pharmacy Bill',
      amount: 45,
      categoryId: 'bills',
      date: '2026-03-15',
      paymentMethod: 'card',
      payer: 'الزوج',
      notes: 'Medicine',
      createdAt: 1710500000000,
    };

    let savedExpenseState: Expense = { ...existingExpense };
    const onSaveExpense = vi.fn((updatedData: Omit<Expense, 'id' | 'createdAt'>) => {
      // Mimic parent handleSaveExpense edit logic
      savedExpenseState = {
        ...updatedData,
        id: existingExpense.id,
        createdAt: existingExpense.createdAt,
      };
    });
    const onClose = vi.fn();

    render(
      <AddExpenseSheet
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        currency="SAR"
        onSaveExpense={onSaveExpense}
        initialExpense={existingExpense}
        soundEnabled={false}
        language="en"
      />
    );

    // Initial fields should be pre-populated
    const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(amountInput.value).toBe('45');

    const titleInput = screen.getByPlaceholderText(t.descPlaceholder) as HTMLInputElement;
    expect(titleInput.value).toBe('Pharmacy Bill');

    // Update amount to 90
    fireEvent.change(amountInput, { target: { value: '90' } });

    const saveButton = screen.getByRole('button', { name: t.save });
    fireEvent.click(saveButton);

    expect(onSaveExpense).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(savedExpenseState.id).toBe('exp-12345');
    expect(savedExpenseState.amount).toBe(90);
    expect(savedExpenseState.title).toBe('Pharmacy Bill');
  });
});
