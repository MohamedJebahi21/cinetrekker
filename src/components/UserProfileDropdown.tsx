import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
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
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const userEmail = user?.email || '';
  const userName = displayName || userEmail.split('@')[0] || 'User';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  // Social section items
  const socialItems = [
    {
      icon: Users,
      label: t('profile.following', 'Following'),
      path: '/following',
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
                  'rounded-full hover:bg-white/5 min-w-[44px] min-h-[44px] w-[44px] h-[44px] p-0 transition-transform duration-200',
                  isOpen && 'ring-2 ring-primary/50',
                  className
                )}
                aria-label={t('nav.userMenu', 'User menu')}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover/95 backdrop-blur-xl border-border/50">
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
            forceMount
          >
            <DropdownMenuContent
              align="end"
              className={cn(
                'w-56 bg-background/80 backdrop-blur-md border-border/50 shadow-xl',
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
                <Link
                  to="/profile"
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="relative">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt={userName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30 group-hover:ring-primary/60 transition-all">
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
                </Link>
              </motion.div>

              {/* Social Section */}
              <motion.div className="py-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('profile.social', 'Social')}
                </div>
                {socialItems.map((item, idx) => {
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

              {/* Logout Section */}
              <motion.div
                variants={itemVariants}
                custom={socialItems.length + 1}
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
