import React from 'react';
import {
  ShoppingCart,
  Zap,
  Home,
  Baby,
  Wrench,
  HeartPulse,
  Car,
  Coffee,
  Shield,
  Sparkles,
  Utensils,
  BookOpen,
  Tv,
  Shirt,
  Plane,
  Smile,
  Gift,
  Briefcase,
  Smartphone,
  PawPrint,
  Music,
  Wifi,
  Droplets,
  GraduationCap,
  Tag,
  LucideIcon,
} from 'lucide-react';

export const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  ShoppingCart,
  Zap,
  Home,
  Baby,
  Wrench,
  HeartPulse,
  Car,
  Coffee,
  Shield,
  Sparkles,
  Utensils,
  BookOpen,
  Tv,
  Shirt,
  Plane,
  Smile,
  Gift,
  Briefcase,
  Smartphone,
  PawPrint,
  Music,
  Wifi,
  Droplets,
  GraduationCap,
  Tag,
};

export const COLOR_PALETTE = [
  { color: '#10B981', bgColor: '#ECFDF5', label: 'أخضر زمردي' },
  { color: '#F59E0B', bgColor: '#FFFBEB', label: 'كهرماني ذهبي' },
  { color: '#3B82F6', bgColor: '#EFF6FF', label: 'أزرق ملكي' },
  { color: '#EC4899', bgColor: '#FDF2F8', label: 'وردي ناعم' },
  { color: '#8B5CF6', bgColor: '#F5F3FF', label: 'بنفسجي راقي' },
  { color: '#EF4444', bgColor: '#FEF2F2', label: 'أحمر قاني' },
  { color: '#6366F1', bgColor: '#EEF2FF', label: 'نيلي عصري' },
  { color: '#14B8A6', bgColor: '#F0FDFA', label: 'تركوازي' },
  { color: '#E11D48', bgColor: '#FFF1F2', label: 'ياقوتي' },
  { color: '#D97706', bgColor: '#FEF3C7', label: 'برتقالي غروب' },
  { color: '#059669', bgColor: '#D1FAE5', label: 'أخضر نعناعي' },
  { color: '#64748B', bgColor: '#F8FAFC', label: 'رمادي حجري' },
];

interface CategoryIconProps {
  iconName: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  color = '#3B82F6',
  bgColor,
  size = 'md',
  className = '',
}) => {
  const IconComponent = AVAILABLE_ICONS[iconName] || Tag;

  const sizeStyles = {
    sm: { box: 'w-7 h-7 rounded-lg', icon: 14 },
    md: { box: 'w-10 h-10 rounded-xl', icon: 20 },
    lg: { box: 'w-12 h-12 rounded-2xl', icon: 24 },
    xl: { box: 'w-14 h-14 rounded-2xl', icon: 28 },
  }[size];

  return (
    <div
      className={`flex items-center justify-center shrink-0 transition-transform ${sizeStyles.box} ${className}`}
      style={{
        backgroundColor: bgColor || `${color}15`,
        color: color,
      }}
    >
      <IconComponent size={sizeStyles.icon} strokeWidth={2.2} />
    </div>
  );
};
