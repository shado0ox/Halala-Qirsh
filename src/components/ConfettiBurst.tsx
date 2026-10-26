import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = [
  '#10B981', '#34D399', '#059669', '#F59E0B', '#60A5FA', '#F472B6', '#A78BFA'
];

interface ConfettiBurstProps {
  active: boolean;
  onComplete?: () => void;
  isReduced?: boolean;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  active,
  onComplete,
  isReduced = false,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active || isReduced) {
      setParticles([]);
      return;
    }

    // Generate ~36 lightweight particles
    const items: Particle[] = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * 2 * Math.PI + (Math.random() - 0.5) * 0.4;
      const distance = 80 + Math.random() * 160;
      items.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 50,
        rotate: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 5,
      });
    }
    setParticles(items);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [active, isReduced, onComplete]);

  if (!active || isReduced || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-60 flex items-center justify-center overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y + 120, // Gravity drop
            scale: [0, 1.2, 0.8],
            rotate: p.rotate + 360,
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.8, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
};
