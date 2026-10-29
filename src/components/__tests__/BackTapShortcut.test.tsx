import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsSettingsTab } from '../tabs/AnalyticsSettingsTab';
import { AppData } from '../../types';
import { AppLauncher } from '@capacitor/app-launcher';
import { Capacitor } from '@capacitor/core';
import { getDefaultAppData } from '../../utils/storage';

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
      ...actual.Capacitor,
      isNativePlatform: vi.fn().mockReturnValue(true),
    },
  };
});

const mockData: AppData = getDefaultAppData();

describe('Back Tap App Intents / Shortcuts Settings UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('on native platform: shows "Open Shortcuts app" button, all 4 steps, and clicking calls AppLauncher.openUrl with shortcuts://', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

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

    // Button should be visible on native platform
    const openShortcutsButton = screen.getByTestId('add-back-tap-shortcut-btn');
    expect(openShortcutsButton).toBeInTheDocument();
    expect(openShortcutsButton).toHaveTextContent('فتح تطبيق الاختصارات');

    // Click button
    fireEvent.click(openShortcutsButton);
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: 'shortcuts://',
    });

    // All 4 Arabic steps must be present
    expect(screen.getByText(/افتح تطبيق الاختصارات \(Shortcuts\) وابحث عن اسم التطبيق/)).toBeInTheDocument();
    expect(screen.getAllByText(/مصروف سريع/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ثبّته بالضغط عليه مطولاً أو أضفه كاختصار جديد/)).toBeInTheDocument();
    expect(screen.getByText(/الإعدادات ← تسهيلات الاستخدام ← اللمس ← Back Tap/)).toBeInTheDocument();
    expect(screen.getByText(/اضغط مرتين على ظهر الآيفون لتسجيل مصروف/)).toBeInTheDocument();
    expect(screen.getByText(/يحتاج iOS 16 أو أحدث، وBack Tap يعمل على iPhone 8 وأحدث/)).toBeInTheDocument();
    expect(screen.getByText(/افتح التطبيق مرة واحدة على الأقل ليظهر قايمة التصنيفات في الاختصار/)).toBeInTheDocument();
  });

  it('on web platform: hides the button but displays all 4 setup steps and note', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

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

    // Button must be hidden on web
    const openShortcutsButton = screen.queryByTestId('add-back-tap-shortcut-btn');
    expect(openShortcutsButton).toBeNull();

    // All 4 steps and note must remain visible
    expect(screen.getByText(/افتح تطبيق الاختصارات \(Shortcuts\) وابحث عن اسم التطبيق/)).toBeInTheDocument();
    expect(screen.getByText(/ثبّته بالضغط عليه مطولاً أو أضفه كاختصار جديد/)).toBeInTheDocument();
    expect(screen.getByText(/الإعدادات ← تسهيلات الاستخدام ← اللمس ← Back Tap/)).toBeInTheDocument();
    expect(screen.getByText(/اضغط مرتين على ظهر الآيفون لتسجيل مصروف/)).toBeInTheDocument();
    expect(screen.getByText(/يحتاج iOS 16 أو أحدث، وBack Tap يعمل على iPhone 8 وأحدث/)).toBeInTheDocument();
  });

  it('supports English interface with translated steps and button on native platform', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
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
      />
    );

    expect(screen.getByText('Log Expense via Back Tap')).toBeInTheDocument();

    const btn = screen.getByTestId('add-back-tap-shortcut-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Open Shortcuts app');

    fireEvent.click(btn);
    expect(AppLauncher.openUrl).toHaveBeenCalledWith({
      url: 'shortcuts://',
    });

    expect(screen.getByText(/Open the Shortcuts app and search for the app name/)).toBeInTheDocument();
    expect(screen.getByText(/Pin it with a long press or add it as a new shortcut/)).toBeInTheDocument();
    expect(screen.getByText(/Settings → Accessibility → Touch → Back Tap/)).toBeInTheDocument();
    expect(screen.getByText(/Double-tap the back of your iPhone to log an expense/)).toBeInTheDocument();
    expect(screen.getByText(/Requires iOS 16 or later\. Back Tap works on iPhone 8 and later/)).toBeInTheDocument();
  });
});
