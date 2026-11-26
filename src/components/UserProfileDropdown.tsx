import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  BarChart2,
  Bell,
  CalendarDays,
  LogOut,
  Settings,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Image } from '@/components/ui/Image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserProfileDropdownProps {
  profilePhoto?: string | null;
  displayName?: string;
  className?: string;
}

const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
      ease: "easeIn" as const,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.02 * i,
      duration: 0.15,
    },
  }),
};

interface DropdownNavItem {
  path: string;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const profileInsightsItems: DropdownNavItem[] = [
  { path: '/profile', labelKey: 'nav.profile', defaultLabel: 'Profile', icon: UserIcon },
  { path: '/stats', labelKey: 'nav.stats', defaultLabel: 'Stats', icon: BarChart2 },
  { path: '/achievements', labelKey: 'nav.achievements', defaultLabel: 'Achievements', icon: Trophy },
  { path: '/year-in-review', labelKey: 'nav.yearInReview', defaultLabel: 'Year In Review', icon: CalendarDays },
];

const accountAlertsItems: DropdownNavItem[] = [
  { path: '/settings', labelKey: 'nav.settings', defaultLabel: 'Settings', icon: Settings },
  { path: '/notifications', labelKey: 'notifications.title', defaultLabel: 'Notifications', icon: Bell },
];

export function UserProfileDropdown({
  profilePhoto,
  displayName,
  className,
}: UserProfileDropdownProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const userEmail = user?.email || '';
  const userName = displayName || userEmail.split('@')[0] || 'User';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  const renderNavGroup = (items: DropdownNavItem[]) => (
    <DropdownMenuGroup className="p-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <DropdownMenuItem key={item.path} asChild>
            <Link
              to={item.path}
              onClick={() => setIsOpen(false)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-foreground/90 hover:text-foreground focus:bg-accent focus:text-accent-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
                aria-hidden={true}
              />
              <span className="min-w-0 flex-1 truncate">
                {t(item.labelKey, item.defaultLabel)}
              </span>
            </Link>
          </DropdownMenuItem>
        );
      })}
    </DropdownMenuGroup>
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative !h-9 !min-h-9 !w-9 !min-w-9 flex items-center justify-center rounded-full text-foreground/90 transition-colors duration-200 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-primary/50',
                  isOpen && 'bg-foreground/5',
                  className
                )}
                aria-label={t('nav.userMenu', 'User menu')}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background/70 ring-2 ring-border/40">
                  {profilePhoto ? (
                    <Image
                      src={profilePhoto}
                      alt={userName}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-cover object-center"
                      loading="lazy"
                    />
                  ) : (
                    <UserIcon className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover border-border/50">
            <p>{userName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <DropdownMenuContent
              align="end"
              className={cn(
                'w-60 bg-popover border-border/50 shadow-xl',
                'p-0 overflow-hidden'
              )}
              style={{
                animationDuration: '0.2s',
              }}
            >
              {/* Identity Header */}
              <motion.div
                variants={itemVariants}
                custom={0}
                initial="hidden"
                animate="visible"
                className="px-4 py-4 bg-card/80"
              >
                <div
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={() => {
                    setIsOpen(false);
                    if (user) {
                      navigate('/profile');
                    } else {
                      navigate('/signup');
                    }
                  }}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/35">
                    {profilePhoto ? (
                      <Image
                        src={profilePhoto}
                        alt={userName}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover object-center transition-all group-hover:ring-primary/60"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 transition-all group-hover:ring-primary/60">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {userName}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </motion.div>

              <DropdownMenuSeparator className="my-0 bg-border/50" />

              {renderNavGroup(profileInsightsItems)}

              <DropdownMenuSeparator className="my-0 bg-border/50" />

              {renderNavGroup(accountAlertsItems)}

              <DropdownMenuSeparator className="my-0 bg-border/50" />

              {/* Logout Section */}
              <motion.div
                variants={itemVariants}
                custom={1}
                initial="hidden"
                animate="visible"
                className="p-1.5"
              >
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer group',
                      'text-red-500 transition-colors duration-150',
                      'hover:bg-red-500/10 hover:text-red-600'
                    )}
                  >
                    <LogOut className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" aria-hidden={true} />
                    <span>{t('nav.signOut', 'Sign Out')}</span>
                  </button>
                </DropdownMenuItem>
              </motion.div>
            </DropdownMenuContent>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
