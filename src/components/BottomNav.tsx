import { useLocation, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/auth-context';
import Home from 'lucide-react/dist/esm/icons/home';
import SearchIcon from 'lucide-react/dist/esm/icons/search';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Settings from 'lucide-react/dist/esm/icons/settings';
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
  icon: ComponentType<{ className?: string }>;
  badge?: number | boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/search', label: 'Discover', icon: SearchIcon },
  { path: '/stats', label: 'Stats', icon: BarChart3 },
  { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { path: '/watched', label: 'Watched', icon: CheckCircle2 },
  { path: '/calendar', label: 'Calendar', icon: Home },
  { path: '/recommendations', label: 'Recommendations', icon: Home },
  { path: '/accessibility', label: 'Accessibility', icon: Settings },
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
  const { user } = useAuth();

  if (!showOnMobile) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleNavigate = (path: string) => {
    // Redirect to signup if trying to access profile without authentication
    if (path === '/profile' && !user) {
      navigate('/signup');
    } else {
      navigate(path);
    }
  };

  return (
    <>
      {/* Mobile Bottom Nav (only visible on small screens) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/5 bg-gradient-to-t from-surface-dark-1 to-surface-dark-2 backdrop-blur-xl shadow-glow bg-opacity-95">
        <div className="flex items-center justify-between h-20 px-2 gap-2">
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
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 interactive-element',
                  active
                    ? 'bg-primary/10 text-primary shadow-glow'
                    : 'text-muted-foreground hover:bg-surface-dark-3 hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    active && 'fill-current scale-110'
                  )} />
                  {badge && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-glow">
                      {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </button>
            );
          })}

          {/* More Menu */}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <button
                aria-label="More"
                aria-haspopup="menu"
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 interactive-element text-muted-foreground hover:bg-surface-dark-3 hover:text-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-20">
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
      <div className="h-20 md:hidden" />
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
