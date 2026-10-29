import Foundation
import AppIntents
import UIKit

enum QuickStore {
    static let prefix = "CapacitorStorage."
    static let categoriesKey = prefix + "quickCategories"
    static let pendingKey = prefix + "pendingExpenses"

    struct Cat: Codable { let id: String; let name: String }
    struct Pending: Codable {
        let id: String; let amount: Double; let categoryId: String
        let note: String?; let date: String; let createdAt: Double
    }

    // قائمة احتياطية لو لم يفتح المستخدم التطبيق بعد:
    static let fallback: [Cat] = [
        Cat(id: "food", name: "البقالة والسوبرماركت"),
        Cat(id: "bills", name: "فواتير وخدمات المنزل"),
        Cat(id: "housing", name: "إيجار وسكن"),
        Cat(id: "kids", name: "الأطفال والمدارس"),
        Cat(id: "maintenance", name: "صيانة وتجهيزات البيت"),
        Cat(id: "health", name: "الصحة والأدوية"),
        Cat(id: "transport", name: "بنزين ومواصلات"),
        Cat(id: "entertainment", name: "ترفيه ومطاعم عائلية"),
        Cat(id: "emergency", name: "طوارئ ومتفرقات")
    ]

    static func categories() -> [Cat] {
        if let s = UserDefaults.standard.string(forKey: categoriesKey),
           let d = s.data(using: .utf8),
           let list = try? JSONDecoder().decode([Cat].self, from: d), !list.isEmpty { return list }
        return fallback
    }

    static func localDateString() -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    static func enqueue(amount: Double, categoryId: String, note: String?) {
        var items: [Pending] = []
        if let s = UserDefaults.standard.string(forKey: pendingKey),
           let d = s.data(using: .utf8),
           let old = try? JSONDecoder().decode([Pending].self, from: d) { items = old }
        items.append(Pending(id: UUID().uuidString, amount: amount, categoryId: categoryId,
                             note: (note?.isEmpty ?? true) ? nil : note,
                             date: localDateString(), createdAt: Date().timeIntervalSince1970))
        if let d = try? JSONEncoder().encode(items), let s = String(data: d, encoding: .utf8) {
            UserDefaults.standard.set(s, forKey: pendingKey)
        }
    }
}

@available(iOS 16.0, *)
struct QuickCategory: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "تصنيف"
    static var defaultQuery = QuickCategoryQuery()
    let id: String
    let name: String
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

@available(iOS 16.0, *)
struct QuickCategoryQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [QuickCategory] {
        QuickStore.categories().filter { identifiers.contains($0.id) }.map { QuickCategory(id: $0.id, name: $0.name) }
    }
    func suggestedEntities() async throws -> [QuickCategory] {
        QuickStore.categories().map { QuickCategory(id: $0.id, name: $0.name) }
    }
}

@available(iOS 16.0, *)
struct QuickAddExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "مصروف سريع"
    static var description = IntentDescription("سجّل مصروفاً بدون فتح التطبيق")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "المبلغ", requestValueDialog: "كم المبلغ؟")
    var amount: Double

    @Parameter(title: "التصنيف", requestValueDialog: "اختر التصنيف")
    var category: QuickCategory

    @Parameter(title: "ملاحظة", requestValueDialog: "ملاحظة (اختياري)")
    var note: String?

    static var parameterSummary: some ParameterSummary {
        Summary("مصروف \(\.$amount) في \(\.$category)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard amount > 0, amount < 1_000_000 else {
            throw $amount.needsValueError("اكتب مبلغاً صحيحاً")
        }
        QuickStore.enqueue(amount: amount, categoryId: category.id, note: note)
        let shown = String(format: "%g", amount)
        return .result(dialog: "تم تسجيل \(shown) في \(category.name)")
    }
}

@available(iOS 16.0, *)
struct LogExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "تسجيل مصروف من رسالة البنك"
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
            intent: QuickAddExpenseIntent(),
            phrases: [
                "Quick expense in \(.applicationName)",
                "Log quick expense in \(.applicationName)",
                "مصروف سريع في \(.applicationName)",
                "سجل مصروف سريع في \(.applicationName)"
            ],
            shortTitle: "مصروف سريع",
            systemImageName: "bolt.fill"
        )
        AppShortcut(
            intent: LogExpenseIntent(),
            phrases: [
                "Log bank SMS in \(.applicationName)",
                "Log an expense in \(.applicationName)",
                "تسجيل مصروف من رسالة البنك في \(.applicationName)",
                "سجّل مصروف في \(.applicationName)"
            ],
            shortTitle: "تسجيل مصروف من رسالة البنك",
            systemImageName: "plus.circle.fill"
        )
    }
}
