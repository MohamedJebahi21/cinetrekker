import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Globe, Lock, Bell, Eye, Bookmark, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { profileService } from '@/services/profile';
import { languages } from '@/i18n';
import { cn } from '@/lib/utils';
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

  const profileKey = useMemo(() => `cinetrekker_profile_${user?.id || 'guest'}`, [user?.id]);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

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

  // Track unsaved changes
  useEffect(() => {
    if (!isLoadingSettings) {
      setHasUnsavedChanges(true);
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
      <div className="page-container pt-20 max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm">
              <SettingsIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('nav.settings', 'Settings')}</h1>
              <p className="text-muted-foreground">Manage your preferences and privacy</p>
            </div>
          </motion.div>

          {isLoadingSettings && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!isLoadingSettings && (
            <>
              {/* Language Settings */}
              <motion.div variants={itemVariants}>
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      {t('settings.language', 'Language')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.languageDesc', 'Choose your preferred language')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Label htmlFor="language" className="min-w-[100px]">
                        {t('settings.selectLanguage', 'Language')}
                      </Label>
                      <Select value={currentLanguage.code} onValueChange={handleLanguageChange}>
                        <SelectTrigger id="language" className="flex-1 max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
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
              <motion.div variants={itemVariants}>
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      {t('profile.privacySettings', 'Privacy Settings')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.privacyDesc', 'Control what others can see on your profile')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="publicProfile" className="cursor-pointer flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          {t('profile.publicProfile', 'Public Profile')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.publicProfileDesc', 'Allow others to view your profile')}
                        </p>
                      </div>
                      <Switch
                        id="publicProfile"
                        checked={settings.publicProfile}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, publicProfile: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showWatchlist" className="cursor-pointer flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-muted-foreground" />
                          {t('profile.showWatchlist', 'Show Watchlist')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.showWatchlistDesc', 'Display your watchlist on your profile')}
                        </p>
                      </div>
                      <Switch
                        id="showWatchlist"
                        checked={settings.showWatchlist}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, showWatchlist: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showStats" className="cursor-pointer flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          {t('profile.showStats', 'Show Statistics')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('profile.showStatsDesc', 'Display your watching statistics')}
                        </p>
                      </div>
                      <Switch
                        id="showStats"
                        checked={settings.showStats}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, showStats: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recommendations Settings */}
              <motion.div variants={itemVariants}>
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      {t('settings.preferences', 'Preferences')}
                    </CardTitle>
                    <CardDescription>
                      {t('settings.preferencesDesc', 'Customize your experience')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="allowRecommendations" className="cursor-pointer">
                          {t('settings.allowRecommendations', 'Allow Recommendations')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.allowRecommendationsDesc', 'Get personalized movie and show recommendations')}
                        </p>
                      </div>
                      <Switch
                        id="allowRecommendations"
                        checked={settings.allowRecommendations}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, allowRecommendations: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Save Button */}
              <motion.div variants={itemVariants} className="flex justify-end gap-3">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="gap-2"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      {t('common.saving', 'Saving...')}
                    </>
                  ) : (
                    <>
                      <SettingsIcon className="w-4 h-4" />
                      {t('common.saveChanges', 'Save Changes')}
                    </>
                  )}
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}
