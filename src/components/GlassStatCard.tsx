import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlassStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const variantColors = {
  primary: {
    icon: 'text-primary',
    bg: 'from-primary/10 to-primary/5',
    border: 'hover:border-primary/30',
    shadow: 'hover:shadow-primary/20',
  },
  success: {
    icon: 'text-green-500',
    bg: 'from-green-500/10 to-green-500/5',
    border: 'hover:border-green-500/30',
    shadow: 'hover:shadow-green-500/20',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'from-amber-500/10 to-amber-500/5',
    border: 'hover:border-amber-500/30',
    shadow: 'hover:shadow-amber-500/20',
  },
  danger: {
    icon: 'text-red-500',
    bg: 'from-red-500/10 to-red-500/5',
    border: 'hover:border-red-500/30',
    shadow: 'hover:shadow-red-500/20',
  },
};

const sizeClasses = {
  sm: {
    container: 'p-4',
    icon: 'w-5 h-5',
    iconBg: 'p-2',
    value: 'text-2xl',
    label: 'text-xs',
    description: 'text-[10px]',
  },
  md: {
    container: 'p-6',
    icon: 'w-6 h-6',
    iconBg: 'p-3',
    value: 'text-4xl',
    label: 'text-sm',
    description: 'text-xs',
  },
  lg: {
    container: 'p-8',
    icon: 'w-8 h-8',
    iconBg: 'p-4',
    value: 'text-5xl',
    label: 'text-base',
    description: 'text-sm',
  },
};

export function GlassStatCard({
  icon: Icon,
  label,
  value,
  description,
  variant = 'primary',
  size = 'md',
  delay = 0,
  href,
  onClick,
  className,
}: GlassStatCardProps) {
  const colors = variantColors[variant];
  const sizes = sizeClasses[size];

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={cn(
        'group h-full',
        className
      )}
    >
      <div
        className={cn(
          'glass-stat-card relative overflow-hidden',
          'rounded-xl transition-all duration-300 cursor-pointer',
          sizes.container,
          colors.border,
          colors.shadow,
          'hover:shadow-lg',
          'border border-white/5'
        )}
      >
        {/* Shimmer overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
        </div>

        {/* Icon with gradient background */}
        <div className="relative z-10 flex items-start justify-between mb-4">
          <div
            className={cn(
              `bg-gradient-to-br ${colors.bg}`,
              'rounded-xl',
              'group-hover:shadow-lg transition-all duration-300',
              sizes.iconBg
            )}
          >
            <Icon className={cn('text-current', colors.icon, sizes.icon)} />
          </div>
        </div>

        {/* Stats content */}
        <div className="relative z-10">
          <div
            className={cn(
              'font-black tracking-tighter mb-2',
              'text-foreground group-hover:text-primary transition-colors duration-300',
              sizes.value
            )}
          >
            {value}
          </div>

          <p
            className={cn(
              'font-semibold uppercase text-muted-foreground tracking-widest',
              sizes.label
            )}
          >
            {label}
          </p>

          {description && (
            <p
              className={cn(
                'text-muted-foreground mt-1',
                sizes.description
              )}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}
