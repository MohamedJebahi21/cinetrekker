import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LucideIcon, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  variant?: 'default' | 'muted';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionLink = '/',
  variant = 'default',
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("text-center py-16 max-w-md mx-auto", className)}>
      <div className={cn(
        "w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center",
        variant === 'default' 
          ? "bg-gradient-to-br from-primary/20 to-primary/5"
          : "bg-gradient-to-br from-muted/50 to-muted/20"
      )}>
        <Icon className={cn(
          "w-10 h-10",
          variant === 'default' ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <h2 className="text-2xl font-bold mb-3 title-display">{title}</h2>
      <p className="text-muted-foreground mb-6 leading-relaxed">{description}</p>
      {actionLabel && (
        <Link to={actionLink}>
          <Button 
            variant={variant === 'default' ? 'default' : 'outline'}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
