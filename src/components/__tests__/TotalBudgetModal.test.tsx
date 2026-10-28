import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TotalBudgetModal } from '../TotalBudgetModal';
import { getDefaultAppData } from '../../utils/storage';

const mockData = getDefaultAppData();

describe('TotalBudgetModal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with initial budget amount and strategy options', () => {
    render(
      <TotalBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockData.categories}
        settings={mockData.settings}
        currency="SAR"
        onSaveTotalBudget={vi.fn()}
      />
    );

    expect(screen.getByText('تحديد إجمالي الميزانية الشهرية')).toBeInTheDocument();
    expect(screen.getByText(/توزيع تلقائي على بنود المصاريف/)).toBeInTheDocument();
    expect(screen.getByText(/ميزانية موحدة عامة/)).toBeInTheDocument();
  });

  it('calculates proportional distribution and calls onSaveTotalBudget with distributed limits', () => {
    const onSave = vi.fn();
    render(
      <TotalBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockData.categories}
        settings={mockData.settings}
        currency="SAR"
        onSaveTotalBudget={onSave}
      />
    );

    // Enter 10,000 as total budget
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10000' } });

    // Click Save
    const saveButton = screen.getByText('حفظ وتطبيق الميزانية');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('sum_categories', 10000, expect.any(Object));
  });

  it('allows selecting unified custom total and calls onSave with custom_total mode', () => {
    const onSave = vi.fn();
    render(
      <TotalBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockData.categories}
        settings={mockData.settings}
        currency="SAR"
        onSaveTotalBudget={onSave}
      />
    );

    // Select unified custom option
    const unifiedOption = screen.getByText(/ميزانية موحدة عامة/);
    fireEvent.click(unifiedOption);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '12000' } });

    const saveButton = screen.getByText('حفظ وتطبيق الميزانية');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('custom_total', 12000);
  });
});
