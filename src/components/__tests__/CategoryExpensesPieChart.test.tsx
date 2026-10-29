import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryExpensesPieChart } from '../CategoryExpensesPieChart';
import { getDefaultAppData } from '../../utils/storage';
import { Expense } from '../../types';

// Mock recharts ResponsiveContainer to render children with explicit dimensions in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '300px', height: '300px' }} data-testid="recharts-container">
        {children}
      </div>
    ),
  };
});

const mockData = getDefaultAppData();

const sampleExpenses: Expense[] = [
  {
    id: 'exp-1',
    categoryId: 'food',
    amount: 1500,
    date: '2026-10-15',
    title: 'سوبرماركت التميمي',
    payer: 'الزوج',
    paymentMethod: 'card',
    createdAt: Date.now(),
  },
  {
    id: 'exp-2',
    categoryId: 'housing',
    amount: 3500,
    date: '2026-10-01',
    title: 'إيجار شقة',
    payer: 'مشترك',
    paymentMethod: 'card',
    createdAt: Date.now(),
  },
  {
    id: 'exp-3',
    categoryId: 'kids',
    amount: 500,
    date: '2026-05-10', // Different month in same year
    title: 'أدوات مدرسية',
    payer: 'الزوجة',
    paymentMethod: 'card',
    createdAt: Date.now(),
  },
];

describe('CategoryExpensesPieChart Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, categories breakdown and amount calculations in Arabic', () => {
    render(
      <CategoryExpensesPieChart
        categories={mockData.categories}
        expenses={sampleExpenses}
        settings={mockData.settings}
        currentMonth="2026-10"
        language="ar"
      />
    );

    expect(screen.getByText(/توزيع المصاريف حسب التصنيف/)).toBeInTheDocument();
    expect(screen.getByText('هذا الشهر')).toBeInTheDocument();
    expect(screen.getByText('سنة 2026')).toBeInTheDocument();
    expect(screen.getByTestId('recharts-container')).toBeInTheDocument();
    expect(screen.getByText('إيجار وسكن')).toBeInTheDocument();
    expect(screen.getByText('البقالة والسوبرماركت')).toBeInTheDocument();
  });

  it('switches between monthly and annual scopes when toggled', () => {
    render(
      <CategoryExpensesPieChart
        categories={mockData.categories}
        expenses={sampleExpenses}
        settings={mockData.settings}
        currentMonth="2026-10"
        language="ar"
      />
    );

    // In monthly view, kids expense from May is not present
    expect(screen.queryByText('الأطفال والمدارس')).not.toBeInTheDocument();

    const yearBtn = screen.getByText('سنة 2026');
    fireEvent.click(yearBtn);

    // In annual view, kids expense from May should now be included
    expect(screen.getByText('الأطفال والمدارس')).toBeInTheDocument();
  });

  it('renders English localization correctly', () => {
    render(
      <CategoryExpensesPieChart
        categories={mockData.categories}
        expenses={sampleExpenses}
        settings={{ ...mockData.settings, language: 'en' }}
        currentMonth="2026-10"
        language="en"
      />
    );

    expect(screen.getByText(/Category Distribution/)).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getByText('Year 2026')).toBeInTheDocument();
    expect(screen.getByText('Rent & Housing')).toBeInTheDocument();
  });

  it('renders empty state when there are no expenses for the period', () => {
    render(
      <CategoryExpensesPieChart
        categories={mockData.categories}
        expenses={[]}
        settings={mockData.settings}
        currentMonth="2026-10"
        language="ar"
      />
    );

    expect(
      screen.getByText(/لا توجد بيانات مصروفات للفترة الزمنية المحددة/)
    ).toBeInTheDocument();
  });
});
