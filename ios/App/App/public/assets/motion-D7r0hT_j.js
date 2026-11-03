import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Gt as require_react } from "./vendor-lucide-CSl_6olN.js";
import { d as Encoding, f as Share, l as Filesystem, p as Preferences, u as Directory } from "./vendor-capacitor-C34yyovu.js";
import { a as hasReducedMotionListener, c as PresenceContext, d as LayoutGroupContext, f as require_jsx_runtime, i as initPrefersReducedMotion, l as useIsomorphicLayoutEffect, n as usePresence, o as prefersReducedMotion, r as MotionConfigContext, s as isHTMLElement, u as useConstant } from "./vendor-motion-BgAFdAcG.js";
// node_modules/framer-motion/dist/es/utils/use-composed-ref.mjs
var import_jsx_runtime = require_jsx_runtime();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* Taken from https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/compose-refs.tsx
*/
/**
* Set a given ref to a given value
* This utility takes care of different types of refs: callback refs and RefObject(s)
*/
function setRef(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
/**
* A utility to compose multiple refs together
* Accepts callback refs and RefObject(s)
*/
function composeRefs(...refs) {
	return (node) => {
		let hasCleanup = false;
		const cleanups = refs.map((ref) => {
			const cleanup = setRef(ref, node);
			if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
			return cleanup;
		});
		if (hasCleanup) return () => {
			for (let i = 0; i < cleanups.length; i++) {
				const cleanup = cleanups[i];
				if (typeof cleanup === "function") cleanup();
				else setRef(refs[i], null);
			}
		};
	};
}
/**
* A custom hook that composes multiple refs
* Accepts callback refs and RefObject(s)
*/
function useComposedRefs(...refs) {
	return import_react.useCallback(composeRefs(...refs), refs);
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/PopChild.mjs
/**
* Measurement functionality has to be within a separate component
* to leverage snapshot lifecycle.
*/
var PopChildMeasure = class extends import_react.Component {
	getSnapshotBeforeUpdate(prevProps) {
		const element = this.props.childRef.current;
		if (isHTMLElement(element) && prevProps.isPresent && !this.props.isPresent && this.props.pop !== false) {
			const parent = element.offsetParent;
			const parentWidth = isHTMLElement(parent) ? parent.offsetWidth || 0 : 0;
			const parentHeight = isHTMLElement(parent) ? parent.offsetHeight || 0 : 0;
			const computedStyle = getComputedStyle(element);
			const size = this.props.sizeRef.current;
			size.height = parseFloat(computedStyle.height);
			size.width = parseFloat(computedStyle.width);
			size.top = element.offsetTop;
			size.left = element.offsetLeft;
			size.right = parentWidth - size.width - size.left;
			size.bottom = parentHeight - size.height - size.top;
			size.direction = computedStyle.direction;
		}
		return null;
	}
	/**
	* Required with getSnapshotBeforeUpdate to stop React complaining.
	*/
	componentDidUpdate() {}
	render() {
		return this.props.children;
	}
};
function PopChild({ children, isPresent, anchorX, anchorY, root, pop }) {
	const id = (0, import_react.useId)();
	const ref = (0, import_react.useRef)(null);
	const size = (0, import_react.useRef)({
		width: 0,
		height: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		direction: "ltr"
	});
	const { nonce } = (0, import_react.useContext)(MotionConfigContext);
	const composedRef = useComposedRefs(ref, pop !== false ? children.props?.ref ?? children?.ref : void 0);
	/**
	* We create and inject a style block so we can apply this explicit
	* sizing in a non-destructive manner by just deleting the style block.
	*
	* We can't apply size via render as the measurement happens
	* in getSnapshotBeforeUpdate (post-render), likewise if we apply the
	* styles directly on the DOM node, we might be overwriting
	* styles set via the style prop.
	*/
	(0, import_react.useInsertionEffect)(() => {
		const { width, height, top, left, right, bottom, direction } = size.current;
		if (isPresent || pop === false || !ref.current || !width || !height) return;
		const isRTL = direction === "rtl";
		const x = anchorX === "left" ? isRTL ? `right: ${right}` : `left: ${left}` : isRTL ? `left: ${left}` : `right: ${right}`;
		const y = anchorY === "bottom" ? `bottom: ${bottom}` : `top: ${top}`;
		ref.current.dataset.motionPopId = id;
		const style = document.createElement("style");
		if (nonce) style.nonce = nonce;
		const parent = root ?? document.head;
		parent.appendChild(style);
		if (style.sheet) style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            ${x}px !important;
            ${y}px !important;
          }
        `);
		return () => {
			ref.current?.removeAttribute("data-motion-pop-id");
			if (parent.contains(style)) parent.removeChild(style);
		};
	}, [isPresent]);
	return (0, import_jsx_runtime.jsx)(PopChildMeasure, {
		isPresent,
		childRef: ref,
		sizeRef: size,
		pop,
		children: pop === false ? children : import_react.cloneElement(children, { ref: composedRef })
	});
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/PresenceChild.mjs
var PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, anchorX, anchorY, root }) => {
	const presenceChildren = useConstant(newChildrenMap);
	const id = (0, import_react.useId)();
	const isPresentRef = (0, import_react.useRef)(isPresent);
	const onExitCompleteRef = (0, import_react.useRef)(onExitComplete);
	useIsomorphicLayoutEffect(() => {
		isPresentRef.current = isPresent;
		onExitCompleteRef.current = onExitComplete;
	});
	let isReusedContext = true;
	let context = (0, import_react.useMemo)(() => {
		isReusedContext = false;
		return {
			id,
			initial,
			isPresent,
			custom,
			onExitComplete: (childId) => {
				presenceChildren.set(childId, true);
				for (const isComplete of presenceChildren.values()) if (!isComplete) return;
				onExitComplete && onExitComplete();
			},
			register: (childId) => {
				presenceChildren.set(childId, false);
				return () => {
					presenceChildren.delete(childId);
					!isPresentRef.current && !presenceChildren.size && onExitCompleteRef.current?.();
				};
			}
		};
	}, [
		isPresent,
		presenceChildren,
		onExitComplete
	]);
	/**
	* If the presence of a child affects the layout of the components around it,
	* we want to make a new context value to ensure they get re-rendered
	* so they can detect that layout change.
	*/
	if (presenceAffectsLayout && isReusedContext) context = { ...context };
	(0, import_react.useMemo)(() => {
		presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
	}, [isPresent]);
	/**
	* If there's no `motion` components to fire exit animations, we want to remove this
	* component immediately.
	*/
	import_react.useEffect(() => {
		!isPresent && !presenceChildren.size && onExitComplete && onExitComplete();
	}, [isPresent]);
	children = (0, import_jsx_runtime.jsx)(PopChild, {
		pop: mode === "popLayout",
		isPresent,
		anchorX,
		anchorY,
		root,
		children
	});
	return (0, import_jsx_runtime.jsx)(PresenceContext.Provider, {
		value: context,
		children
	});
};
function newChildrenMap() {
	return /* @__PURE__ */ new Map();
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/utils.mjs
var getChildKey = (child) => child.key || "";
function onlyElements(children) {
	const filtered = [];
	import_react.Children.forEach(children, (child) => {
		if ((0, import_react.isValidElement)(child)) filtered.push(child);
	});
	return filtered;
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs
/**
* `AnimatePresence` enables the animation of components that have been removed from the tree.
*
* When adding/removing more than a single child, every child **must** be given a unique `key` prop.
*
* Any `motion` components that have an `exit` property defined will animate out when removed from
* the tree.
*
* ```jsx
* import { motion, AnimatePresence } from 'framer-motion'
*
* export const Items = ({ items }) => (
*   <AnimatePresence>
*     {items.map(item => (
*       <motion.div
*         key={item.id}
*         initial={{ opacity: 0 }}
*         animate={{ opacity: 1 }}
*         exit={{ opacity: 0 }}
*       />
*     ))}
*   </AnimatePresence>
* )
* ```
*
* You can sequence exit animations throughout a tree using variants.
*
* If a child contains multiple `motion` components with `exit` props, it will only unmount the child
* once all `motion` components have finished animating out. Likewise, any components using
* `usePresence` all need to call `safeToRemove`.
*
* @public
*/
var AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false, anchorX = "left", anchorY = "top", root }) => {
	const [isParentPresent, safeToRemove] = usePresence(propagate);
	/**
	* Filter any children that aren't ReactElements. We can only track components
	* between renders with a props.key.
	*/
	const presentChildren = (0, import_react.useMemo)(() => onlyElements(children), [children]);
	/**
	* Track the keys of the currently rendered children. This is used to
	* determine which children are exiting.
	*/
	const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
	/**
	* If `initial={false}` we only want to pass this to components in the first render.
	*/
	const isInitialRender = (0, import_react.useRef)(true);
	/**
	* A ref containing the currently present children. When all exit animations
	* are complete, we use this to re-render the component with the latest children
	* *committed* rather than the latest children *rendered*.
	*/
	const pendingPresentChildren = (0, import_react.useRef)(presentChildren);
	/**
	* Track which exiting children have finished animating out.
	*/
	const exitComplete = useConstant(() => /* @__PURE__ */ new Map());
	/**
	* Track which components are currently processing exit to prevent duplicate processing.
	*/
	const exitingComponents = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	/**
	* Save children to render as React state. To ensure this component is concurrent-safe,
	* we check for exiting children via an effect.
	*/
	const [diffedChildren, setDiffedChildren] = (0, import_react.useState)(presentChildren);
	const [renderedChildren, setRenderedChildren] = (0, import_react.useState)(presentChildren);
	useIsomorphicLayoutEffect(() => {
		isInitialRender.current = false;
		pendingPresentChildren.current = presentChildren;
		/**
		* Update complete status of exiting children.
		*/
		for (let i = 0; i < renderedChildren.length; i++) {
			const key = getChildKey(renderedChildren[i]);
			if (!presentKeys.includes(key)) {
				if (exitComplete.get(key) !== true) exitComplete.set(key, false);
			} else {
				exitComplete.delete(key);
				exitingComponents.current.delete(key);
			}
		}
	}, [
		renderedChildren,
		presentKeys.length,
		presentKeys.join("-")
	]);
	const exitingChildren = [];
	if (presentChildren !== diffedChildren) {
		let nextChildren = [...presentChildren];
		/**
		* Loop through all the currently rendered components and decide which
		* are exiting.
		*/
		for (let i = 0; i < renderedChildren.length; i++) {
			const child = renderedChildren[i];
			const key = getChildKey(child);
			if (!presentKeys.includes(key)) {
				nextChildren.splice(i, 0, child);
				exitingChildren.push(child);
			}
		}
		/**
		* If we're in "wait" mode, and we have exiting children, we want to
		* only render these until they've all exited.
		*/
		if (mode === "wait" && exitingChildren.length) nextChildren = exitingChildren;
		setRenderedChildren(onlyElements(nextChildren));
		setDiffedChildren(presentChildren);
		/**
		* Early return to ensure once we've set state with the latest diffed
		* children, we can immediately re-render.
		*/
		return null;
	}
	/**
	* If we've been provided a forceRender function by the LayoutGroupContext,
	* we can use it to force a re-render amongst all surrounding components once
	* all components have finished animating out.
	*/
	const { forceRender } = (0, import_react.useContext)(LayoutGroupContext);
	return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: renderedChildren.map((child) => {
		const key = getChildKey(child);
		const isPresent = propagate && !isParentPresent ? false : presentChildren === renderedChildren || presentKeys.includes(key);
		const onExit = () => {
			if (exitingComponents.current.has(key)) return;
			if (exitComplete.has(key)) {
				exitingComponents.current.add(key);
				exitComplete.set(key, true);
			} else return;
			let isEveryExitComplete = true;
			exitComplete.forEach((isExitComplete) => {
				if (!isExitComplete) isEveryExitComplete = false;
			});
			if (isEveryExitComplete) {
				forceRender?.();
				setRenderedChildren(pendingPresentChildren.current);
				propagate && safeToRemove?.();
				onExitComplete && onExitComplete();
			}
		};
		return (0, import_jsx_runtime.jsx)(PresenceChild, {
			isPresent,
			initial: !isInitialRender.current || initial ? void 0 : false,
			custom,
			presenceAffectsLayout,
			mode,
			root,
			onExitComplete: isPresent ? void 0 : onExit,
			anchorX,
			anchorY,
			children: child
		}, key);
	}) });
};
// node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs
/**
* A hook that returns `true` if we should be using reduced motion based on the current device's Reduced Motion setting.
*
* This can be used to implement changes to your UI based on Reduced Motion. For instance, replacing motion-sickness inducing
* `x`/`y` animations with `opacity`, disabling the autoplay of background videos, or turning off parallax motion.
*
* It will actively respond to changes and re-render your components with the latest setting.
*
* ```jsx
* export function Sidebar({ isOpen }) {
*   const shouldReduceMotion = useReducedMotion()
*   const closedX = shouldReduceMotion ? 0 : "-100%"
*
*   return (
*     <motion.div animate={{
*       opacity: isOpen ? 1 : 0,
*       x: isOpen ? 0 : closedX
*     }} />
*   )
* }
* ```
*
* @return boolean
*
* @public
*/
function useReducedMotion() {
	/**
	* Lazy initialisation of prefersReducedMotion
	*/
	!hasReducedMotionListener.current && initPrefersReducedMotion();
	const [shouldReduceMotion] = (0, import_react.useState)(prefersReducedMotion.current);
	/**
	* TODO See if people miss automatically updating shouldReduceMotion setting
	*/
	return shouldReduceMotion;
}
// src/utils/systemFlow.ts
/**
* Global tracker for active iOS native system UI flows.
* Prevents the app from falsely re-locking when native system dialogs
* (Biometrics prompt, Share Sheet, file picker, notification permission prompt)
* trigger an appStateChange inactive/active transition.
*/
var systemFlowCount = 0;
function startSystemFlow() {
	systemFlowCount++;
}
function endSystemFlow(gracePeriodMs = 1e3) {
	setTimeout(() => {
		systemFlowCount = Math.max(0, systemFlowCount - 1);
	}, gracePeriodMs);
}
function isSystemFlowActive() {
	return systemFlowCount > 0;
}
async function withSystemFlow(fn, gracePeriodMs = 1e3) {
	systemFlowCount++;
	try {
		return await fn();
	} finally {
		setTimeout(() => {
			systemFlowCount = Math.max(0, systemFlowCount - 1);
		}, gracePeriodMs);
	}
}
// src/utils/nativeShare.ts
var NativeShareService = class {
	static isNative() {
		return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
	}
	static async shareText(title, text, dialogTitle = "Share Report") {
		return withSystemFlow(async () => {
			try {
				if ((await Share.canShare()).value) {
					await Share.share({
						title,
						text,
						dialogTitle
					});
					return true;
				}
			} catch {}
			if (typeof navigator !== "undefined" && navigator.share) try {
				await navigator.share({
					title,
					text
				});
				return true;
			} catch {}
			if (typeof navigator !== "undefined" && navigator.clipboard) try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {}
			return false;
		});
	}
	static async shareFile(fileName, content, mimeType = "text/csv") {
		return withSystemFlow(async () => {
			if (this.isNative()) try {
				const writeResult = await Filesystem.writeFile({
					path: fileName,
					data: content,
					directory: Directory.Cache,
					encoding: Encoding.UTF8
				});
				await Share.share({
					title: fileName,
					url: writeResult.uri,
					dialogTitle: fileName
				});
				return true;
			} catch (err) {
				console.error("Native Filesystem/Share failed:", err);
			}
			const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
			if (typeof navigator !== "undefined" && navigator.canShare) try {
				const file = new File([blob], fileName, { type: mimeType });
				if (navigator.canShare({ files: [file] })) {
					await navigator.share({
						files: [file],
						title: fileName
					});
					return true;
				}
			} catch {}
			try {
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = fileName;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				setTimeout(() => URL.revokeObjectURL(url), 1e3);
				return true;
			} catch {
				return false;
			}
		});
	}
};
// src/utils/storage.ts
var STORAGE_KEY = "ios_home_expenses_store_v1";
var SHOWN_BANNERS_KEY = "home_expenses_shown_banners_v1";
var CURRENCY_SYMBOLS = {
	SAR: {
		symbol: "ر.س",
		name: "ريال سعودي",
		nameEn: "Saudi Riyal"
	},
	EGP: {
		symbol: "ج.م",
		name: "جنيه مصري",
		nameEn: "Egyptian Pound"
	},
	AED: {
		symbol: "د.إ",
		name: "درهم إماراتي",
		nameEn: "UAE Dirham"
	},
	KWD: {
		symbol: "د.ك",
		name: "دينار كويتي",
		nameEn: "Kuwaiti Dinar"
	},
	QAR: {
		symbol: "ر.ق",
		name: "ريال قطري",
		nameEn: "Qatari Riyal"
	},
	USD: {
		symbol: "$",
		name: "دولار أمريكي",
		nameEn: "US Dollar"
	},
	EUR: {
		symbol: "€",
		name: "يورو",
		nameEn: "Euro"
	}
};
var DEFAULT_CATEGORIES = [
	{
		id: "food",
		name: "البقالة والسوبرماركت",
		nameEn: "Groceries & Food",
		icon: "ShoppingCart",
		color: "#10B981",
		bgColor: "#ECFDF5",
		monthlyLimit: 2500
	},
	{
		id: "bills",
		name: "فواتير وخدمات المنزل",
		nameEn: "Utilities & Bills",
		icon: "Zap",
		color: "#F59E0B",
		bgColor: "#FFFBEB",
		monthlyLimit: 900
	},
	{
		id: "housing",
		name: "إيجار وسكن",
		nameEn: "Rent & Housing",
		icon: "Home",
		color: "#3B82F6",
		bgColor: "#EFF6FF",
		monthlyLimit: 4e3
	},
	{
		id: "kids",
		name: "الأطفال والمدارس",
		nameEn: "Kids & School",
		icon: "Baby",
		color: "#EC4899",
		bgColor: "#FDF2F8",
		monthlyLimit: 1200
	},
	{
		id: "maintenance",
		name: "صيانة وتجهيزات البيت",
		nameEn: "Home Maintenance",
		icon: "Wrench",
		color: "#8B5CF6",
		bgColor: "#F5F3FF",
		monthlyLimit: 600
	},
	{
		id: "health",
		name: "الصحة والأدوية",
		nameEn: "Health & Medical",
		icon: "HeartPulse",
		color: "#EF4444",
		bgColor: "#FEF2F2",
		monthlyLimit: 500
	},
	{
		id: "transport",
		name: "بنزين ومواصلات",
		nameEn: "Transport & Fuel",
		icon: "Car",
		color: "#6366F1",
		bgColor: "#EEF2FF",
		monthlyLimit: 800
	},
	{
		id: "entertainment",
		name: "ترفيه ومطاعم عائلية",
		nameEn: "Outings & Dining",
		icon: "Coffee",
		color: "#14B8A6",
		bgColor: "#F0FDFA",
		monthlyLimit: 700
	},
	{
		id: "emergency",
		name: "طوارئ ومتفرقات",
		nameEn: "Emergency & Misc",
		icon: "Shield",
		color: "#64748B",
		bgColor: "#F8FAFC",
		monthlyLimit: 800
	}
];
var getCurrentMonthString = () => {
	const d = /* @__PURE__ */ new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
/**
* Clean default app state for new App Store users:
* Zero seeded transactions, zero seeded bills, zero seeded groceries.
* Only default categories and sensible default settings.
*/
var getDefaultAppData = () => ({
	categories: DEFAULT_CATEGORIES,
	expenses: [],
	bills: [],
	groceries: [],
	subscriptions: [],
	dismissedSubscriptionMerchants: [],
	jamiyyas: [],
	settings: {
		budgetMode: "sum_categories",
		totalMonthlyBudget: 12e3,
		salaryDay: 27,
		currency: "SAR",
		soundEnabled: true,
		themeMode: "light",
		selectedMonth: getCurrentMonthString(),
		notificationsEnabled: true,
		notificationLeadDays: 1,
		dailyReminderEnabled: true,
		dailyReminderTime: "21:00",
		language: "ar",
		isPasscodeEnabled: false,
		biometricsEnabled: false,
		autoLockTimeout: 30,
		animations: "full",
		hideAmounts: false,
		hasCompletedOnboarding: false,
		autoCaptureMode: "apple_pay",
		icloudSyncEnabled: true,
		lastIcloudBackupTimestamp: void 0
	}
});
var normalizeAutoCaptureMode = (mode) => {
	if (mode === "apple_pay" || mode === "bank_sms" || mode === "both") return mode;
	return "apple_pay";
};
/**
* Validates the structure of imported JSON backup
*/
var validateBackupData = (raw) => {
	if (!raw || typeof raw !== "object") return false;
	const candidate = raw;
	if (!Array.isArray(candidate.categories) || candidate.categories.length === 0) return false;
	if (!Array.isArray(candidate.expenses)) return false;
	if (!Array.isArray(candidate.bills)) return false;
	if (!Array.isArray(candidate.groceries)) return false;
	if (!candidate.settings || typeof candidate.settings !== "object") return false;
	return true;
};
/**
* Synchronous memory cache & fallback loader
*/
var loadAppData = () => {
	if (typeof window === "undefined") return getDefaultAppData();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			const initial = getDefaultAppData();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
			return initial;
		}
		const parsed = JSON.parse(raw);
		const defaultData = getDefaultAppData();
		return {
			categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
			expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
			bills: Array.isArray(parsed.bills) ? parsed.bills : [],
			groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
			subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
			dismissedSubscriptionMerchants: Array.isArray(parsed.dismissedSubscriptionMerchants) ? parsed.dismissedSubscriptionMerchants : [],
			jamiyyas: Array.isArray(parsed.jamiyyas) ? parsed.jamiyyas : [],
			settings: {
				...defaultData.settings,
				...parsed.settings || {},
				autoLockTimeout: parsed.settings?.autoLockTimeout ?? 30,
				autoCaptureMode: normalizeAutoCaptureMode(parsed.settings?.autoCaptureMode)
			}
		};
	} catch (err) {
		console.error("Failed to load local storage data:", err);
		return getDefaultAppData();
	}
};
/**
* Asynchronously loads from Capacitor Preferences (Native iOS NSUserDefaults)
* with automatic migration from localStorage if needed.
*/
var loadAppDataFromPreferences = async () => {
	const defaultData = getDefaultAppData();
	try {
		const { value } = await Preferences.get({ key: STORAGE_KEY });
		if (value) {
			const parsed = JSON.parse(value);
			const merged = {
				categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
				expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
				bills: Array.isArray(parsed.bills) ? parsed.bills : [],
				groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
				subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
				dismissedSubscriptionMerchants: Array.isArray(parsed.dismissedSubscriptionMerchants) ? parsed.dismissedSubscriptionMerchants : [],
				jamiyyas: Array.isArray(parsed.jamiyyas) ? parsed.jamiyyas : [],
				settings: {
					...defaultData.settings,
					...parsed.settings || {},
					autoLockTimeout: parsed.settings?.autoLockTimeout ?? 30,
					autoCaptureMode: normalizeAutoCaptureMode(parsed.settings?.autoCaptureMode)
				}
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
			return merged;
		}
		const localRaw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
		if (localRaw) {
			console.log("Migrating existing localStorage data into Capacitor Preferences...");
			const parsed = JSON.parse(localRaw);
			const merged = {
				categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultData.categories,
				expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
				bills: Array.isArray(parsed.bills) ? parsed.bills : [],
				groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
				subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
				dismissedSubscriptionMerchants: Array.isArray(parsed.dismissedSubscriptionMerchants) ? parsed.dismissedSubscriptionMerchants : [],
				jamiyyas: Array.isArray(parsed.jamiyyas) ? parsed.jamiyyas : [],
				settings: {
					...defaultData.settings,
					...parsed.settings || {},
					autoLockTimeout: parsed.settings?.autoLockTimeout ?? 30,
					autoCaptureMode: normalizeAutoCaptureMode(parsed.settings?.autoCaptureMode)
				}
			};
			await Preferences.set({
				key: STORAGE_KEY,
				value: JSON.stringify(merged)
			});
			return merged;
		}
		await Preferences.set({
			key: STORAGE_KEY,
			value: JSON.stringify(defaultData)
		});
		localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
		return defaultData;
	} catch (err) {
		console.error("Preferences read error, using localStorage fallback:", err);
		return loadAppData();
	}
};
/**
* Saves both to Capacitor Preferences (persistent against iOS eviction)
* and to localStorage.
*/
var saveAppData = (data) => {
	if (typeof window === "undefined") return;
	const json = JSON.stringify(data);
	try {
		localStorage.setItem(STORAGE_KEY, json);
	} catch (err) {
		console.error("Failed to save to local storage:", err);
	}
	Preferences.set({
		key: STORAGE_KEY,
		value: json
	}).catch((err) => {
		console.error("Failed to save to Capacitor Preferences:", err);
	});
};
/**
* Track shown in-app notification banners so each bill is shown at most once per day
*/
var getShownBannerKeys = async () => {
	try {
		const { value } = await Preferences.get({ key: SHOWN_BANNERS_KEY });
		if (!value) return [];
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
};
var markBannerKeyShown = async (key) => {
	try {
		const existing = await getShownBannerKeys();
		if (!existing.includes(key)) {
			const updated = [...existing.slice(-99), key];
			await Preferences.set({
				key: SHOWN_BANNERS_KEY,
				value: JSON.stringify(updated)
			});
		}
	} catch {}
};
/**
* Exports full app data as JSON and triggers native iOS Share Sheet
*/
var exportDataAsJSON = async (data) => {
	const json = JSON.stringify(data, null, 2);
	const fileName = `home_expenses_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
	return await NativeShareService.shareFile(fileName, json, "application/json");
};
/**
* Sanitizes a CSV cell to prevent CSV Formula / DDE Injection (OWASP recommendation).
* If a cell string starts with =, +, -, @, \t, or \r, prepend a single quote (')
* so spreadsheet applications (Excel, LibreOffice) treat it strictly as text.
*/
var sanitizeCsvCell = (val) => {
	if (val === null || val === void 0) return "\"\"";
	if (typeof val === "number") return isNaN(val) ? "0" : String(val);
	let str = String(val);
	if (/^[=+\-@\t\r]/.test(str) || /^[=+\-@\t\r]/.test(str.trim())) str = `'${str}`;
	return `"${str.replace(/"/g, "\"\"")}"`;
};
/**
* Exports expenses as CSV with UTF-8 BOM and triggers native iOS Share Sheet
*/
var exportExpensesToCSV = async (expenses, categories, currencySymbol, isEnglish = false) => {
	const catMap = new Map(categories.map((c) => [c.id, isEnglish && c.nameEn ? c.nameEn : c.name]));
	const headers = isEnglish ? [
		"Date",
		"Item",
		"Amount",
		"Currency",
		"Category",
		"Payment Method",
		"Payer",
		"Notes"
	] : [
		"التاريخ",
		"البند",
		"المبلغ",
		"العملة",
		"الفئة",
		"طريقة الدفع",
		"المسؤول",
		"ملاحظات"
	];
	const rows = expenses.map((e) => [
		sanitizeCsvCell(e.date),
		sanitizeCsvCell(e.title),
		cleanMoneyAmount(e.amount),
		sanitizeCsvCell(currencySymbol),
		sanitizeCsvCell(catMap.get(e.categoryId) || (isEnglish ? "General" : "غير محدد")),
		sanitizeCsvCell(e.paymentMethod),
		sanitizeCsvCell(e.payer),
		sanitizeCsvCell(e.notes || "")
	]);
	const csvContent = "﻿" + [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.join(","))].join("\n");
	const fileName = `expenses_report_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
	return await NativeShareService.shareFile(fileName, csvContent, "text/csv");
};
var cleanMoneyAmount = (amount) => {
	if (typeof amount !== "number" || isNaN(amount)) return 0;
	return Math.round((amount + Number.EPSILON) * 100) / 100;
};
var sumMoney = (amounts) => {
	return amounts.reduce((acc, curr) => {
		if (typeof curr !== "number" || isNaN(curr)) return acc;
		return acc + Math.round((curr + Number.EPSILON) * 100);
	}, 0) / 100;
};
var formatMoney = (amount, currency, lang = "ar") => {
	const sym = CURRENCY_SYMBOLS[currency]?.symbol || "ر.س";
	const formattedNum = cleanMoneyAmount(amount).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	});
	return lang === "ar" ? `${formattedNum} ${sym}` : `${sym} ${formattedNum}`;
};
// src/utils/motion.ts
/**
* Standard spring presets specified in Design Constitution:
* - snappy: high stiffness for tight taps and fast micro-interactions
* - smooth: natural ease for layout transitions and modal slides
* - bouncy: delightful response for icons, badges, and feedback moments
*/
var springs = {
	snappy: {
		type: "spring",
		stiffness: 500,
		damping: 38
	},
	smooth: {
		type: "spring",
		stiffness: 260,
		damping: 28
	},
	bouncy: {
		type: "spring",
		stiffness: 380,
		damping: 18
	}
};
/**
* Fade duration presets (150ms - 220ms)
*/
var fades = {
	fast: {
		duration: .15,
		ease: [
			.16,
			1,
			.3,
			1
		]
	},
	standard: {
		duration: .22,
		ease: [
			.16,
			1,
			.3,
			1
		]
	}
};
/**
* Stagger helper: max 40ms between items, capped at 400ms total
*/
function getStaggerDelay(index, stepMs = 35, maxTotalSec = .4) {
	return Math.min(index * stepMs / 1e3, maxTotalSec);
}
(0, import_react.createContext)({
	mode: "full",
	isReduced: false,
	isOff: false,
	spring: springs.smooth,
	snappy: springs.snappy,
	bouncy: springs.bouncy
});
/**
* Custom hook to consume motion presets honoring system + user animation setting.
*/
function useMotionConfig(userSetting) {
	const systemReduced = useReducedMotion();
	const effectiveMode = userSetting === "off" ? "off" : userSetting === "reduced" || systemReduced ? "reduced" : "full";
	const isReduced = effectiveMode === "reduced";
	const isOff = effectiveMode === "off";
	const shouldDisableMotion = isReduced || isOff;
	return {
		mode: effectiveMode,
		isReduced: shouldDisableMotion,
		isOff,
		spring: shouldDisableMotion ? { duration: isOff ? 0 : .15 } : springs.smooth,
		snappy: shouldDisableMotion ? { duration: isOff ? 0 : .1 } : springs.snappy,
		bouncy: shouldDisableMotion ? { duration: isOff ? 0 : .15 } : springs.bouncy
	};
}
/**
* Reusable card entrance variants
*/
var cardVariants = {
	hidden: {
		opacity: 0,
		y: 14,
		scale: .98
	},
	visible: (i = 0) => ({
		opacity: 1,
		y: 0,
		scale: 1,
		transition: {
			delay: getStaggerDelay(i),
			...springs.smooth
		}
	}),
	exit: {
		opacity: 0,
		scale: .97,
		transition: fades.fast
	}
};
var reducedCardVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: fades.fast
	},
	exit: {
		opacity: 0,
		transition: fades.fast
	}
};
export { AnimatePresence as S, validateBackupData as _, useMotionConfig as a, startSystemFlow as b, exportDataAsJSON as c, getShownBannerKeys as d, loadAppData as f, sumMoney as g, saveAppData as h, springs as i, exportExpensesToCSV as l, markBannerKeyShown as m, fades as n, CURRENCY_SYMBOLS as o, loadAppDataFromPreferences as p, reducedCardVariants as r, cleanMoneyAmount as s, cardVariants as t, formatMoney as u, endSystemFlow as v, withSystemFlow as x, isSystemFlowActive as y };
