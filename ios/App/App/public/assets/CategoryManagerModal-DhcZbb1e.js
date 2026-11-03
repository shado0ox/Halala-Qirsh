import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Et as Check, Gt as require_react, N as Plus, _ as Sparkles, m as Trash2, n as X } from "./vendor-lucide-CSl_6olN.js";
import { f as require_jsx_runtime, t as motion } from "./vendor-motion-BgAFdAcG.js";
import { S as AnimatePresence, o as CURRENCY_SYMBOLS } from "./motion-D7r0hT_j.js";
import { T as sound, a as AmountInput, c as FormFooter, d as dismissKeyboard, f as handleModalBackdropClick, g as CategoryIcon, h as COLOR_PALETTE, l as TextInput, m as AVAILABLE_ICONS, o as FormButton, p as useKeyboardState, r as Amount, s as FormField, u as KeyboardDismissButton, v as translations } from "./index-Csg_0pzK.js";
// src/components/CategoryManagerModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CategoryManagerModal = ({ isOpen, onClose, categories, currency, onSaveCategory, onDeleteCategory, soundEnabled = true, onShowToast, language = "ar", hideAmounts = false }) => {
	const t = translations[language || "ar"];
	const isEn = language === "en";
	const { isKeyboardOpen } = useKeyboardState();
	const [editingCategory, setEditingCategory] = (0, import_react.useState)(null);
	const [isCreatingNew, setIsCreatingNew] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)("");
	const [iconName, setIconName] = (0, import_react.useState)("Tag");
	const [color, setColor] = (0, import_react.useState)("#3B82F6");
	const [bgColor, setBgColor] = (0, import_react.useState)("#EFF6FF");
	const [monthlyLimit, setMonthlyLimit] = (0, import_react.useState)("500");
	const [error, setError] = (0, import_react.useState)("");
	const currencySymbol = CURRENCY_SYMBOLS[currency]?.symbol || (isEn ? "SAR" : "ر.س");
	const startCreate = () => {
		sound.playTap(soundEnabled);
		setIsCreatingNew(true);
		setEditingCategory(null);
		setName("");
		setIconName("ShoppingCart");
		setColor("#3B82F6");
		setBgColor("#EFF6FF");
		setMonthlyLimit("1000");
		setError("");
	};
	const startEdit = (cat) => {
		sound.playTap(soundEnabled);
		setEditingCategory(cat);
		setIsCreatingNew(false);
		setName(isEn && cat.nameEn ? cat.nameEn : cat.name);
		setIconName(cat.icon);
		setColor(cat.color);
		setBgColor(cat.bgColor);
		setMonthlyLimit(String(cat.monthlyLimit));
		setError("");
	};
	const cancelEdit = () => {
		sound.playTap(soundEnabled);
		setEditingCategory(null);
		setIsCreatingNew(false);
		setError("");
	};
	const handleSave = (e) => {
		e.preventDefault();
		if (!name.trim()) {
			setError(t.validationCategoryNameRequired);
			return;
		}
		const limit = parseFloat(monthlyLimit);
		if (isNaN(limit) || limit < 0) {
			setError(t.validationMonthlyLimitRequired);
			return;
		}
		const catToSave = {
			id: editingCategory ? editingCategory.id : `cat-custom-${Date.now()}`,
			name: name.trim(),
			nameEn: isEn ? name.trim() : editingCategory?.nameEn,
			icon: iconName,
			color,
			bgColor,
			monthlyLimit: limit,
			isCustom: editingCategory ? editingCategory.isCustom : true
		};
		sound.playSuccess(soundEnabled);
		onSaveCategory(catToSave);
		cancelEdit();
	};
	const handleDelete = (id) => {
		sound.playDelete(soundEnabled);
		onDeleteCategory(id);
		if (editingCategory?.id === id) cancelEdit();
	};
	const iconKeys = Object.keys(AVAILABLE_ICONS);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: isOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			onClick: (e) => handleModalBackdropClick(e, onClose, soundEnabled),
			className: "absolute inset-0 bg-black/55 cursor-pointer"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .95,
				opacity: 0,
				y: 10
			},
			animate: {
				scale: 1,
				opacity: 1,
				y: 0
			},
			exit: {
				scale: .95,
				opacity: 0,
				y: 10
			},
			onClick: (e) => {
				const target = e.target;
				if (![
					"input",
					"button",
					"textarea",
					"select"
				].includes(target.tagName.toLowerCase())) dismissKeyboard();
			},
			className: "relative w-full max-w-md max-h-[85vh] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-200/50 dark:border-slate-800",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5EA] dark:border-[#2C2C2E]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								sound.playTap(soundEnabled);
								onClose();
							},
							className: "w-8 h-8 rounded-full bg-[#E5E5EA]/70 dark:bg-[#2C2C2E] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors cursor-pointer",
							"aria-label": t.close,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 18 })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyboardDismissButton, {
							visible: isKeyboardOpen,
							isEnglish: isEn,
							soundEnabled
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm md:text-base font-bold text-[#1C1C1E] dark:text-white",
						children: isCreatingNew ? t.addNewCategoryBtn : editingCategory ? t.editCategoryTitle : t.manageCategoriesTitle
					}),
					!isCreatingNew && !editingCategory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: startCreate,
						className: "flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isEn ? "New" : "جديد" })]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: cancelEdit,
						className: "text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer",
						children: t.cancel
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar",
				children: isCreatingNew || editingCategory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSave,
					className: "space-y-4",
					children: [
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium text-center",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryIcon, {
									iconName,
									color,
									bgColor,
									size: "md"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm font-bold text-[#1C1C1E] dark:text-white",
									children: name || (isEn ? "Category Name" : "اسم التصنيف")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-[#8E8E93] flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.assignedBudget }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Amount, {
										value: parseFloat(monthlyLimit) || 0,
										currency,
										lang: language,
										hideAmounts
									})]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold",
								children: isEn ? "Preview" : "معاينة"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: t.categoryNameLabel,
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								type: "text",
								value: name,
								onChange: (e) => {
									setName(e.target.value);
									setError("");
								},
								placeholder: t.categoryNamePlaceholder,
								autoFocus: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: `${t.monthlyLimitLabel} (${currencySymbol})`,
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AmountInput, {
								value: monthlyLimit,
								onChange: (e) => {
									setMonthlyLimit(e.target.value);
									setError("");
								},
								placeholder: "0",
								currencySymbol
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: t.categoryColorLabel,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2.5",
								children: COLOR_PALETTE.map((pal) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										sound.playTap(soundEnabled);
										setColor(pal.color);
										setBgColor(pal.bgColor);
									},
									className: `w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${color === pal.color ? "scale-110 ring-2 ring-offset-2 ring-emerald-500" : "hover:scale-105"}`,
									style: { backgroundColor: pal.color },
									children: color === pal.color && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
										size: 14,
										className: "text-white"
									})
								}, pal.color))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
							label: t.categoryIconLabel,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl no-scrollbar",
								children: iconKeys.map((k) => {
									const isCurrent = iconName === k;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											sound.playTap(soundEnabled);
											setIconName(k);
										},
										className: `min-h-[44px] p-2 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isCurrent ? "bg-emerald-600 text-white shadow-xs" : "text-slate-700 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryIcon, {
											iconName: k,
											color: isCurrent ? "#ffffff" : color,
											size: "sm"
										})
									}, k);
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FormFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormButton, {
							type: "submit",
							variant: "primary",
							className: "flex-1",
							startIcon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
								size: 16,
								strokeWidth: 2.5
							}),
							children: editingCategory ? t.save : t.addNewCategoryBtn
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormButton, {
							type: "button",
							variant: "secondary",
							onClick: cancelEdit,
							className: "w-full sm:w-auto",
							children: t.cancel
						})] })
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-[#8E8E93] px-1 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isEn ? `All Expense Categories (${categories.length})` : `جميع تصنيفات المصاريف (${categories.length})` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] text-blue-600 dark:text-blue-400",
								children: isEn ? "Tap to edit or set limit" : "انقر للتعديل أو تغيير الميزانية"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl overflow-hidden divide-y divide-[#E5E5EA] dark:divide-[#3A3A3C]",
							children: categories.map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 flex items-center justify-between hover:bg-white/40 dark:hover:bg-white/5 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => startEdit(cat),
									className: "flex items-center gap-3 flex-1 rtl:text-right ltr:text-left cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CategoryIcon, {
										iconName: cat.icon,
										color: cat.color,
										bgColor: cat.bgColor,
										size: "md"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-[#1C1C1E] dark:text-white",
											children: isEn && cat.nameEn ? cat.nameEn : cat.name
										}), cat.isCustom && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-0.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { size: 10 }),
												" ",
												t.customTag
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] text-[#8E8E93] tabular-nums flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.assignedBudget }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Amount, {
											value: cat.monthlyLimit,
											currency,
											lang: language,
											hideAmounts
										})]
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => startEdit(cat),
										className: "px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer",
										children: t.edit
									}), cat.isCustom && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleDelete(cat.id),
										className: "p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors",
										title: t.deleteCategoryTooltip,
										"aria-label": t.deleteCategoryTooltip,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { size: 16 })
									})]
								})]
							}, cat.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: startCreate,
							className: "w-full py-3 rounded-2xl border-2 border-dashed border-blue-500/30 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all mt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 16 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.addNewCategoryBtn })]
						})
					]
				})
			})]
		})]
	}) });
};
export { CategoryManagerModal };
