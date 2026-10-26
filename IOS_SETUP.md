# دليل تجهيز ونشر تطبيق "مصاريف البيت" على متجر تطبيقات أبل (Apple App Store)

هذا الدليل يقدم لك الخطوات الدقيقة والتفصيلية خطوة بخطوة لبناء وتجهيز تطبيق **"مصاريف البيت" (Home Expenses)** على جهاز الماك وفتحه في برنامج **Xcode** ورفعه إلى **TestFlight** ومتجر **App Store**.

---

## 1. المتطلبات الأولية على جهاز Mac
1. جهاز Mac يعمل بنظام macOS حديث.
2. برنامج **Xcode** (مثبت مجاناً من متجر Mac App Store).
3. تثبيت أدوات سطر أوامر Xcode (Command Line Tools) عبر تشغيل الأمر:
   ```bash
   xcode-select --install
   ```
4. تثبيت **Node.js** (الإصدار 20 أو 22 LTS) عبر [nodejs.org](https://nodejs.org) أو عبر Homebrew:
   ```bash
   brew install node
   ```
5. تثبيت مدير الحزم **CocoaPods** (مطلوب لبناء مشاريع Capacitor iOS):
   ```bash
   sudo gem install cocoapods
   # أو عبر Homebrew:
   brew install cocoapods
   ```
6. حساب مطور أبل معتمد (**Apple Developer Program** - $99 سنويًا) في حال الرغبة بالرفع لـ TestFlight والمتجر.

---

## 2. أوامر التثبيت والبناء (Terminal Commands)

افتح تطبيق **Terminal** على الماك وانتقل لمجلد المشروع:

```bash
cd /مسار_المجلد/iOS-Expense-Budget
```

### أ) تثبيت الاعتماديات النظيفة:
```bash
npm install
```

### ب) التحقق من سلامة الأكواد والأنماط:
```bash
npx tsc --noEmit
```

### ج) بناء حزمة الويب وتوليد مجلد iOS لأول مرة:
```bash
# 1. بناء حزمة الإنتاج
npm run build

# 2. إضافة منصة iOS (يتم تنفيذها مرة واحدة فقط)
npx cap add ios

# 3. مزامنة الأكواد والإضافات المحلية
npx cap sync ios
```

> **ملاحظة:** في أي وقت تقوم بتعديل كود الـ React لاحقاً، نفذ فقط:
> ```bash
> npm run cap:sync
> ```

---

## 3. تعديل ملف `Info.plist` لإضافة إذن بصمة الوجه (Face ID)

بعد تشغيل `npx cap add ios`، سيتم إنشاء مجلد `ios/`.
يجب إضافة مفتاح إذن بصمة الوجه **`NSFaceIDUsageDescription`** حتى تقبل أبل التطبيق دون رفض:

افتح الملف: `ios/App/App/Info.plist` وأضف الأسطر التالية قبل علامة الإغلاق `</dict>`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>يستخدم التطبيق بصمة الوجه لفتح قفل بيانات مصاريف البيت وحماية خصوصيتك المالية / Home Expenses uses Face ID to securely unlock your financial data.</string>
```

---

## 4. فتح المشروع في Xcode وضبط التوقيع (Signing & Team)

1. افتح المشروع في Xcode عبر الأمر:
   ```bash
   npx cap open ios
   ```
   أو بالنقر المزدوج على ملف: `ios/App/App.xcworkspace`.

2. **اختيار الفريق والتوقيع الرقمي:**
   - من الشريط الجانبي الأيسر في Xcode، اضغط على المشروع الرئيسي **App**.
   - اختر علامة التبويب **Signing & Capabilities**.
   - فعّل خيار **Automatically manage signing**.
   - في خانة **Team**، اختر حساب Apple Developer الخاص بك.
   - تأكد أن **Bundle Identifier** مطابق لما حددته:
     `com.homeexpenses.budget`

3. **اختيار الجهاز التجريبي:**
   - من شريط الأدوات العلوي، اختر إما محاكي (Simulator) مثل **iPhone 16 Pro** أو وصّل جهاز الآيفون الفعلي بالماك.
   - اضغط على زر التشغيل **▶ (Run)** لتشغيل التطبيق والتحقق من عمله بالكامل أوفلاين.

---

## 5. تجهيز أيقونة التطبيق وشاشات العرض (App Store Assets)

### أ) أيقونة التطبيق (App Store Icon):
- الحجم: **1024 × 1024 بكسل** (مربعة تماماً).
- الصيغة: **PNG**.
- **مهم جداً:** بدون قنوات شفافة (No Alpha / Transparency) وبدون زوايا دائرية (أبل تضيف الزوايا الدائرية آلياً).
- في Xcode: ضعها داخل `App/Assets.xcassets/AppIcon`.

### ب) لقطات الشاشة (Screenshots):
مطلوب رفع لقطات شاشة للحجمين التاليين كحد أدنى في App Store Connect:
1. **شاشات 6.9" / 6.7" (iPhone 16 Pro Max / 15 Pro Max):**
   - الدقة: `1320 × 2868` بكسل أو `1290 × 2796` بكسل.
2. **شاشات 6.5" / 5.5" (الأجهزة ذات الزر الرئيسي أو الأقدم إن رغبت):**
   - الدقة: `1242 × 2688` بكسل أو `1242 × 2208` بكسل.

---

## 6. إجابات استبيان خصوصية التطبيق في App Store Connect (App Privacy Questionnaire)

أبل تسألك: **"Do you or your third-party partners collect any data from this app?"**

- اختر: **No, we do not collect data from this app.**
- (لأن التطبيق أوفلاين بالكامل، ولا يوجد به خادم، ولا كوكيز، ولا إعلانات، ولا أي حزمة تحليل خارجي).
- رابط سياسة الخصوصية (Privacy Policy URL):
  ارفع ملف `privacy.html` على مستودع GitHub Pages أو أي رابط عام، وضعه في الخانة المخصصة.

---

## 7. أرشفة ورفع التطبيق إلى TestFlight والمتجر

1. في Xcode، من القائمة العلوية حدد الجهاز كـ: **Any iOS Device (arm64)**.
2. من القائمة العلوية اختر: **Product** > **Archive**.
3. انتظر حتى يكتمل البناء وتفتح نافذة **Organizer**.
4. اضغط على زر **Distribute App**.
5. اختر **App Store Connect** ثم **Upload**.
6. اتبع الخطوات واضغط **Upload**.
7. بعد بضع دقائق، ستظهر النسخة داخل لوحة تحكم **App Store Connect** تحت تبويب **TestFlight**.
8. يمكنك الآن إضافة مختبرين داخليين، أو تقديم النسخة للمراجعة النهائية (Submit for Review) للمتجر العام!
