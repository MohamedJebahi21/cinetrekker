import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Users,
  LogOut,
  User as UserIcon,
  Compass,
  Bookmark,
  Settings,
  Bell,
  Palette,
  Globe,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Image } from '@/components/ui/Image';
import { languages } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
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

export function UserProfileDropdown({
  profilePhoto,
  displayName,
  className,
}: UserProfileDropdownProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const userEmail = user?.email || '';
  const userName = displayName || userEmail.split('@')[0] || 'User';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  // Social section items
  const menuItems = [
    {
      icon: Compass,
      label: t('nav.discover', 'Discover'),
      path: '/discover',
    },
    {
      icon: Bookmark,
      label: t('nav.watchlist', 'Watchlist'),
      path: '/watchlist',
    },
    {
      icon: Users,
      label: t('profile.following', 'Following'),
      path: '/following',
    },
    {
      icon: Bell,
      label: t('nav.notifications', 'Notifications'),
      path: '/notifications',
    },
    {
      icon: Settings,
      label: t('nav.settings', 'Settings'),
      path: '/settings',
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-full overflow-hidden hover:bg-white/5 min-w-[44px] min-h-[44px] w-[44px] h-[44px] p-0 transition-transform duration-200',
                  isOpen && 'ring-2 ring-primary/50',
                  className
                )}
                aria-label={t('nav.userMenu', 'User menu')}
              >
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={userName}
                    width={44}
                    height={44}
                    className="w-full h-full rounded-full object-cover object-center"
                    loading="lazy"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
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
                'w-56 bg-background border-border/50 shadow-xl',
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
                className="px-4 py-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-background/50"
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
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    {profilePhoto ? (
                      <Image
                        src={profilePhoto}
                        alt={userName}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover object-center ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
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

              {/* Navigation Section */}
              <motion.div className="py-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('nav.account', 'Account')}
                </div>
                {menuItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.path}
                      variants={itemVariants}
                      custom={idx + 1}
                      initial="hidden"
                      animate="visible"
                    >
                      <DropdownMenuItem asChild>
                        <Link
                          to={item.path}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2 text-sm cursor-pointer group',
                            'transition-colors duration-150',
                            'hover:bg-accent hover:text-accent-foreground'
                          )}
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    </motion.div>
                  );
                })}
              </motion.div>

              <DropdownMenuSeparator className="my-0 bg-border/30" />

              <motion.div
                variants={itemVariants}
                custom={menuItems.length + 1}
                initial="hidden"
                animate="visible"
                className="px-4 py-3"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Palette className="h-3.5 w-3.5" />
                  {t('nav.theme', 'Theme')}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['dark', t('nav.themeDark', 'Dark')],
                    ['light', t('nav.themeLight', 'Light')],
                    ['oled', t('nav.themeOled', 'OLED')],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                        theme === value
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/60 bg-card/70 text-foreground hover:bg-accent',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>

              <DropdownMenuSeparator className="my-0 bg-border/30" />

              <motion.div
                variants={itemVariants}
                custom={menuItems.length + 2}
                initial="hidden"
                animate="visible"
                className="px-4 py-3"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Globe className="h-3.5 w-3.5" />
                  {t('nav.language', 'Language')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {languages.slice(0, 6).map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => {
                        void i18n.changeLanguage(language.code);
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-left text-xs font-medium transition-colors',
                        i18n.language === language.code
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border/60 bg-card/70 text-foreground hover:bg-accent',
                      )}
                    >
                      {language.name}
                    </button>
                  ))}
                </div>
              </motion.div>

              <DropdownMenuSeparator className="my-0 bg-border/30" />

              {/* Logout Section */}
              <motion.div
                variants={itemVariants}
                custom={menuItems.length + 3}
                initial="hidden"
                animate="visible"
                className="py-2"
              >
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleSignOut}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2 text-sm cursor-pointer group',
                      'text-red-500 transition-colors duration-150',
                      'hover:bg-red-500/10 hover:text-red-600'
                    )}
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
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
