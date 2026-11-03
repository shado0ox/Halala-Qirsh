import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ICloudSyncService } from '../icloudSync';
import { AppData } from '../../types';
import { getDefaultAppData } from '../storage';

const createMockData = (): AppData => {
  const base = getDefaultAppData();
  return {
    ...base,
    expenses: [
      {
        id: 'exp-1',
        title: 'تموينات الدانوب',
        amount: 145.5,
        categoryId: base.categories[0].id,
        date: '2026-11-01',
        type: 'expense',
        paymentMethod: 'card',
        payer: 'أنا',
        createdAt: 1730462400000,
      },
      {
        id: 'exp-2',
        title: 'قهوة مختصة',
        amount: 22,
        categoryId: base.categories[1].id,
        date: '2026-11-02',
        type: 'expense',
        paymentMethod: 'card',
        payer: 'أنا',
        createdAt: 1730548800000,
      },
    ],
  };
};

describe('ICloudSyncService', () => {
  let mockAppData: AppData;

  beforeEach(async () => {
    localStorage.clear();
    await ICloudSyncService.deleteBackup();
    vi.useRealTimers();
    mockAppData = createMockData();
  });

  it('checks iCloud status correctly', async () => {
    const status = await ICloudSyncService.getStatus();
    expect(status.available).toBe(true);
    expect(status.accountStatus).toBeDefined();
    expect(status.hasBackup).toBe(false);
  });

  it('performs manual backup and updates status', async () => {
    const result = await ICloudSyncService.backupNow(mockAppData);
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeGreaterThan(0);
    expect(result.sizeBytes).toBeGreaterThan(0);

    const status = await ICloudSyncService.getStatus();
    expect(status.hasBackup).toBe(true);
    expect(status.lastBackupTimestamp).toBeDefined();
    expect(status.backupMetadata?.expenseCount).toBe(2);
    expect(status.backupMetadata?.categoriesCount).toBe(mockAppData.categories.length);
  });

  it('retrieves latest backup matching saved data', async () => {
    await ICloudSyncService.backupNow(mockAppData);
    const restoreResult = await ICloudSyncService.getLatestBackup();

    expect(restoreResult.success).toBe(true);
    expect(restoreResult.data).toBeDefined();
    expect(restoreResult.data?.expenses).toHaveLength(2);
    expect(restoreResult.data?.expenses[0].title).toBe('تموينات الدانوب');
    expect(restoreResult.metadata?.expenseCount).toBe(2);
  });

  it('restores data to local storage and Preferences', async () => {
    await ICloudSyncService.backupNow(mockAppData);

    const restoreRes = await ICloudSyncService.restoreNow();
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.data?.expenses).toHaveLength(2);

    const storedRaw = localStorage.getItem('ios_home_expenses_store_v1');
    expect(storedRaw).not.toBeNull();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed.expenses).toHaveLength(2);
  });

  it('checkForAutoRestore triggers when local data is empty and backup exists', async () => {
    await ICloudSyncService.backupNow(mockAppData);

    const emptyLocalData = getDefaultAppData();

    const autoRestore = await ICloudSyncService.checkForAutoRestore(emptyLocalData);
    expect(autoRestore.shouldRestore).toBe(true);
    expect(autoRestore.backupData?.expenses).toHaveLength(2);
  });

  it('checkForAutoRestore DOES NOT wipe existing local expenses', async () => {
    await ICloudSyncService.backupNow(mockAppData);

    const existingLocalData: AppData = {
      ...mockAppData,
      expenses: [
        {
          id: 'exp-local-1',
          title: 'محطة بترول',
          amount: 80,
          categoryId: mockAppData.categories[0].id,
          date: '2026-11-03',
          type: 'expense',
          paymentMethod: 'card',
          payer: 'أنا',
          createdAt: 1730635200000,
        },
      ],
    };

    const autoRestore = await ICloudSyncService.checkForAutoRestore(existingLocalData);
    expect(autoRestore.shouldRestore).toBe(false);
  });

  it('rejects corrupted iCloud backup payload gracefully', async () => {
    localStorage.setItem('__halala_icloud_backup_payload', '{ not_valid_json');
    localStorage.setItem(
      '__halala_icloud_backup_meta',
      JSON.stringify({ timestamp: Date.now(), sizeInBytes: 15, expenseCount: 1, categoriesCount: 1, appVersion: '2.4.0' })
    );

    const result = await ICloudSyncService.getLatestBackup();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('debounces auto-backup schedule and flushes successfully', async () => {
    vi.useFakeTimers();

    ICloudSyncService.scheduleAutoBackup(mockAppData, 200);

    // Fast forward halfway
    vi.advanceTimersByTime(100);
    const midStatus = await ICloudSyncService.getStatus();
    expect(midStatus.hasBackup).toBe(false);

    // Fast forward to complete debounce
    vi.advanceTimersByTime(150);
    // Flush microtasks
    await Promise.resolve();

    const endStatus = await ICloudSyncService.getStatus();
    expect(endStatus.hasBackup).toBe(true);

    vi.useRealTimers();
  });

  it('deletes backup completely', async () => {
    await ICloudSyncService.backupNow(mockAppData);
    expect((await ICloudSyncService.getStatus()).hasBackup).toBe(true);

    const deleted = await ICloudSyncService.deleteBackup();
    expect(deleted).toBe(true);
    expect((await ICloudSyncService.getStatus()).hasBackup).toBe(false);
  });
});
