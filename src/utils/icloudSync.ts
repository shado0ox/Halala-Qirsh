/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppData } from '../types';
import { validateBackupData, saveAppData } from './storage';

export interface ICloudBackupMetadata {
  timestamp: number;
  expenseCount: number;
  categoriesCount: number;
  sizeBytes: number;
  appVersion: string;
  deviceId?: string;
}

export interface ICloudStatus {
  available: boolean;
  accountStatus: 'connected' | 'not_logged_in' | 'restricted' | 'simulated';
  lastBackupTimestamp?: number;
  hasBackup: boolean;
  backupMetadata?: ICloudBackupMetadata;
}

export interface ICloudBackupResult {
  success: boolean;
  timestamp: number;
  sizeBytes: number;
  error?: string;
}

export interface ICloudRestoreResult {
  success: boolean;
  data?: AppData;
  error?: string;
  metadata?: ICloudBackupMetadata;
}

interface ICloudNativePlugin {
  isAvailable(): Promise<{ available: boolean; accountStatus: string }>;
  backupData(options: {
    payload: string;
    timestamp: number;
    expenseCount: number;
    categoriesCount: number;
  }): Promise<{ success: boolean; timestamp: number; sizeBytes: number }>;
  getLatestBackup(): Promise<{
    exists: boolean;
    payload?: string;
    metadata?: ICloudBackupMetadata;
  }>;
  deleteBackup(): Promise<{ success: boolean }>;
  syncNow(): Promise<{ success: boolean }>;
  addListener(eventName: 'iCloudDataDidChange', listenerFunc: (info: any) => void): Promise<any>;
}

const SIMULATED_ICLOUD_DATA_KEY = 'halala_qirsh_icloud_simulated_payload_v1';
const SIMULATED_ICLOUD_META_KEY = 'halala_qirsh_icloud_simulated_meta_v1';

// Register native plugin with safe fallback
const NativeICloud = registerPlugin<ICloudNativePlugin>('ICloud', {
  web: {
    async isAvailable() {
      return { available: true, accountStatus: 'simulated' };
    },
    async backupData(options: {
      payload: string;
      timestamp: number;
      expenseCount: number;
      categoriesCount: number;
    }) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIMULATED_ICLOUD_DATA_KEY, options.payload);
        const meta: ICloudBackupMetadata = {
          timestamp: options.timestamp,
          expenseCount: options.expenseCount,
          categoriesCount: options.categoriesCount,
          sizeBytes: new Blob([options.payload]).size,
          appVersion: '1.0.0',
          deviceId: 'web-icloud-client',
        };
        localStorage.setItem(SIMULATED_ICLOUD_META_KEY, JSON.stringify(meta));
        return { success: true, timestamp: options.timestamp, sizeBytes: meta.sizeBytes };
      }
      return { success: false, timestamp: options.timestamp, sizeBytes: 0 };
    },
    async getLatestBackup() {
      if (typeof window !== 'undefined') {
        const payload = localStorage.getItem(SIMULATED_ICLOUD_DATA_KEY);
        const metaRaw = localStorage.getItem(SIMULATED_ICLOUD_META_KEY);
        if (payload) {
          const metadata = metaRaw ? (JSON.parse(metaRaw) as ICloudBackupMetadata) : undefined;
          return { exists: true, payload, metadata };
        }
      }
      return { exists: false };
    },
    async deleteBackup() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SIMULATED_ICLOUD_DATA_KEY);
        localStorage.removeItem(SIMULATED_ICLOUD_META_KEY);
      }
      return { success: true };
    },
    async syncNow() {
      return { success: true };
    },
    async addListener() {
      return { remove: () => {} };
    },
  },
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let latestPendingData: AppData | null = null;

export class ICloudSyncService {
  private static isNativePlatform = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  /**
   * Check Apple ID & iCloud availability status
   */
  public static async getStatus(): Promise<ICloudStatus> {
    try {
      const res = await NativeICloud.isAvailable();
      const backupRes = await NativeICloud.getLatestBackup();

      return {
        available: res.available,
        accountStatus: (res.accountStatus as any) || (this.isNativePlatform ? 'connected' : 'simulated'),
        hasBackup: Boolean(backupRes.exists),
        lastBackupTimestamp: backupRes.metadata?.timestamp,
        backupMetadata: backupRes.metadata,
      };
    } catch (err) {
      console.warn('iCloud getStatus error:', err);
      // Fallback
      const hasSimulated = typeof window !== 'undefined' && Boolean(localStorage.getItem(SIMULATED_ICLOUD_DATA_KEY));
      return {
        available: !this.isNativePlatform,
        accountStatus: this.isNativePlatform ? 'not_logged_in' : 'simulated',
        hasBackup: hasSimulated,
      };
    }
  }

  /**
   * Performs an immediate backup of full AppData to Apple iCloud
   */
  public static async backupNow(data: AppData): Promise<ICloudBackupResult> {
    try {
      const timestamp = Date.now();
      const payload = JSON.stringify(data);
      const expenseCount = data.expenses.length;
      const categoriesCount = data.categories.length;

      const res = await NativeICloud.backupData({
        payload,
        timestamp,
        expenseCount,
        categoriesCount,
      });

      return {
        success: res.success,
        timestamp: res.timestamp,
        sizeBytes: res.sizeBytes,
      };
    } catch (err: any) {
      console.error('Failed to backup to iCloud:', err);
      return {
        success: false,
        timestamp: Date.now(),
        sizeBytes: 0,
        error: err?.message || 'iCloud backup failed',
      };
    }
  }

  /**
   * Schedules a debounced background backup (1.5 seconds)
   * Prevents excessive writes while typing or adding multiple expenses quickly.
   */
  public static scheduleAutoBackup(data: AppData, delayMs: number = 1500): void {
    if (data.settings.icloudSyncEnabled === false) {
      return;
    }

    latestPendingData = data;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      if (latestPendingData) {
        this.backupNow(latestPendingData).catch((err) => {
          console.warn('Auto iCloud backup failed:', err);
        });
        latestPendingData = null;
      }
    }, delayMs);
  }

  /**
   * Immediately flushes any pending auto-backup (e.g. on app pause or background)
   */
  public static async flushPendingBackup(): Promise<void> {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (latestPendingData) {
      const dataToBackup = latestPendingData;
      latestPendingData = null;
      await this.backupNow(dataToBackup);
    }
  }

  /**
   * Retrieves the latest backup from iCloud without applying it
   */
  public static async getLatestBackup(): Promise<ICloudRestoreResult> {
    try {
      const res = await NativeICloud.getLatestBackup();
      if (!res.exists || !res.payload) {
        return {
          success: false,
          error: 'No iCloud backup found',
        };
      }

      const parsed = JSON.parse(res.payload);
      if (!validateBackupData(parsed)) {
        return {
          success: false,
          error: 'iCloud backup corrupted or invalid format',
        };
      }

      return {
        success: true,
        data: parsed,
        metadata: res.metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to read iCloud backup',
      };
    }
  }

  /**
   * Restores data from iCloud and saves to local storage & Preferences
   */
  public static async restoreNow(): Promise<ICloudRestoreResult> {
    const result = await this.getLatestBackup();
    if (!result.success || !result.data) {
      return result;
    }

    // Persist to local storage
    saveAppData(result.data);
    return result;
  }

  /**
   * Checks if an automatic restore should be proposed or executed on app startup.
   * If local expenses are empty and iCloud has an active backup with records, returns true.
   */
  public static async checkForAutoRestore(
    currentLocalData: AppData
  ): Promise<{ shouldRestore: boolean; backupData?: AppData; metadata?: ICloudBackupMetadata }> {
    try {
      // If local data already has user expenses, do not automatically wipe without user prompt
      const isLocalEmpty = currentLocalData.expenses.length === 0;

      const latest = await this.getLatestBackup();
      if (!latest.success || !latest.data || !latest.metadata) {
        return { shouldRestore: false };
      }

      // If local data is empty and iCloud has expenses
      if (isLocalEmpty && latest.data.expenses.length > 0) {
        return {
          shouldRestore: true,
          backupData: latest.data,
          metadata: latest.metadata,
        };
      }

      return { shouldRestore: false };
    } catch {
      return { shouldRestore: false };
    }
  }

  /**
   * Registers native lifecycle hooks and change listeners for continuous iCloud sync
   */
  public static setupSyncListeners(
    getCurrentData: () => AppData,
    onExternalChangeDetected?: (backupData: AppData, metadata?: ICloudBackupMetadata) => void
  ): () => void {
    // 1. Flush on app background
    let appStateListenerRemove: (() => void) | null = null;
    App.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        const current = getCurrentData();
        if (current.settings.icloudSyncEnabled !== false) {
          this.flushPendingBackup().catch(console.warn);
        }
      }
    }).then((handle) => {
      appStateListenerRemove = () => handle.remove();
    }).catch(() => {});

    // 2. Listen to native external changes (synced from other Apple devices)
    let icloudListenerRemove: (() => void) | null = null;
    NativeICloud.addListener('iCloudDataDidChange', async () => {
      try {
        const latest = await this.getLatestBackup();
        if (latest.success && latest.data && onExternalChangeDetected) {
          onExternalChangeDetected(latest.data, latest.metadata);
        }
      } catch (err) {
        console.warn('Error handling iCloudDataDidChange:', err);
      }
    }).then((handle) => {
      icloudListenerRemove = () => handle.remove();
    }).catch(() => {});

    return () => {
      if (appStateListenerRemove) appStateListenerRemove();
      if (icloudListenerRemove) icloudListenerRemove();
    };
  }

  /**
   * Deletes the iCloud backup
   */
  public static async deleteBackup(): Promise<boolean> {
    try {
      const res = await NativeICloud.deleteBackup();
      return Boolean(res.success);
    } catch {
      return false;
    }
  }
}
