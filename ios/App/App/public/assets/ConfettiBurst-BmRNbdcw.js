import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Gt as require_react } from "./vendor-lucide-CSl_6olN.js";
import { f as require_jsx_runtime, t as motion } from "./vendor-motion-BgAFdAcG.js";
// src/components/ConfettiBurst.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CONFETTI_COLORS = [
	"#10B981",
	"#34D399",
	"#059669",
	"#F59E0B",
	"#60A5FA",
	"#F472B6",
	"#A78BFA"
];
var ConfettiBurst = ({ active, onComplete, isReduced = false }) => {
	const [particles, setParticles] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (!active || isReduced) {
			setParticles([]);
			return;
		}
		const items = [];
		for (let i = 0; i < 36; i++) {
			const angle = i / 36 * 2 * Math.PI + (Math.random() - .5) * .4;
			const distance = 80 + Math.random() * 160;
			items.push({
				id: i,
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance - 50,
				rotate: Math.random() * 360,
				color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
				size: 5 + Math.random() * 5
			});
		}
		setParticles(items);
		const timer = setTimeout(() => {
			setParticles([]);
			onComplete?.();
		}, 2e3);
		return () => clearTimeout(timer);
	}, [
		active,
		isReduced,
		onComplete
	]);
	if (!active || isReduced || particles.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 pointer-events-none z-60 flex items-center justify-center overflow-hidden",
		children: particles.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: {
				x: 0,
				y: 0,
				scale: 0,
				rotate: 0,
				opacity: 1
			},
			animate: {
				x: p.x,
				y: p.y + 120,
				scale: [
					0,
					1.2,
					.8
				],
				rotate: p.rotate + 360,
				opacity: [
					1,
					1,
					0
				]
			},
			transition: {
				duration: 1.8,
				ease: [
					.2,
					.8,
					.2,
					1
				]
			},
			style: {
				position: "absolute",
				width: p.size,
				height: p.size * 1.5,
				backgroundColor: p.color,
				borderRadius: 2
			}
		}, p.id))
	});
};
export { ConfettiBurst };
