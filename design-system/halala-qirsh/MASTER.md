# Design System Master File — Halala & Qirsh (هللة وقرش)

> **LOGIC:** This Master File defines the authoritative visual language, color tokens, typography, and component specifications for the **Halala & Qirsh (هللة وقرش)** native iOS & Web application. All components and views strictly adhere to these specifications.

---

**Project:** Halala & Qirsh (هللة وقرش)  
**Category:** Native iOS & Web Personal Finance & Budget Tracker (Saudi Arabia)  
**Design Constitution:** Apple iOS Human Interface Guidelines (HIG) + Luminous Emerald Fintech Palette  
**Languages:** Arabic (RTL First, Primary) & English (LTR, Secondary)  

---

## 1. Global Rules & Foundations

### 1.1 Typography (Native iOS & Modern Arabic)

The application uses native Apple typography with full Arabic script support and tabular numeric figures for financial accuracy:

- **Primary Font Family:**
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "SF Pro AR", "IBM Plex Sans Arabic", "Segoe UI", Roboto, sans-serif;
  ```
- **Financial Numbers:** `font-variant-numeric: tabular-nums;` (ensures aligned currency digits in lists, summaries, and calculator sheets).
- **iOS Font Zoom Protection:** All inputs, selects, and textareas enforce `font-size: 16px !important;` to eliminate unwanted WebKit viewport auto-zooming.
- **Direction & RTL:** Dynamic HTML attributes `dir="rtl"` / `dir="ltr"` and `lang="ar"` / `lang="en"` with mirrored layouts for Arabic and English.

### 1.2 Color System (Saudi Fintech Emerald & True OLED Black)

#### Brand Primary Palette (Emerald & Mint)
| Token | Hex | Usage |
|---|---|---|
| `--color-primary-950` | `#022C22` | Deepest Forest Accent / Dark contrast |
| `--color-primary-900` | `#064E3B` | Deep Forest Header / Primary Gradient start |
| `--color-primary-800` | `#065F46` | Hero card surface / Strong contrast border |
| `--color-primary-700` | `#047857` | Dark Emerald action button hover |
| `--color-primary-600` | `#059669` | Primary CTA buttons / High-priority accents |
| `--color-primary-500` | `#10B981` | Core Brand Emerald / Active toggles / Badges |
| `--color-primary-400` | `#34D399` | Luminous Mint highlight / Dark mode text pop |
| `--color-primary-300` | `#6EE7B7` | Glow effect overlays / Metric highlights |
| `--color-primary-200` | `#A7F3D0` | Soft chip backgrounds |
| `--color-primary-100` | `#D1FAE5` | Light status pill / Category background |
| `--color-primary-50`  | `#ECFDF5` | Lightest subtle highlight |
| `--color-mint`         | `#10B981` | Positive cash flow & income indicator |
| `--color-warning`      | `#F59E0B` | Budget alert threshold (80%–99%) |
| `--color-danger`       | `#EF4444` | Over-budget (>100%), debt & destructive actions |

#### Surfaces & Layout Tokens

| Token | Light Theme (`#F4FAF7`) | Dark Theme (`#000000` True OLED) |
|---|---|---|
| `--bg-app` | `#F4FAF7` (Crisp Mint Off-White) | `#000000` (Pitch Black OLED) |
| `--bg-surface` | `#FFFFFF` (Pure White Card) | `#1C1C1E` (Apple System Dark Gray) |
| `--bg-surface-glass` | `rgba(255, 255, 255, 0.92)` | `rgba(28, 28, 30, 0.85)` |
| `--bg-secondary` | `#EAF6F0` (Soft Mint Tint) | `#2C2C2E` (Secondary Elevated Gray) |
| `--bg-subtle` | `#F0F9F5` (Ultra-subtle container) | `#161618` (Recessed Surface) |
| `--border-subtle` | `rgba(16, 185, 129, 0.12)` | `rgba(255, 255, 255, 0.08)` |
| `--border-glass` | `rgba(255, 255, 255, 0.95)` | `rgba(255, 255, 255, 0.10)` |
| `--text-primary` | `#0B2319` (High Contrast Deep Green-Black) | `#FFFFFF` (Pure White) |
| `--text-secondary` | `#335C49` (Medium Forest Tone) | `#AEAEB2` (Apple Secondary Label) |
| `--text-muted` | `#5C8271` (Muted Sage) | `#8E8E93` (Apple Tertiary Label) |

### 1.3 Safe Area & Full-Bleed Geometry

The app operates with `viewport-fit=cover` and dynamic environment safe areas:
- `--sat: env(safe-area-inset-top, 0px);` (Dynamic Island / Status bar padding)
- `--sab: env(safe-area-inset-bottom, 0px);` (Home indicator bar padding)
- `--sal: env(safe-area-inset-left, 0px);`
- `--sar: env(safe-area-inset-right, 0px);`

Full-bleed backgrounds extend into safe areas, while interactive buttons and content remain inside the safe zone.

### 1.4 Radii & Elevation Tokens

- `--radius-hero`: `28px` (Top cards, month-end balance banners)
- `--radius-card`: `20px` (Expense items, category rows, chart wrappers)
- `--radius-button`: `14px` (iOS pill actions, primary submit triggers)
- `--radius-input`: `14px` / `16px` (Unified form input fields)
- `--radius-pill`: `9999px` (Status badges, segmented controls, tab pills)
- Touch Targets: Minimum `44px × 44px` across all interactive elements.

---

## 2. Component Specifications

### 2.1 Buttons & Interactive Controls
- **Primary Action:** Solid Emerald `#059669` or `#10B981`, white text, height $\ge 44$px, font weight `700`, smooth scale active tap `whileTap={{ scale: 0.98 }}` with native haptic feedback (`nativeHaptics.tap` / `nativeHaptics.success`).
- **Secondary / Ghost:** Soft surface `#EAF6F0` (dark: `#2C2C2E`), border `1px solid var(--border-subtle)`, text `var(--text-primary)`.
- **Destructive:** Red `#EF4444` background or border, reserved strictly for permanent deletions (e.g. deleting expenses, bills, categories).

### 2.2 Form Input Fields
- Box sizing `border-box`, `w-full`.
- Height: Standard 48px to 52px for comfortable thumb entry.
- Padding: `px-4 py-3`.
- Background: Light theme `#FFFFFF` with subtle border `rgba(16, 185, 129, 0.15)`, Dark theme `#2C2C2E`.
- Focus State: Ring `2px solid #10B981` without layout shift.
- Numbers & Currencies: Right-to-left layout with Saudi Riyal (`ر.س` / `SAR`) symbol neatly anchored.

### 2.3 Bottom Sheets & Modals
- Native iOS Bottom Sheet pattern with drag handle pill (`w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700`).
- Safe bottom padding: `pb-[calc(1.5rem+var(--sab))]`.
- Smooth Spring Entrance: Motion `y: '100%' -> 0` with backdrop blur (`backdrop-blur-md bg-black/55`).
- Keyboard avoidance: Scrollable container using `max-h-[85dvh]` with auto-scroll to active field.

### 2.4 Navigation & TabBar
- Floating iOS Tab Bar anchored above the home indicator (`bottom-0 pb-safe`).
- Active Tab Indicator: Smooth shared layout pill (`layoutId="activeTabPill"`) in Emerald `#10B981`.
- Center Action Button: Elevated circular plus button with coin flight animation trigger.

---

## 3. Anti-Patterns & Quality Constraints

- ❌ **No Latin-only or cursive decorative fonts** (e.g. Caveat, Quicksand) — only native Apple & Arabic system fonts.
- ❌ **No navy blue / generic templates** — Halala & Qirsh is defined by its Saudi Emerald financial identity.
- ❌ **No `transparent` keyword in Framer Motion animations** — use explicit `rgba(255, 255, 255, 0)` or `rgba(0, 0, 0, 0)`.
- ❌ **No landscape mode on iPhones** — iPhone orientation is locked to Portrait only (`UIInterfaceOrientationPortrait`) to protect financial sheets and keypad layouts.
- ❌ **No mock or fake backend APIs** — all storage, biometric auth, and SMS automations run 100% on-device.
- ❌ **No low-contrast text** — minimum WCAG AA 4.5:1 ratio maintained in both light and dark themes.
