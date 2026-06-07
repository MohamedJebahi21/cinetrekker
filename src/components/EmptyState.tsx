import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  actionIcon?: LucideIcon;
  variant?: 'default' | 'muted';
  iconSize?: 'sm' | 'md' | 'lg';
  containerSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionLink = '/',
  actionIcon: ActionIcon,
  variant = 'default',
  iconSize = 'md',
  containerSize = 'md',
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  // Icon sizing
  const iconSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const containerSizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  // Padding adjustments based on container size
  const paddingClasses = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-20',
  };

  return (
    <div className={cn("text-center max-w-md mx-auto", paddingClasses[containerSize], className)}>
      {/* Icon Container with gradient background */}
      <div className={cn(
        "mx-auto mb-6 rounded-2xl flex items-center justify-center",
        containerSizeClasses[containerSize],
        variant === 'default' 
          ? "bg-gradient-to-br from-primary/20 to-primary/5"
          : "bg-gradient-to-br from-muted/50 to-muted/20"
      )}>
        <Icon className={cn(
          iconSizeClasses[iconSize],
          variant === 'default' ? "text-primary" : "text-muted-foreground"
        )} />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-3 title-display">{title}</h2>

      {/* Description with subtle grey text */}
      <p className="text-muted-foreground mb-6 leading-relaxed text-sm">{description}</p>

      {/* Call-to-action button with CineTrekker red branding */}
      {actionLabel && (
        <Link to={actionLink}>
          <Button 
            variant={variant === 'default' ? 'default' : 'outline'}
            className={cn(
              "gap-2 transition-all",
              variant === 'default' && "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {ActionIcon && <ActionIcon className="w-4 h-4" />}
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
