import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Globe, Lock, Bell, Eye, Bookmark, TrendingUp, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
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

  const profileKey = useMemo(() => `cinetrekker_profile_${user?.id || 'guest'}`, [user?.id]);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsLoadRetryCount, setSettingsLoadRetryCount] = useState(0);
  const [settingsLoadTimedOut, setSettingsLoadTimedOut] = useState(false);
  const [pulseRowId, setPulseRowId] = useState<string | null>(null);
  const [isMobileSectionCollapse, setIsMobileSectionCollapse] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmResetAccessibilityOpen, setConfirmResetAccessibilityOpen] =
    useState(false);
  const resetAccessibilityButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(
    () => readAccessibilityPreferences().fontSize,
  );
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => readAccessibilityPreferences().reduceMotion,
  );
  const [mobileExpandedSections, setMobileExpandedSections] = useState({
    account: true,
    accessibility: true,
    privacy: true,
    contentSafety: true,
    dataManagement: true,
  });

  const hasSettingsChanged = useCallback(() => {
    return (
      initialStateRef.current.publicProfile !== settings.publicProfile ||
      initialStateRef.current.showWatchlist !== settings.showWatchlist ||
      initialStateRef.current.showStats !== settings.showStats ||
      initialStateRef.current.allowRecommendations !== settings.allowRecommendations
    );
  }, [settings.publicProfile, settings.showWatchlist, settings.showStats, settings.allowRecommendations]);

  // Load settings from Supabase (with localStorage fallback)
  useEffect(() => {
    let subscription: { unsubscribe: () => Promise<void> | void } | null = null;
    let isMounted = true;

    const loadSettings = async () => {
      if (!isMounted) return;

      if (!user?.id) {
        setIsLoadingSettings(false);
        return;
      }
      
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
  }, [profileKey, settingsLoadRetryCount, text, toast, user?.id, withTimeout]);

  useEffect(() => {
    if (!isLoadingSettings) {
      setSettingsLoadTimedOut(false);
      return;
    }

    setSettingsLoadTimedOut(false);
    const timeoutId = window.setTimeout(() => {
      setSettingsLoadTimedOut(true);
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoadingSettings, settingsLoadRetryCount]);

  // Track unsaved changes - only when actual changes are made
  useEffect(() => {
    if (!isLoadingSettings) {
      setHasUnsavedChanges(hasSettingsChanged());
    }
  }, [isLoadingSettings, hasSettingsChanged]);

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

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];
  const ageLabel = isAgeKnown
    ? text("contentPolicy.verified", "Verified")
    : text("contentPolicy.notSet", "Not set");
  const familyFriendlyEnabled = maturityRating === SafetyLevel.STRICT;
  const teenSafeEnabled =
    maturityRating === SafetyLevel.STRICT ||
    maturityRating === SafetyLevel.MODERATE;

  const updateSafetyMode = async (nextLevel: SafetyLevel) => {
    if (maturityRating === nextLevel) return;
    triggerRowPulse("content-safety");
    const { syncedRemotely } = await setMaturityRating(nextLevel);
    toast({
      title: syncedRemotely
        ? text("contentPolicy.savedTitle", "Safety settings updated")
        : text("contentPolicy.savedLocallyTitle", "Saved on this device"),
      description: text(
        syncedRemotely
          ? "contentPolicy.savedDescription"
          : "contentPolicy.savedLocallyDescription",
        syncedRemotely
          ? "Your content visibility preferences were saved right away."
          : "Your safety preference is active now and will sync when the server is available.",
      ),
    });
  };

  const exportData = async () => {
    setIsExportingData(true);

    try {
      const storedProfile = readStoredProfileData(localStorage.getItem(profileKey));
      const remoteProfile = user?.id ? await profileService.getProfile(user.id) : null;
      const payload = {
        exportedAt: new Date().toISOString(),
        app: "CineTrekker",
        version: "settings-export-v1",
        account: user
          ? {
              userId: user.id,
              email: user.email ?? null,
            }
          : {
              userId: "guest",
              email: null,
            },
        profile: remoteProfile ?? storedProfile,
        settings,
        contentSafety: {
          maturityRating,
          isAgeKnown,
        },
        watchlist,
        watched,
        hiddenRecommendations,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cinetrekker-account-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: text("settings.exportReadyTitle", "Export ready"),
        description: text(
          "settings.exportReadyDesc",
          "Your profile, settings, and list data were downloaded as JSON.",
        ),
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: text("settings.exportFailedTitle", "Export failed"),
        description: text(
          "settings.exportFailedDesc",
          "Could not generate your data export. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsExportingData(false);
    }
  };

  const clearLocalAccountData = useCallback(() => {
    localStorage.removeItem(profileKey);
    localStorage.removeItem(`cinetrekker_profile_favorites_${user?.id || "guest"}`);
    localStorage.removeItem(
      user?.id ? `${STORAGE_KEYS.hidden}_${user.id}` : STORAGE_KEYS.hidden,
    );

    clearGuestWatchlist();
    clearGuestWatched();
    localStorage.setItem(
      user?.id ? `${STORAGE_KEYS.hidden}_${user.id}` : STORAGE_KEYS.hidden,
      JSON.stringify([]),
    );
  }, [profileKey, user?.id]);

  const deleteAccountData = async () => {
    setIsDeletingData(true);

    try {
      clearLocalAccountData();

      if (user?.id) {
        const deleteRequests = await Promise.all([
          supabase.from("user_watchlist").delete().eq("user_id", user.id),
          supabase.from("user_watched").delete().eq("user_id", user.id),
          supabase.from("profiles").delete().eq("user_id", user.id),
        ]);

        const deletionError = deleteRequests.find((result) => result.error)?.error;
        if (deletionError) {
          throw deletionError;
        }

        await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
        await signOut();
      }

      toast({
        title: text("settings.accountDeletedTitle", "Account data deleted"),
        description: user?.id
          ? text(
              "settings.accountDeletedSignedInDesc",
              "Your CineTrekker profile data was removed and you were signed out.",
            )
          : text(
              "settings.accountDeletedGuestDesc",
              "This device's CineTrekker data was cleared.",
            ),
      });

      navigate(user?.id ? "/login" : "/");
    } catch (error) {
      console.error("Error deleting account data:", error);
      toast({
        title: text("settings.deletionFailedTitle", "Deletion failed"),
        description: text(
          "settings.deletionFailedDesc",
          "We could not remove all account data. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsDeletingData(false);
      setIsDeleteDialogOpen(false);
    }
  };

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

        {isLoadingSettings && !settingsLoadTimedOut && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {isLoadingSettings && settingsLoadTimedOut && (
          <div className="mx-auto max-w-md rounded-lg border border-border/60 bg-card/70 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              {text(
                "settings.loadTimeoutDesc",
                "Loading settings is taking longer than expected.",
              )}
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={() => setSettingsLoadRetryCount((count) => count + 1)}
            >
              {text("common.retry", "Retry")}
            </Button>
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
