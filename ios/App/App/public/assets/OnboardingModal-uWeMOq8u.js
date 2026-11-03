import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Gt as require_react, Ht as ArrowRight, Wt as ArrowLeft } from "./vendor-lucide-CSl_6olN.js";
import { f as require_jsx_runtime, t as motion } from "./vendor-motion-BgAFdAcG.js";
import { S as AnimatePresence, i as springs, o as CURRENCY_SYMBOLS } from "./motion-D7r0hT_j.js";
import { i as HalalaQirshLogo, w as nativeHaptics } from "./index-Csg_0pzK.js";
// src/components/OnboardingModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var OnboardingModal = ({ isOpen, onComplete, soundEnabled = true, currentLanguage = "ar" }) => {
	const [step, setStep] = (0, import_react.useState)(0);
	const [lang, setLang] = (0, import_react.useState)(currentLanguage);
	const [currency, setCurrency] = (0, import_react.useState)("SAR");
	const [salaryDay, setSalaryDay] = (0, import_react.useState)(27);
	const isEn = lang === "en";
	const isRTL = lang === "ar";
	const slides = [
		{
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "w-20 h-20 flex items-center justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HalalaQirshLogo, {
					size: "lg",
					isEnglish: isEn
				})
			}),
			title: isEn ? "Welcome to Halala & Qirsh" : "أهلاً بك في هللة وقرش",
			subtitle: isEn ? "Conscious budgeting starts from every Halala and Qirsh. Zero cloud servers, zero telemetry, and 100% private offline encryption on your device." : "من الهللة والقرش تبدأ الميزانية الرابحة. لا خوادم سحابية ولا حسابات ولا تتبع. كافة مصاريف وفواتيرك مشفرة ومحفوظة حصراً على جهازك."
		},
		{
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "w-20 h-20 text-emerald-500",
				viewBox: "0 0 80 80",
				fill: "none",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "40",
						cy: "40",
						r: "38",
						fill: "rgba(52, 211, 153, 0.12)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M26 54L38 42L46 50L56 34",
						stroke: "#10B981",
						strokeWidth: "4",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M48 34H56V42",
						stroke: "#10B981",
						strokeWidth: "4",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					})
				]
			}),
			title: isEn ? "Smart Budgets & Limits" : "تقسيم الميزانية وبنود المصاريف",
			subtitle: isEn ? "Distribute monthly expenses across customized categories, track daily spending allowances, and manage recurring family bills." : "وزع مرتبك ودخلك على بنود مصاريف محددة، راقب معدل الصرف اليومي المتاح، وتجنب المفاجآت بنهاية الشهر مع تنبيهات الفواتير الذكية."
		},
		{
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				className: "w-20 h-20 text-emerald-500",
				viewBox: "0 0 80 80",
				fill: "none",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: "40",
					cy: "40",
					r: "38",
					fill: "rgba(16, 185, 129, 0.15)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: "M40 24V56M28 36C28 32 34 30 40 30C46 30 52 32 52 36C52 42 28 42 28 48C28 52 34 54 40 54C46 54 52 52 52 48",
					stroke: "#10B981",
					strokeWidth: "3.5",
					strokeLinecap: "round"
				})]
			}),
			title: isEn ? "Setup Your Preference" : "ضبط العملة والراتب ولغة التطبيق",
			subtitle: isEn ? "Choose your primary household currency and monthly budget cycle." : "اختر العملة المفضلة لك ويوم إيداع الراتب لبدء تتبع نفقاتك باحترافية."
		}
	];
	const handleNext = () => {
		nativeHaptics.tap(soundEnabled);
		if (step < slides.length - 1) setStep(step + 1);
		else {
			nativeHaptics.success(soundEnabled);
			onComplete({
				hasCompletedOnboarding: true,
				language: lang,
				currency,
				salaryDay
			});
		}
	};
	const handleBack = () => {
		nativeHaptics.tap(soundEnabled);
		if (step > 0) setStep(step - 1);
	};
	if (!isOpen) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .92,
				opacity: 0
			},
			animate: {
				scale: 1,
				opacity: 1
			},
			exit: {
				scale: .92,
				opacity: 0
			},
			transition: springs.smooth,
			className: "relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-2xl border border-white/20 dark:border-white/10 text-center space-y-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
					mode: "wait",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							x: isRTL ? -25 : 25
						},
						animate: {
							opacity: 1,
							x: 0
						},
						exit: {
							opacity: 0,
							x: isRTL ? 25 : -25
						},
						transition: springs.smooth,
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
								animate: { y: [
									0,
									-6,
									0
								] },
								transition: {
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut"
								},
								className: "flex justify-center pt-2",
								children: slides[step].icon
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-black text-[#1C1C1E] dark:text-white tracking-tight",
								children: slides[step].title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#8E8E93] leading-relaxed mt-1.5 px-2",
								children: slides[step].subtitle
							})] }),
							step === 2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
								initial: {
									opacity: 0,
									y: 10
								},
								animate: {
									opacity: 1,
									y: 0
								},
								className: "space-y-3 pt-2 text-right",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-slate-700 dark:text-slate-300",
											children: isEn ? "Language" : "لغة الواجهة"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1 font-bold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setLang("ar"),
												className: `px-3 py-1 rounded-xl transition-all cursor-pointer ${lang === "ar" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-300"}`,
												children: "العربية"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setLang("en"),
												className: `px-3 py-1 rounded-xl transition-all cursor-pointer ${lang === "en" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-300"}`,
												children: "English"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-slate-700 dark:text-slate-300",
											children: isEn ? "Currency" : "العملة الأساسية"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
											value: currency,
											onChange: (e) => setCurrency(e.target.value),
											className: "px-3 py-1 rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-hidden cursor-pointer",
											children: Object.entries(CURRENCY_SYMBOLS).map(([code, meta]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: code,
												children: [
													code,
													" (",
													meta.symbol,
													")"
												]
											}, code))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-slate-700 dark:text-slate-300",
											children: isEn ? "Salary deposit day" : "يوم إيداع الراتب"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: 1,
												max: 31,
												value: salaryDay,
												onChange: (e) => setSalaryDay(parseInt(e.target.value, 10) || 1),
												className: "w-16 px-2 py-1 text-center rounded-xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white outline-hidden tabular-nums"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#8E8E93] text-[11px]",
												children: isEn ? "of month" : "من الشهر"
											})]
										})]
									})
								]
							})
						]
					}, step)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center gap-1.5 pt-2",
					children: slides.map((_, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						animate: {
							width: step === idx ? 24 : 7,
							backgroundColor: step === idx ? "#10B981" : "#D1D5DB"
						},
						transition: springs.smooth,
						className: "h-2 rounded-full"
					}, idx))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 pt-1",
					children: [step > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.button, {
						whileTap: { scale: .92 },
						type: "button",
						onClick: handleBack,
						className: "px-4 py-3 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer",
						children: isEn ? "Back" : "السابق"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						whileTap: { scale: .95 },
						type: "button",
						onClick: handleNext,
						className: "flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: step === slides.length - 1 ? isEn ? "Get Started" : "ابدأ استخدام التطبيق" : isEn ? "Next" : "التالي" }), isRTL ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { size: 16 })]
					})]
				})
			]
		})
	});
};
export { OnboardingModal };
