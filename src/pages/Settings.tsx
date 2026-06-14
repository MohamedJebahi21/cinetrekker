import { useTranslation } from "react-i18next";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, type Variants } from "framer-motion";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Settings as SettingsIcon,
  Lock,
  Bookmark,
  TrendingUp,
  Shield,
  Sparkles,
  UserRound,
  Info,
  Languages,
  Accessibility,
  ChevronRight,
  Download,
  Trash2,
  Database,
  ShieldAlert,
  Type,
  Eye,
  RotateCcw,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";
import { languages } from "@/i18n";
import { cn } from "@/lib/utils";
import { StickySaveBar } from "@/components/StickySaveBar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useContentPolicy } from "@/contexts/content-policy-context";
import { humanizeUiText } from "@/lib/humanize-ui-text";
import { SafetyLevel } from "@/lib/contentFilter";
import {
  hasSettingsChanged,
  normalizeSettingsState,
  readStoredProfileData,
  readStoredSettings,
  type SettingsState,
} from "@/pages/settings.utils";
import { useUserLists } from "@/contexts/UserListsContext";
import { STORAGE_KEYS } from "@/contexts/userListsStorageKeys";
import { clearGuestWatchlist, clearGuestWatched } from "@/hooks/useGuestMediaLists";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyAccessibilityPreferencesToRoot,
  readAccessibilityPreferences,
  saveFontSizePreference,
  saveReduceMotionPreference,
} from "@/lib/accessibility-preferences";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const DEFAULT_SETTINGS: SettingsState = {
  showWatchlist: true,
  showStats: true,
  allowRecommendations: true,
};

type SettingsSwitchRowProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onCheckedChange: (checked: boolean) => void;
  isPulsing?: boolean;
  tooltipText?: string;
  tooltipAriaLabel?: string;
};

type SettingsSectionProps = {
  id?: string;
  sectionLabel: string;
  sectionIcon: LucideIcon;
  sectionIconClass: string;
  title: string;
  description: string;
  headerIcon: LucideIcon;
  headerIconClass: string;
  children: ReactNode;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
};

function PremiumSwitch({
  id,
  checked,
  disabled,
  onCheckedChange,
  ariaLabelledby,
  ariaDescribedby,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
}) {
  return (
    <Switch
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    />
  );
}

function SettingsSwitchRow({
  id,
  icon: Icon,
  title,
  description,
  checked,
  disabled = false,
  disabledHint,
  onCheckedChange,
  isPulsing = false,
  tooltipText,
  tooltipAriaLabel,
}: SettingsSwitchRowProps) {
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const disabledHintId = disabledHint ? `${id}-disabled-hint` : undefined;
  const tooltipId = tooltipText ? `${id}-tooltip` : undefined;
  const describedBy = [descriptionId, disabledHintId, tooltipId]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      animate={
        isPulsing
          ? {
              boxShadow: [
                "0 0 0 rgba(239,68,68,0)",
                "0 0 0 6px rgba(239,68,68,0.16)",
                "0 0 0 rgba(239,68,68,0)",
              ],
              scale: [1, 1.01, 1],
            }
          : undefined
      }
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-4 transition-all duration-300",
        !checked && "hover:border-white/20",
        disabled && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={id}
          id={labelId}
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-foreground",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="inline-flex items-center gap-1.5">
            {title}
            {tooltipText && (
              <span className="relative inline-flex group/tooltip">
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={
                    tooltipAriaLabel ?? `More information about ${title}`
                  }
                  className="inline-flex items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 rounded-md border border-border/60 bg-card px-3 py-2 text-xs font-normal normal-case tracking-normal text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
                >
                  {tooltipText}
                </span>
              </span>
            )}
          </span>
        </Label>
        <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
        {disabledHint && (
          <p id={disabledHintId} className="mt-1 text-xs text-muted-foreground">
            {disabledHint}
          </p>
        )}
      </div>
      <PremiumSwitch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        ariaLabelledby={labelId}
        ariaDescribedby={describedBy}
      />
    </motion.div>
  );
}

function SettingsSection({
  id,
  sectionLabel,
  sectionIcon: SectionIcon,
  sectionIconClass,
  title,
  description,
  headerIcon: HeaderIcon,
  headerIconClass,
  children,
  className,
  isOpen = true,
  onToggle,
}: SettingsSectionProps) {
  const isMobileCollapsible = typeof onToggle === "function";

  return (
    <div id={id} className={cn(className)}>
      <p className="ct-kicker mb-3 inline-flex items-center gap-2">
        <SectionIcon className={cn("h-3.5 w-3.5", sectionIconClass)} />
        {sectionLabel}
      </p>
      <Card className="ct-panel">
        <CardHeader
          className={cn(
            isMobileCollapsible &&
              "cursor-pointer sm:cursor-default select-none",
          )}
          onClick={isMobileCollapsible ? onToggle : undefined}
          onKeyDown={
            isMobileCollapsible
              ? (e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  onToggle();
                }
              : undefined
          }
          role={isMobileCollapsible ? "button" : undefined}
          tabIndex={isMobileCollapsible ? 0 : undefined}
          aria-expanded={isMobileCollapsible ? isOpen : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5">
                <HeaderIcon className={cn("h-5 w-5", headerIconClass)} />
              </div>
              <span>{title}</span>
            </CardTitle>
            {isMobileCollapsible && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-neutral-500 transition-transform sm:hidden",
                  isOpen && "rotate-90",
                )}
              />
            )}
          </div>
          <CardDescription className={cn(isMobileCollapsible && !isOpen && "hidden sm:block")}>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent
          className={cn("space-y-4", isMobileCollapsible && !isOpen && "hidden sm:block")}
        >
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const MIN_FONT_SIZE = 80;
  const MAX_FONT_SIZE = 150;
  const FONT_SIZE_STEP = 10;
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { maturityRating, setMaturityRating, isAgeKnown } = useContentPolicy();
  const { toast } = useToast();
  const { watchlist, watched, hiddenRecommendations } = useUserLists();
  const { theme, setTheme } = useTheme();

  const profileKey = useMemo(
    () => `cinetrekker_profile_${user?.id || "guest"}`,
    [user?.id],
  );

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
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

  const text = useCallback(
    (key: string, fallback: string) => humanizeUiText(String(t(key, fallback))),
    [t],
  );

  const initialStateRef = useRef<SettingsState>(DEFAULT_SETTINGS);

  const hasSettingsChangedMemo = useCallback(() => {
    return hasSettingsChanged(initialStateRef.current, settings);
  }, [settings]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobileSectionCollapse(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;
    let isMounted = true;

    const loadSettings = async () => {
      if (!isMounted) return;

      if (!user?.id) {
        setIsLoadingSettings(false);
        return;
      }

      setIsLoadingSettings(true);

      try {
        const applyLoadedSettings = (loaded: SettingsState) => {
          const normalized = normalizeSettingsState(loaded, DEFAULT_SETTINGS);
          setSettings(normalized);
          initialStateRef.current = normalized;
          setHasUnsavedChanges(false);
        };

        const storedSettings = readStoredSettings(
          localStorage.getItem(profileKey),
          DEFAULT_SETTINGS,
        );
        applyLoadedSettings(storedSettings ?? DEFAULT_SETTINGS);

        if (!user?.id) {
          return;
        }

        logger.debug("Loading settings from Supabase for user:", user.id);

        void profileService
          .getProfile(user.id)
          .then((profile) => {
            if (!isMounted || !profile) return;

            applyLoadedSettings({
              showWatchlist: profile.show_watchlist,
              showStats: profile.show_stats,
              allowRecommendations: profile.allow_recommendations,
            });
          })
          .catch((error) => {
            if (!isMounted) return;
            console.error("Error loading settings:", error);
          });

        if (isMounted) {
          subscription = await profileService.subscribeToProfile(
            user.id,
            (updatedProfile) => {
              if (!isMounted) return;

              logger.debug("Settings updated in real-time:", updatedProfile);
              applyLoadedSettings({
                showWatchlist: updatedProfile.show_watchlist,
                showStats: updatedProfile.show_stats,
                allowRecommendations: updatedProfile.allow_recommendations,
              });
            },
          );
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: text("settings.loadErrorTitle", "Error loading settings"),
          description: text("settings.loadErrorDesc", "Using default settings."),
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [profileKey, text, toast, user?.id]);

  useEffect(() => {
    if (!isLoadingSettings) {
      setHasUnsavedChanges(hasSettingsChangedMemo());
    }
  }, [isLoadingSettings, hasSettingsChangedMemo]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const target = document.getElementById(id);
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }, [location.hash]);

  useEffect(() => {
    const clamped = saveFontSizePreference(fontSize);
    if (clamped !== fontSize) {
      setFontSize(clamped);
      return;
    }
    applyAccessibilityPreferencesToRoot();
  }, [fontSize]);

  useEffect(() => {
    saveReduceMotionPreference(reduceMotion);
    applyAccessibilityPreferencesToRoot();
  }, [reduceMotion]);

  const triggerRowPulse = (rowId: string) => {
    setPulseRowId(rowId);
    window.setTimeout(
      () => setPulseRowId((active) => (active === rowId ? null : active)),
      520,
    );
  };

  const decreaseFontSize = () => {
    setFontSize((current) => Math.max(MIN_FONT_SIZE, current - FONT_SIZE_STEP));
  };

  const increaseFontSize = () => {
    setFontSize((current) => Math.min(MAX_FONT_SIZE, current + FONT_SIZE_STEP));
  };

  const resetAccessibilitySettings = () => {
    setFontSize(100);
    setReduceMotion(false);
    setTheme("dark");
    toast({
      title: text("settings.accessibilityResetTitle", "Accessibility reset"),
      description: text(
        "settings.accessibilityResetDesc",
        "Theme, text size, and motion preferences are back to defaults.",
      ),
    });
  };

  const updateProfileSetting = (
    key: keyof typeof DEFAULT_SETTINGS,
    checked: boolean,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
    triggerRowPulse(key);
    toast({
      title: text("settings.changeSaved", "Preference updated"),
      description: text(
        "settings.changeSavedDesc",
        "Your change will be included when you tap Save Changes.",
      ),
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const parsed = readStoredProfileData(localStorage.getItem(profileKey));
      const updatedData = {
        ...parsed,
        settings,
      };
      localStorage.setItem(profileKey, JSON.stringify(updatedData));
      logger.debug("Settings saved to localStorage");

      if (user?.id) {
        await profileService.updateProfile(user.id, {
          is_public: false,
          show_watchlist: settings.showWatchlist,
          show_stats: settings.showStats,
          allow_recommendations: settings.allowRecommendations,
        });
      }

      // Update the reference snapshot so hasUnsavedChanges correctly returns false
      initialStateRef.current = {
        showWatchlist: settings.showWatchlist,
        showStats: settings.showStats,
        allowRecommendations: settings.allowRecommendations,
      };
      setHasUnsavedChanges(false);

      toast({
        title: text("settings.settingsSaved", "Settings saved"),
        description: text(
          "settings.settingsSavedDesc",
          "Your preferences have been updated.",
        ),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: text("settings.saveErrorTitle", "Error saving settings"),
        description: text(
          "settings.saveErrorDesc",
          "Settings saved locally, but syncing to server failed.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    // Reset to the last saved snapshot without reloading the page
    setSettings({
      showWatchlist: initialStateRef.current.showWatchlist,
      showStats: initialStateRef.current.showStats,
      allowRecommendations: initialStateRef.current.allowRecommendations,
    });
    setHasUnsavedChanges(false);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    toast({
      title: text("settings.languageUpdated", "Language updated"),
      description: `${text("settings.languageChangedTo", "Language changed to")} ${languages.find((l) => l.code === langCode)?.name}`,
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

      navigate(user?.id ? "/auth" : "/");
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
        title={text("settings.seoTitle", "Settings - CineTrekker")}
        description={text("settings.seoDescription", "Manage your account settings and preferences")}
        canonical="https://cinetrekker.vercel.app/settings"
      />
      <motion.div
        className="page-container ct-page-shell max-w-4xl pt-20 pb-24 md:pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section variants={itemVariants} className="mb-8">
          <Card className="ct-panel-strong relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-red-500/5 pointer-events-none" />

            <CardContent className="pt-8 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center backdrop-blur-sm">
                  <SettingsIcon className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h1 className="section-title mb-0 text-2xl md:text-3xl">
                    {text("nav.settings", "Settings")}
                  </h1>
                  <p className="text-muted-foreground">
                    {text(
                      "settings.heroDescription",
                      "Adjust your account, privacy, and content safety controls.",
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {isLoadingSettings && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!isLoadingSettings && (
          <>
            <div className="space-y-7">
            <motion.div variants={itemVariants}>
              <SettingsSection
                id="settings-account"
                sectionLabel={text("settings.accountSection", "Account")}
                sectionIcon={UserRound}
                sectionIconClass="text-red-400"
                title={text(
                  "settings.accountPanelTitle",
                  "Account preferences",
                )}
                description={text(
                  "settings.accountPanelDesc",
                  "Manage language and personalized features.",
                )}
                headerIcon={UserRound}
                headerIconClass="text-red-400"
                isOpen={
                  isMobileSectionCollapse ? mobileExpandedSections.account : true
                }
                onToggle={
                  isMobileSectionCollapse
                    ? () =>
                        setMobileExpandedSections((prev) => ({
                          ...prev,
                          account: !prev.account,
                        }))
                    : undefined
                }
              >
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="language"
                      className="flex items-center gap-2 text-foreground"
                    >
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      {text("settings.language", "Language")}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {text(
                        "settings.languageOptionDesc",
                        "Pick the language used for buttons, labels, and menus. Six languages are available today.",
                      )}
                    </p>
                  </div>
                  <Select
                    value={currentLanguage.code}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger
                      id="language"
                      className="w-full border-border/60 bg-card/80 focus:border-red-500 focus:ring-red-500/20 sm:max-w-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {languages.map((lang) => (
                        <SelectItem
                          key={lang.code}
                          value={lang.code}
                          className="focus:bg-accent focus:text-accent-foreground"
                        >
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <SettingsSwitchRow
                  id="allowRecommendations"
                  icon={Sparkles}
                  title={text(
                    "settings.allowRecommendations",
                    "Smart Recommendations",
                  )}
                  description={text(
                    "settings.allowRecommendationsDesc",
                    "Show personalized picks based on what you watch and rate.",
                  )}
                  checked={settings.allowRecommendations}
                  onCheckedChange={(checked) =>
                    updateProfileSetting("allowRecommendations", checked)
                  }
                  isPulsing={pulseRowId === "allowRecommendations"}
                />
              </SettingsSection>
            </motion.div>

            <motion.div id="settings-accessibility" variants={itemVariants}>
              <SettingsSection
                id="settings-accessibility-panel"
                sectionLabel={text("settings.accessibilitySection", "Accessibility")}
                sectionIcon={Accessibility}
                sectionIconClass="text-red-400"
                title={text("settings.accessibilityDisplay", "Accessibility & display")}
                description={text("settings.accessibilityDisplayDesc", "Adjust readability, theme, and motion in the same place you manage the rest of your preferences.")}
                headerIcon={Accessibility}
                headerIconClass="text-red-400"
                isOpen={
                  isMobileSectionCollapse
                    ? mobileExpandedSections.accessibility
                    : true
                }
                onToggle={
                  isMobileSectionCollapse
                    ? () =>
                        setMobileExpandedSections((prev) => ({
                          ...prev,
                          accessibility: !prev.accessibility,
                        }))
                    : undefined
                }
              >
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        {text("settings.textSize", "Text size")}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {text("settings.textSizeDesc", "Increase or decrease text size throughout the app.")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-border/60 bg-card/80 text-foreground hover:bg-card"
                        onClick={decreaseFontSize}
                        aria-label={text("settings.decreaseFontSize", "Decrease font size")}
                        disabled={fontSize <= MIN_FONT_SIZE}
                      >
                        -
                      </Button>
                      <Slider
                        value={[fontSize]}
                        onValueChange={(value) => setFontSize(value[0])}
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={FONT_SIZE_STEP}
                        className="flex-1"
                        aria-label={text("settings.textSize", "Font size")}
                        aria-valuemin={MIN_FONT_SIZE}
                        aria-valuemax={MAX_FONT_SIZE}
                        aria-valuenow={fontSize}
                        aria-valuetext={`${fontSize}%`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 border-border/60 bg-card/80 text-foreground hover:bg-card"
                        onClick={increaseFontSize}
                        aria-label={text("settings.increaseFontSize", "Increase font size")}
                        disabled={fontSize >= MAX_FONT_SIZE}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-background/40 px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {text("settings.currentSize", "Current size")}
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {fontSize}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {text("settings.appTheme", "App theme")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text("settings.appThemeDesc", "Choose Dark, Light, or OLED mode for the full interface.")}
                      </p>
                    </div>
                    <div className="ct-toggle-group">
                      {(["dark", "light", "oled"] as const).map((option) => {
                        const active = theme === option;
                        const label =
                          option === "oled"
                            ? "OLED"
                            : option[0].toUpperCase() + option.slice(1);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={cn(
                              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                              active
                                ? "ct-toggle-button-active"
                                : "ct-toggle-button hover:text-foreground",
                            )}
                            onClick={() => setTheme(option)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/70 px-4 py-4 transition-all duration-300",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="reduceMotion"
                      id="reduceMotion-label"
                      className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground"
                    >
                      <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {text("settings.reduceMotion", "Reduce motion")}
                    </Label>
                    <p
                      id="reduceMotion-description"
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      {text("settings.reduceMotionDesc", "Minimize animations and transitions across the app.")}
                    </p>
                  </div>
                  <Switch
                    id="reduceMotion"
                    checked={reduceMotion}
                    onCheckedChange={setReduceMotion}
                    aria-labelledby="reduceMotion-label"
                    aria-describedby="reduceMotion-description"
                  />
                </div>

                <Button
                  ref={resetAccessibilityButtonRef}
                  type="button"
                  onClick={() => setConfirmResetAccessibilityOpen(true)}
                  variant="outline"
                  className="w-full gap-2 border border-red-500/70 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <RotateCcw className="h-4 w-4" />
                  {text("settings.resetAccessibilityDefaults", "Reset accessibility defaults")}
                </Button>
              </SettingsSection>
            </motion.div>

            <motion.div variants={itemVariants}>
              <SettingsSection
                id="settings-privacy"
                sectionLabel={text("settings.privacySection", "Privacy")}
                sectionIcon={Lock}
                sectionIconClass="text-red-400"
                title={text("profile.privacySettings", "Privacy Settings")}
                description={text(
                  "settings.privacyDesc",
                  "Control what others can see on your profile",
                )}
                headerIcon={Lock}
                headerIconClass="text-red-400"
                isOpen={
                  isMobileSectionCollapse ? mobileExpandedSections.privacy : true
                }
                onToggle={
                  isMobileSectionCollapse
                    ? () =>
                        setMobileExpandedSections((prev) => ({
                          ...prev,
                          privacy: !prev.privacy,
                        }))
                    : undefined
                }
              >
                <SettingsSwitchRow
                  id="showWatchlist"
                  icon={Bookmark}
                  title={text("profile.showWatchlist", "Show Watchlist")}
                  description={text(
                    "profile.showWatchlistDesc",
                    "Show your watchlist to people who can view your profile.",
                  )}
                  checked={settings.showWatchlist}
                  onCheckedChange={(checked) =>
                    updateProfileSetting("showWatchlist", checked)
                  }
                  isPulsing={pulseRowId === "showWatchlist"}
                />

                <SettingsSwitchRow
                  id="showStats"
                  icon={TrendingUp}
                  title={text("profile.showStats", "Show Statistics")}
                  description={text(
                    "profile.showStatsDesc",
                    "Show your viewing activity and progress stats on your profile.",
                  )}
                  checked={settings.showStats}
                  onCheckedChange={(checked) =>
                    updateProfileSetting("showStats", checked)
                  }
                  isPulsing={pulseRowId === "showStats"}
                />
              </SettingsSection>
            </motion.div>

            <motion.div variants={itemVariants}>
              <SettingsSection
                id="settings-content-safety"
                sectionLabel={text(
                  "settings.contentSafetySection",
                  "Content Safety",
                )}
                sectionIcon={Shield}
                sectionIconClass="text-red-400"
                title={text(
                  "contentPolicy.safetySettingsTitle",
                  "Content safety",
                )}
                description={text(
                  "contentPolicy.safetySettingsDesc",
                  "Choose what maturity levels appear across your app.",
                )}
                headerIcon={Shield}
                headerIconClass="text-red-400"
                className="mb-0"
                isOpen={
                  isMobileSectionCollapse
                    ? mobileExpandedSections.contentSafety
                    : true
                }
                onToggle={
                  isMobileSectionCollapse
                    ? () =>
                        setMobileExpandedSections((prev) => ({
                          ...prev,
                          contentSafety: !prev.contentSafety,
                        }))
                    : undefined
                }
              >
                <SettingsSwitchRow
                  id="familyFriendlyMode"
                  icon={Shield}
                  title={text(
                    "contentPolicy.familyFriendlyLabel",
                    "Family Friendly Mode",
                  )}
                  description={text(
                    "contentPolicy.familyFriendlyDesc",
                    "Hide mature and adult titles across the app.",
                  )}
                  checked={familyFriendlyEnabled}
                  onCheckedChange={(checked) => {
                    void updateSafetyMode(
                      checked ? SafetyLevel.STRICT : SafetyLevel.MODERATE,
                    );
                  }}
                  isPulsing={pulseRowId === "content-safety"}
                />

                <SettingsSwitchRow
                  id="teenSafeMode"
                  icon={Shield}
                  title={text(
                    "contentPolicy.teenSafeLabel",
                    "Teen Safe Filtering",
                  )}
                  description={text(
                    "contentPolicy.teenSafeDesc",
                    "Hide only explicit 18+ and adult titles.",
                  )}
                  checked={teenSafeEnabled}
                  disabled={familyFriendlyEnabled}
                  disabledHint={
                    familyFriendlyEnabled
                      ? text(
                          "contentPolicy.teenSafeDisabled",
                          "Unavailable while Family Friendly Mode is on.",
                        )
                      : undefined
                  }
                  onCheckedChange={(checked) => {
                    void updateSafetyMode(
                      checked ? SafetyLevel.MODERATE : SafetyLevel.NONE,
                    );
                  }}
                  isPulsing={pulseRowId === "content-safety"}
                  tooltipAriaLabel={text(
                    "contentPolicy.teenSafeInfoAriaLabel",
                    "More info about Teen Safe Filtering",
                  )}
                  tooltipText={text(
                    "contentPolicy.teenSafeTooltip",
                    "Teen Safe hides explicit 18+ and adult titles. Family Friendly mode includes Teen Safe filtering.",
                  )}
                />

                <div className="rounded-lg border border-border/60 bg-card/70 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {text("contentPolicy.hierarchyHint", "Filtering hierarchy")}
                    :{" "}
                    {text(
                      "contentPolicy.hierarchyHintDesc",
                      "Family Friendly includes Teen Safe filtering.",
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text("contentPolicy.ageStatus", "Age verified")}:{" "}
                    {ageLabel}
                  </p>
                </div>
              </SettingsSection>
            </motion.div>

            <motion.div variants={itemVariants}>
              <SettingsSection
                id="settings-data-management"
                sectionLabel={text("settings.dataManagementSection", "Data management")}
                sectionIcon={Database}
                sectionIconClass="text-red-400"
                title={text("settings.dataManagementTitle", "Data management")}
                description={text(
                  "settings.dataManagementDesc",
                  "Export a copy of your data or remove your CineTrekker profile data from this app.",
                )}
                headerIcon={Database}
                headerIconClass="text-red-400"
                isOpen={
                  isMobileSectionCollapse
                    ? mobileExpandedSections.dataManagement
                    : true
                }
                onToggle={
                  isMobileSectionCollapse
                    ? () =>
                        setMobileExpandedSections((prev) => ({
                          ...prev,
                          dataManagement: !prev.dataManagement,
                        }))
                    : undefined
                }
              >
                <div className="rounded-xl border border-border/60 bg-card/70 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {text(
                          "settings.downloadDataTitle",
                          "Download your CineTrekker data",
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text(
                          "settings.downloadDataDesc",
                          "Export your profile, settings, content-safety state, watchlist, watched history, and hidden recommendations in one JSON file.",
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="md:self-start"
                      onClick={() => void exportData()}
                      disabled={isExportingData}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {isExportingData
                        ? text("settings.preparingExport", "Preparing export...")
                        : text("settings.exportData", "Export data")}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <ShieldAlert className="h-4 w-4 text-red-400" />
                        {text("settings.dangerZone", "Danger zone")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text(
                          "settings.dangerZoneDesc",
                          "Delete your CineTrekker profile data, saved preferences, watchlist, watched history, favorites, and local backups from this app.",
                        )}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {text(
                          "settings.dangerZoneHelp",
                          "Full identity-provider account removal may still require a separate privacy request. You can review the policy or contact the team from the links below.",
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/privacy">
                            {text("settings.privacyPolicyLink", "Privacy policy")}
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/feedback">
                            {text("settings.feedbackPageLink", "Feedback page")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      className="md:self-start"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isDeletingData}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {user
                        ? text("settings.deleteAccount", "Delete account")
                        : text("settings.clearThisDevice", "Clear this device")}
                    </Button>
                  </div>
                </div>
              </SettingsSection>
            </motion.div>
            </div>

            <StickySaveBar
              isVisible={hasUnsavedChanges}
              isSaving={isSaving}
              onSave={handleSaveSettings}
              onCancel={handleCancelChanges}
              saveLabel={text("settings.saveChanges", "Save Changes")}
              cancelLabel={text("common.cancel", "Cancel")}
              className="border-t-red-500/10"
            >
              {text(
                "settings.savePendingHint",
                "Save your pending settings changes from anywhere on the page.",
              )}
            </StickySaveBar>
          </>
        )}
      </motion.div>
      <AlertDialog
        open={confirmResetAccessibilityOpen}
        onOpenChange={setConfirmResetAccessibilityOpen}
      >
        <AlertDialogContent
          className="border-border bg-background"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            resetAccessibilityButtonRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset accessibility settings?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore theme, text size, and motion preferences to
              their default values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={resetAccessibilitySettings}
            >
              Confirm reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete CineTrekker account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes your profile data from CineTrekker, including saved
              settings, watch history, watchlist, pinned favorites, and local
              backups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingData}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteAccountData();
              }}
              disabled={isDeletingData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingData ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


