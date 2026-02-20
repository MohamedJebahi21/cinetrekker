import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileStatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClassName?: string;
  panelClassName?: string;
}

interface ProfileStatsGridProps {
  title: string;
  items: ProfileStatItem[];
}

export function ProfileStatsGrid({ title, items }: ProfileStatsGridProps) {
  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-800/60">
                    <Icon className={item.iconClassName || 'h-6 w-6 text-primary'} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{item.value}</p>
                    <p className="text-sm text-neutral-400">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
