import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsSettingsTab } from '../tabs/AnalyticsSettingsTab';
import { AppData } from '../../types';
import { AppLauncher } from '@capacitor/app-launcher';

// Mock native haptics
vi.mock('../../utils/nativeHaptics', () => ({
  nativeHaptics: {
    tap: vi.fn(),
    success: vi.fn(),
    notification: vi.fn(),
  },
}));

// Mock AppLauncher
vi.mock('@capacitor/app-launcher', () => ({
  AppLauncher: {
    openUrl: vi.fn().mockResolvedValue({ completed: true }),
  },
}));

// Mock Capacitor Core
vi.mock('@capacitor/core', async () => {
  const actual = await vi.importActual<any>('@capacitor/core');
  return {
    ...actual,
    Capacitor: {
      isNativePlatform: vi.fn().mockReturnValue(true),
    },
  };
});

import { getDefaultAppData } from '../../utils/storage';

const mockData: AppData = getDefaultAppData();

describe('Back Tap Shortcut Settings UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the "Add Shortcut" button when the constant contains REPLACE_ME and shows all setup steps and note', () => {
    render(
      <AnalyticsSettingsTab
        categories={mockData.categories}
        expenses={mockData.expenses}
        settings={mockData.settings}
        fullData={mockData}
        onUpdateSettings={vi.fn()}
        onImportData={vi.fn()}
        onClearAllData={vi.fn()}
        onRequestNotificationPermission={vi.fn()}
        onSendTestNotification={vi.fn()}
        notificationPermission="granted"
        onOpenPasscodeModal={vi.fn()}
        onDisablePasscode={vi.fn()}
        onOpenPrivacyPolicy={vi.fn()}
      />
    );

    // Section title must be visible
    expect(screen.getByText('تسجيل بالضغط على ظهر الهاتف')).toBeInTheDocument();

    // Button should NOT be rendered when URL contains REPLACE_ME
    const addShortcutButton = screen.queryByTestId('add-back-tap-shortcut-btn');
    expect(addShortcutButton).toBeNull();

    // All steps must be present
    expect(screen.getByText(/اضغط "إضافة الاختصار" ثم Add Shortcut/)).toBeInTheDocument();
    expect(screen.getByText(/الإعدادات ثم تسهيلات الاستخدام ثم اللمس ثم Back Tap/)).toBeInTheDocument();
    expect(screen.getByText(/اختر Double Tap ثم اختر الاختصار/)).toBeInTheDocument();
    expect(screen.getByText(/جرّب بالضغط مرتين على ظهر الهاتف/)).toBeInTheDocument();
    expect(screen.getByText(/Back Tap يعمل على iPhone 8 وأحدث/)).toBeInTheDocument();
  });

  it('shows the "Add Shortcut" button when shortcut URL is updated and calls AppLauncher when clicked', () => {
    render(
      <AnalyticsSettingsTab
        categories={mockData.categories}
        expenses={mockData.expenses}
        settings={mockData.settings}
        fullData={mockData}
        onUpdateSettings={vi.fn()}
        onImportData={vi.fn()}
        onClearAllData={vi.fn()}
        onRequestNotificationPermission={vi.fn()}
        onSendTestNotification={vi.fn()}
        notificationPermission="granted"
        onOpenPasscodeModal={vi.fn()}
        onDisablePasscode={vi.fn()}
        onOpenPrivacyPolicy={vi.fn()}
        shortcutICloudUrl="https://www.icloud.com/shortcuts/real_active_shortcut_123"
      />
    );

    // Button SHOULD now be in the document
    const addShortcutButton = screen.getByTestId('add-back-tap-shortcut-btn');
    expect(addShortcutButton).toBeInTheDocument();
    expect(addShortcutButton).toHaveTextContent('إضافة الاختصار');

    // Click button
    fireEvent.click(addShortcutButton);
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: 'https://www.icloud.com/shortcuts/real_active_shortcut_123',
    });
  });

  it('supports English interface with translated steps and note', () => {
    const enSettings = { ...mockData.settings, language: 'en' as const };
    render(
      <AnalyticsSettingsTab
        categories={mockData.categories}
        expenses={mockData.expenses}
        settings={enSettings}
        fullData={{ ...mockData, settings: enSettings }}
        onUpdateSettings={vi.fn()}
        onImportData={vi.fn()}
        onClearAllData={vi.fn()}
        onRequestNotificationPermission={vi.fn()}
        onSendTestNotification={vi.fn()}
        notificationPermission="granted"
        onOpenPasscodeModal={vi.fn()}
        onDisablePasscode={vi.fn()}
        onOpenPrivacyPolicy={vi.fn()}
        shortcutICloudUrl="https://www.icloud.com/shortcuts/en_shortcut_999"
      />
    );

    expect(screen.getByText('Log Expense via Back Tap')).toBeInTheDocument();
    const btn = screen.getByTestId('add-back-tap-shortcut-btn');
    expect(btn).toHaveTextContent('Add Shortcut');
    expect(screen.getByText(/Tap "Add Shortcut" then tap Add Shortcut/)).toBeInTheDocument();
  });
});
