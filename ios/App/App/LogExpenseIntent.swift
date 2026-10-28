import AppIntents
import UIKit

@available(iOS 16.0, *)
struct LogExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "تسجيل مصروف"
    static var description = IntentDescription("افتح شاشة تسجيل مصروف من رسالة البنك")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "halalaqirsh://sms") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct HalalaQirshShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogExpenseIntent(),
            phrases: [
                "Log an expense in \(.applicationName)",
                "سجّل مصروف في \(.applicationName)"
            ],
            shortTitle: "تسجيل مصروف",
            systemImageName: "plus.circle.fill"
        )
    }
}
