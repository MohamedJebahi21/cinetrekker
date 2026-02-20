import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Globe, Lock, Bell, Eye, Bookmark, TrendingUp, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profile';
import { languages } from '@/i18n';
import { cn } from '@/lib/utils';
import { StickySaveBar } from '@/components/StickySaveBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

const DEFAULT_SETTINGS = {
  publicProfile: false,
  showWatchlist: true,
  showStats: true,
  allowRecommendations: true,
};

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Auth guard - require authentication
  if (!user) {
    return (
      <div className="page-container pt-20 pb-24 md:pb-0">
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access settings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const profileKey = useMemo(() => `cinetrekker_profile_${user?.id || 'guest'}`, [user?.id]);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  
  // Helper function to detect actual changes
  const hasSettingsChanged = () => {
    return (
      initialStateRef.publicProfile !== settings.publicProfile ||
      initialStateRef.showWatchlist !== settings.showWatchlist ||
      initialStateRef.showStats !== settings.showStats ||
      initialStateRef.allowRecommendations !== settings.allowRecommendations
    );
  };
  
  const initialStateRef = {
    publicProfile: DEFAULT_SETTINGS.publicProfile,
    showWatchlist: DEFAULT_SETTINGS.showWatchlist,
    showStats: DEFAULT_SETTINGS.showStats,
    allowRecommendations: DEFAULT_SETTINGS.allowRecommendations,
  };

  // Load settings from Supabase (with localStorage fallback)
  useEffect(() => {
    let subscription: { unsubscribe: () => Promise<void> | void } | null = null;
    let isMounted = true;

    const loadSettings = async () => {
      if (!isMounted) return;
      
      setIsLoadingSettings(true);
      
      try {
        if (user?.id) {
          console.log('📥 Loading settings from Supabase for user:', user.id);
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Settings load timeout')), 10000)
          );
          
          const loadPromise = profileService.getProfile(user.id);
          const profile = await Promise.race([loadPromise, timeoutPromise]);
          
          if (!isMounted) return;
          
          if (profile) {
            setSettings({
              publicProfile: profile.is_public,
              showWatchlist: profile.show_watchlist,
              showStats: profile.show_stats,
              allowRecommendations: profile.allow_recommendations,
            });
          } else {
            // Fallback to localStorage if not in Supabase yet
            const stored = localStorage.getItem(profileKey);
            if (stored) {
              const parsed = JSON.parse(stored) as { 
                settings?: typeof DEFAULT_SETTINGS;
              };
              setSettings(parsed.settings || DEFAULT_SETTINGS);
            }
          }

          // Subscribe to real-time updates
          if (isMounted) {
            subscription = profileService.subscribeToProfile(user.id, (updatedProfile) => {
              if (!isMounted) return;
              
              console.log('🔄 Settings updated in real-time:', updatedProfile);
              setSettings({
                publicProfile: updatedProfile.is_public,
                showWatchlist: updatedProfile.show_watchlist,
                showStats: updatedProfile.show_stats,
                allowRecommendations: updatedProfile.allow_recommendations,
              });
            });
          }
        } else {
          // Guest mode: load from localStorage
          const stored = localStorage.getItem(profileKey);
          if (stored) {
            const parsed = JSON.parse(stored) as { 
              settings?: typeof DEFAULT_SETTINGS;
            };
            setSettings(parsed.settings || DEFAULT_SETTINGS);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error loading settings",
          description: "Using default settings.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id, profileKey, toast]);

  // Track unsaved changes - only when actual changes are made
  useEffect(() => {
    if (!isLoadingSettings) {
      setHasUnsavedChanges(hasSettingsChanged());
    }
  }, [settings.publicProfile, settings.showWatchlist, settings.showStats, settings.allowRecommendations, isLoadingSettings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      const currentData = localStorage.getItem(profileKey);
      const parsed = currentData ? JSON.parse(currentData) : {};
      const updatedData = {
        ...parsed,
        settings,
      };
      localStorage.setItem(profileKey, JSON.stringify(updatedData));
      console.log('💾 Settings saved to localStorage');

      // If user is authenticated, save to Supabase
      if (user?.id) {
        await profileService.updateProfile(user.id, {
          is_public: settings.publicProfile,
          show_watchlist: settings.showWatchlist,
          show_stats: settings.showStats,
          allow_recommendations: settings.allowRecommendations,
        });
      }

      setHasUnsavedChanges(false);
      
      toast({
        title: "Settings saved!",
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Settings saved locally, but syncing to server failed.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    // Reload the page to discard changes
    window.location.reload();
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    toast({
      title: "Language updated",
      description: `Language changed to ${languages.find(l => l.code === langCode)?.name}`,
    });
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <>
      <SEO 
        title="Settings — CineTrekker" 
        description="Manage your account settings and preferences"
        canonical="https://cinetrekker.vercel.app/settings"
      />
      <motion.div 
        className="page-container pt-20 pb-24 md:pb-0 max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Premium Header */}
        <motion.section variants={itemVariants} className="mb-8">
          <Card className="relative overflow-hidden border-neutral-800/50 bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/90 backdrop-blur-md shadow-2xl">
            {/* Gradient Background Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-blue-900/10 pointer-events-none" />
            
            <CardContent className="pt-8 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-500/20 flex items-center justify-center backdrop-blur-sm">
                  <SettingsIcon className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{t('nav.settings', 'Settings')}</h1>
                  <p className="text-neutral-400">Manage your preferences and privacy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {isLoadingSettings && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoadingSettings && (
          <>
            {/* Language Settings */}
            <motion.div variants={itemVariants} className="mb-6">
              <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <span>{t('settings.language', 'Language')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.languageDesc', 'Choose your preferred language')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="language" className="text-neutral-300 min-w-[100px]">
                      {t('settings.selectLanguage', 'Language')}
                    </Label>
                    <Select value={currentLanguage.code} onValueChange={handleLanguageChange}>
                      <SelectTrigger 
                        id="language" 
                        className="flex-1 max-w-xs bg-black/40 border-neutral-700 focus:border-red-500 focus:ring-red-500/20"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800">
                        {languages.map((lang) => (
                          <SelectItem 
                            key={lang.code} 
                            value={lang.code}
                            className="focus:bg-neutral-800 focus:text-white"
                          >
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Privacy Settings */}
            <motion.div variants={itemVariants} className="mb-6">
              <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-purple-400" />
                    </div>
                    <span>{t('profile.privacySettings', 'Privacy Settings')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.privacyDesc', 'Control what others can see on your profile')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Public Profile Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-neutral-800/50 hover:border-neutral-700/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="publicProfile" className="cursor-pointer flex items-center gap-2 text-neutral-200 font-medium">
                        <Eye className="w-4 h-4 text-neutral-500" />
                        {t('profile.publicProfile', 'Public Profile')}
                      </Label>
                      <p className="text-sm text-neutral-500">
                        {t('profile.publicProfileDesc', 'Allow others to view your profile')}
                      </p>
                    </div>
                    <Switch
                      id="publicProfile"
                      checked={settings.publicProfile}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, publicProfile: checked }))
                      }
                      className={cn(
                        "data-[state=checked]:bg-red-600",
                        settings.publicProfile && "shadow-lg shadow-red-500/30"
                      )}
                    />
                  </div>

                  {/* Show Watchlist Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-neutral-800/50 hover:border-neutral-700/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="showWatchlist" className="cursor-pointer flex items-center gap-2 text-neutral-200 font-medium">
                        <Bookmark className="w-4 h-4 text-neutral-500" />
                        {t('profile.showWatchlist', 'Show Watchlist')}
                      </Label>
                      <p className="text-sm text-neutral-500">
                        {t('profile.showWatchlistDesc', 'Display your watchlist on your profile')}
                      </p>
                    </div>
                    <Switch
                      id="showWatchlist"
                      checked={settings.showWatchlist}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, showWatchlist: checked }))
                      }
                      className={cn(
                        "data-[state=checked]:bg-red-600",
                        settings.showWatchlist && "shadow-lg shadow-red-500/30"
                      )}
                    />
                  </div>

                  {/* Show Stats Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-neutral-800/50 hover:border-neutral-700/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="showStats" className="cursor-pointer flex items-center gap-2 text-neutral-200 font-medium">
                        <TrendingUp className="w-4 h-4 text-neutral-500" />
                        {t('profile.showStats', 'Show Statistics')}
                      </Label>
                      <p className="text-sm text-neutral-500">
                        {t('profile.showStatsDesc', 'Display your watching statistics')}
                      </p>
                    </div>
                    <Switch
                      id="showStats"
                      checked={settings.showStats}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, showStats: checked }))
                      }
                      className={cn(
                        "data-[state=checked]:bg-red-600",
                        settings.showStats && "shadow-lg shadow-red-500/30"
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations Settings */}
            <motion.div variants={itemVariants}>
              <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-400" />
                    </div>
                    <span>{t('settings.preferences', 'Preferences')}</span>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.preferencesDesc', 'Customize your experience')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-neutral-800/50 hover:border-neutral-700/70 transition-colors">
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="allowRecommendations" className="cursor-pointer text-neutral-200 font-medium">
                        {t('settings.allowRecommendations', 'Allow Recommendations')}
                      </Label>
                      <p className="text-sm text-neutral-500">
                        {t('settings.allowRecommendationsDesc', 'Get personalized movie and show recommendations')}
                      </p>
                    </div>
                    <Switch
                      id="allowRecommendations"
                      checked={settings.allowRecommendations}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, allowRecommendations: checked }))
                      }
                      className={cn(
                        "data-[state=checked]:bg-red-600",
                        settings.allowRecommendations && "shadow-lg shadow-red-500/30"
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sticky Save Bar */}
            <StickySaveBar
              isVisible={hasUnsavedChanges}
              isSaving={isSaving}
              onSave={handleSaveSettings}
              onCancel={handleCancelChanges}
              saveLabel={t('settings.saveChanges') || 'Save Changes'}
              cancelLabel="Cancel"
            />
          </>
        )}
      </motion.div>
    </>
  );
}
