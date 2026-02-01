import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, Bookmark, CheckCircle2, MoreHorizontal, LucideIcon, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number | boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/search', label: 'Discover', icon: Search },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: '/watched', label: 'Watched', icon: CheckCircle2 },
  { path: '/calendar', label: 'Calendar', icon: Home },
  { path: '/recommendations', label: 'Recommendations', icon: Home },
  { path: '/profile', label: 'Profile', icon: Home },
];

interface BottomNavProps {
  showOnMobile?: boolean;
  watchlistCount?: number;
  watchedCount?: number;
}

/**
 * Mobile bottom navigation component
 */
export function BottomNav({ showOnMobile = true, watchlistCount, watchedCount }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!showOnMobile) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <>
      {/* Mobile Bottom Nav (only visible on small screens) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm md:hidden z-40">
        <div className="flex items-center justify-between h-16 px-2">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            let badge = null;

            if (item.path === '/watchlist' && watchlistCount) {
              badge = watchlistCount;
            } else if (item.path === '/watched' && watchedCount) {
              badge = watchedCount;
            }

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                aria-label={item.label}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 flex-1 relative',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-6 w-6', active && 'fill-current')} />
                  {badge && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={cn('text-xs font-medium leading-none', active && 'text-primary')}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="More" className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 flex-1 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-6 w-6" />
                <span className="text-xs font-medium leading-none">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-16">
              {SECONDARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={cn(active && 'bg-primary/10 text-primary')}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Spacer to prevent content overlap */}
      <div className="h-16 md:hidden" />
    </>
  );
}

/**
 * Desktop side navigation bar
 */
export function SideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="hidden md:fixed md:left-0 md:top-20 md:w-48 md:flex md:flex-col md:gap-1 md:p-4 md:border-r md:border-border">
      {[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
