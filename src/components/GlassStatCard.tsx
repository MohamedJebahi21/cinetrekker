import React from 'react';
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

const variantStyles = {
  primary: {
    icon: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/20',
  },
  success: {
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  warning: {
    icon: 'text-amber-500',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
  },
  danger: {
    icon: 'text-rose-500',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
  },
};

const sizeClasses = {
  sm: {
    container: 'p-3.5 sm:p-4',
    icon: 'h-4 w-4',
    iconBox: 'h-8 w-8',
    value: 'text-xl sm:text-2xl',
    label: 'text-xs',
    description: 'text-[11px]',
  },
  md: {
    container: 'p-4 sm:p-5',
    icon: 'h-5 w-5',
    iconBox: 'h-9 w-9',
    value: 'text-2xl sm:text-3xl',
    label: 'text-xs',
    description: 'text-xs',
  },
  lg: {
    container: 'p-5 sm:p-6',
    icon: 'h-6 w-6',
    iconBox: 'h-10 w-10',
    value: 'text-3xl sm:text-4xl',
    label: 'text-sm',
    description: 'text-xs',
  },
};

export function GlassStatCard({
  icon: Icon,
  label,
  value,
  description,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className,
}: GlassStatCardProps) {
  const styles = variantStyles[variant] || variantStyles.primary;
  const sizes = sizeClasses[size] || sizeClasses.md;

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card/60 transition-colors duration-150',
        (href || onClick) && 'cursor-pointer hover:border-border hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        sizes.container,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg border',
            styles.iconBg,
            sizes.iconBox
          )}
        >
          <Icon className={cn(styles.icon, sizes.icon)} aria-hidden="true" />
        </div>
      </div>

      <div>
        <div
          className={cn(
            'font-bold tracking-tight text-foreground transition-colors',
            sizes.value
          )}
        >
          {value}
        </div>

        <p
          className={cn(
            'mt-1 font-medium text-muted-foreground',
            sizes.label
          )}
        >
          {label}
        </p>

        {description && (
          <p
            className={cn(
              'mt-0.5 text-muted-foreground/80',
              sizes.description
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block" rel="noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}
