import { useTranslation } from "react-i18next";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";
import { languages } from "@/i18n";
import { cn } from "@/lib/utils";
import { StickySaveBar } from "@/components/StickySaveBar";
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
  shouldHandleAccessibilityShortcutKey,
  type SettingsState,
} from "@/pages/settings.utils";

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
    transition: { duration: 0.4, ease: "easeOut" },
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
        "flex items-center justify-between gap-4 rounded-xl border px-4 py-4 transition-all duration-300",
        checked
          ? "border-[color:hsl(var(--border))] bg-[var(--bg-row)]"
          : "border-[color:hsl(var(--border))] bg-[var(--bg-row)] hover:border-white/20",
        disabled && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={id}
          id={labelId}
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
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
                  className="inline-flex items-center rounded-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-row)]"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 rounded-md border border-[color:hsl(var(--border))] bg-[var(--bg-card)] px-3 py-2 text-xs font-normal normal-case tracking-normal text-[var(--text-primary)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
                >
                  {tooltipText}
                </span>
              </span>
            )}
          </span>
        </Label>
        <p id={descriptionId} className="mt-1 text-sm text-[var(--text-secondary)]">
          {description}
        </p>
        {disabledHint && (
          <p id={disabledHintId} className="mt-1 text-xs text-[var(--text-secondary)]">
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
      <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        <SectionIcon className={cn("h-3.5 w-3.5", sectionIconClass)} />
        {sectionLabel}
      </p>
      <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-sm">
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { maturityRating, setMaturityRating, isAgeKnown } = useContentPolicy();
  const { toast } = useToast();

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
  const [mobileExpandedSections, setMobileExpandedSections] = useState({
    account: true,
    privacy: true,
    contentSafety: true,
  });

  const text = useCallback(
    (key: string, fallback: string) => humanizeUiText(String(t(key, fallback))),
    [t],
  );

  const withTimeout = useCallback(
    async <T,>(
      promise: Promise<T>,
      ms: number,
      message: string,
    ): Promise<T> => {
      return Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error(message)), ms);
        }),
      ]);
    },
    [],
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
        const applyLoadedSettings = (loaded: SettingsState) => {
          const normalized = normalizeSettingsState(loaded, DEFAULT_SETTINGS);
          setSettings(normalized);
          initialStateRef.current = normalized;
          setHasUnsavedChanges(false);
        };

        if (user?.id) {
          logger.debug("Loading settings from Supabase for user:", user.id);

          const profile = await withTimeout(
            profileService.getProfile(user.id),
            10000,
            "Settings load timeout",
          );

          if (!isMounted) return;

          if (profile) {
            applyLoadedSettings({
              showWatchlist: profile.show_watchlist,
              showStats: profile.show_stats,
              allowRecommendations: profile.allow_recommendations,
            });
          } else {
            const storedSettings = readStoredSettings(
              localStorage.getItem(profileKey),
              DEFAULT_SETTINGS,
            );
            applyLoadedSettings(storedSettings ?? DEFAULT_SETTINGS);
          }

          if (isMounted) {
            subscription = profileService.subscribeToProfile(
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
        } else {
          const storedSettings = readStoredSettings(
            localStorage.getItem(profileKey),
            DEFAULT_SETTINGS,
          );
          applyLoadedSettings(storedSettings ?? DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
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

    void loadSettings();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id, profileKey, toast, withTimeout]);

  useEffect(() => {
    if (!isLoadingSettings) {
      setHasUnsavedChanges(hasSettingsChangedMemo());
    }
  }, [isLoadingSettings, hasSettingsChangedMemo]);

  const triggerRowPulse = (rowId: string) => {
    setPulseRowId(rowId);
    window.setTimeout(
      () => setPulseRowId((active) => (active === rowId ? null : active)),
      520,
    );
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
        title: "Error saving settings",
        description: "Settings saved locally, but syncing to server failed.",
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
      title: "Language updated",
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

  return (
    <>
      <SEO
        title="Settings - CineTrekker"
        description="Manage your account settings and preferences"
        canonical="https://cinetrekker.vercel.app/settings"
      />
      <motion.div
        className="page-container max-w-4xl bg-[var(--bg-page)] pt-20 pb-24 md:pb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section variants={itemVariants} className="mb-8">
          <Card className="relative overflow-hidden border-[color:hsl(var(--border))] bg-[var(--bg-card)] backdrop-blur-md shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-red-500/5 pointer-events-none" />

            <CardContent className="pt-8 pb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center backdrop-blur-sm">
                  <SettingsIcon className="w-7 h-7 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {text("nav.settings", "Settings")}
                  </h1>
                  <p className="text-[var(--text-secondary)]">
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
                <div className="flex flex-col gap-3 rounded-xl border border-[color:hsl(var(--border))] bg-[var(--bg-row)] p-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="language"
                      className="flex items-center gap-2 text-[var(--text-primary)]"
                    >
                      <Languages className="h-4 w-4 text-[var(--text-secondary)]" />
                      {text("settings.language", "Language")}
                    </Label>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {text(
                        "settings.languageOptionDesc",
                        "Pick the language used for buttons, labels, and menus.",
                      )}
                    </p>
                  </div>
                  <Select
                    value={currentLanguage.code}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger
                      id="language"
                      className="w-full border-[color:hsl(var(--border))] bg-[var(--bg-row)] focus:border-red-500 focus:ring-red-500/20 sm:max-w-xs"
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

                <div className="rounded-lg border border-[color:hsl(var(--border))] bg-[var(--bg-row)] px-4 py-3">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {text("contentPolicy.hierarchyHint", "Filtering hierarchy")}
                    :{" "}
                    {text(
                      "contentPolicy.hierarchyHintDesc",
                      "Family Friendly includes Teen Safe filtering.",
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {text("contentPolicy.ageStatus", "Age verified")}:{" "}
                    {ageLabel}
                  </p>
                </div>
              </SettingsSection>
            </motion.div>

            {/* Accessibility shortcut section */}
            <motion.div id="settings-accessibility" variants={itemVariants}>
              <div>
                <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                  <Accessibility className="h-3.5 w-3.5 text-red-400" />
                  {text("settings.accessibilitySection", "Accessibility")}
                </p>
                <div
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[color:hsl(var(--border))] bg-[var(--bg-card)] px-5 py-4 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-[var(--bg-row)]"
                  onClick={() => navigate("/accessibility")}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (!shouldHandleAccessibilityShortcutKey(e.key)) return;
                    e.preventDefault();
                    navigate("/accessibility");
                  }}
                  aria-label="Go to Accessibility Settings"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-red-700/20">
                      <Accessibility className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Accessibility Options
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Adjust text size, theme, and motion preferences for easier viewing.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                </div>
              </div>
            </motion.div>
            </div>

            <StickySaveBar
              isVisible={hasUnsavedChanges}
              isSaving={isSaving}
              onSave={handleSaveSettings}
              onCancel={handleCancelChanges}
              saveLabel={text("settings.saveChanges", "Save Changes")}
              cancelLabel={text("common.cancel", "Cancel")}
            />
          </>
        )}
      </motion.div>
    </>
  );
}


