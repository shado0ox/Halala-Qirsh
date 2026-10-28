import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnualBudgetModal } from '../AnnualBudgetModal';

describe('AnnualBudgetModal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with annual budget title and current amount', () => {
    render(
      <AnnualBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        currentAnnualBudget={120000}
        monthlyBudget={10000}
        currency="SAR"
        onSave={vi.fn()}
        language="ar"
      />
    );

    expect(screen.getByText('تحديد الميزانية السنوية الإجمالية')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120000')).toBeInTheDocument();
    expect(screen.getByText(/حساب تلقائي: 12 × الميزانية الشهرية/)).toBeInTheDocument();
  });

  it('calculates 12x monthly budget when auto-multiply button is clicked', () => {
    render(
      <AnnualBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        currentAnnualBudget={50000}
        monthlyBudget={15000}
        currency="SAR"
        onSave={vi.fn()}
        language="ar"
      />
    );

    const autoBtn = screen.getByText(/حساب تلقائي: 12 × الميزانية الشهرية/);
    fireEvent.click(autoBtn);

    // 15000 * 12 = 180000
    expect(screen.getByDisplayValue('180000')).toBeInTheDocument();
  });

  it('allows manual input and quick addition chips', () => {
    render(
      <AnnualBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        currentAnnualBudget={100000}
        monthlyBudget={8000}
        currency="SAR"
        onSave={vi.fn()}
        language="ar"
      />
    );

    const chipPlus50k = screen.getByText('+50,000');
    fireEvent.click(chipPlus50k);

    expect(screen.getByDisplayValue('150000')).toBeInTheDocument();
  });

  it('calls onSave with new annual budget and closes modal', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <AnnualBudgetModal
        isOpen={true}
        onClose={onClose}
        currentAnnualBudget={100000}
        monthlyBudget={8000}
        currency="SAR"
        onSave={onSave}
        language="ar"
      />
    );

    const input = screen.getByDisplayValue('100000');
    fireEvent.change(input, { target: { value: '240000' } });

    const saveButton = screen.getByText('حفظ الميزانية السنوية');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(240000);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders English version correctly', () => {
    render(
      <AnnualBudgetModal
        isOpen={true}
        onClose={vi.fn()}
        currentAnnualBudget={100000}
        monthlyBudget={8000}
        currency="SAR"
        onSave={vi.fn()}
        language="en"
      />
    );

    expect(screen.getByText('Set Total Annual Budget')).toBeInTheDocument();
    expect(screen.getByText(/Auto-calculate: 12 × Monthly Budget/)).toBeInTheDocument();
    expect(screen.getByText('Save Annual Budget')).toBeInTheDocument();
  });
});
