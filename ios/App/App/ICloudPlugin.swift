import Foundation
import UIKit
import Capacitor

@objc(ICloudPlugin)
public class ICloudPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ICloudPlugin"
    public let jsName = "ICloud"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "backupData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncNow", returnType: CAPPluginReturnPromise)
    ]

    private let kvStore = NSUbiquitousKeyValueStore.default
    private let backupDataKey = "halala_qirsh_icloud_backup_v1"
    private let backupMetaKey = "halala_qirsh_icloud_meta_v1"

    override public func load() {
        super.load()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(ubiquitousKeyValueStoreDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: kvStore
        )
        kvStore.synchronize()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func ubiquitousKeyValueStoreDidChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo else { return }
        let changeReason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int ?? 0
        let changedKeys = userInfo[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []

        if changedKeys.contains(backupDataKey) || changedKeys.contains(backupMetaKey) {
            notifyListeners("iCloudDataDidChange", data: [
                "reason": changeReason,
                "changedKeys": changedKeys,
                "timestamp": Date().timeIntervalSince1970 * 1000
            ])
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        let isICloudAvailable = FileManager.default.ubiquityIdentityToken != nil
        call.resolve([
            "available": isICloudAvailable,
            "accountStatus": isICloudAvailable ? "connected" : "not_logged_in"
        ])
    }

    @objc func backupData(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            call.reject("Missing backup payload")
            return
        }

        let timestamp = call.getDouble("timestamp") ?? (Date().timeIntervalSince1970 * 1000)
        let expenseCount = call.getInt("expenseCount") ?? 0
        let categoriesCount = call.getInt("categoriesCount") ?? 0

        kvStore.set(payload, forKey: backupDataKey)

        let metadata: [String: Any] = [
            "timestamp": timestamp,
            "expenseCount": expenseCount,
            "categoriesCount": categoriesCount,
            "sizeBytes": payload.utf8.count,
            "appVersion": "1.0.0",
            "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? "ios-device"
        ]
        kvStore.set(metadata, forKey: backupMetaKey)
        let synced = kvStore.synchronize()

        call.resolve([
            "success": synced,
            "timestamp": timestamp,
            "sizeBytes": payload.utf8.count
        ])
    }

    @objc func getLatestBackup(_ call: CAPPluginCall) {
        kvStore.synchronize()

        guard let payload = kvStore.string(forKey: backupDataKey) else {
            call.resolve([
                "exists": false
            ])
            return
        }

        let metadata = kvStore.dictionary(forKey: backupMetaKey) ?? [:]
        call.resolve([
            "exists": true,
            "payload": payload,
            "metadata": metadata
        ])
    }

    @objc func deleteBackup(_ call: CAPPluginCall) {
        kvStore.removeObject(forKey: backupDataKey)
        kvStore.removeObject(forKey: backupMetaKey)
        let synced = kvStore.synchronize()
        call.resolve([
            "success": synced
        ])
    }

    @objc func syncNow(_ call: CAPPluginCall) {
        let synced = kvStore.synchronize()
        call.resolve([
            "success": synced
        ])
    }
}
