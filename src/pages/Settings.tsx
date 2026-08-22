import { useTranslation } from "react-i18next";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
  Download,
  Trash2,
  Database,
  ShieldAlert,
  Type,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  Sun,
  Moon,
  Zap,
  Baby,
  ShieldCheck,
  Globe,
  ChevronRight,
  BellRing,
  MessageCircle,
  CalendarClock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";
import { changeLanguage, languages } from "@/i18n";
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
  BrowserPushError,
  disableBrowserPush,
  enableBrowserPush,
  getBrowserPushReadiness,
  type BrowserPushReadiness,
} from "@/lib/browserPush";
import {
  loadSyncedNotificationPreferences,
  readNotificationPreferences,
  saveNotificationPreferences,
  syncNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notificationPreferences";
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

// ─── Animation Variants ────────────────────────────────────────────────────────

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SettingsState = {
  showWatchlist: true,
  showStats: true,
  allowRecommendations: true,
};

const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const FONT_SIZE_STEP = 10;

// ─── Sidebar nav items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "section-account",        label: "Account",        icon: UserRound    },
  { id: "section-notifications",  label: "Notifications",  icon: BellRing     },
  { id: "section-accessibility",  label: "Accessibility",  icon: Accessibility },
  { id: "section-privacy",        label: "Privacy",        icon: Lock         },
  { id: "section-content-safety", label: "Content Safety", icon: Shield       },
  { id: "section-data",           label: "Data",           icon: Database     },
] as const;

// ─── SettingsSwitchRow ─────────────────────────────────────────────────────────

type SwitchRowProps = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  disabledHint?: string;
  onCheckedChange: (v: boolean) => void;
  isPulsing?: boolean;
  tooltipText?: string;
  tooltipAriaLabel?: string;
};

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
}: SwitchRowProps) {
  const labelId      = `${id}-label`;
  const descId       = `${id}-desc`;
  const hintId       = disabledHint ? `${id}-hint` : undefined;
  const tipId        = tooltipText  ? `${id}-tip`  : undefined;
  const describedBy  = [descId, hintId, tipId].filter(Boolean).join(" ");

  return (
    <motion.div
      animate={
        isPulsing
          ? { boxShadow: ["0 0 0 rgba(220,38,38,0)", "0 0 0 3px rgba(220,38,38,0.12)", "0 0 0 rgba(220,38,38,0)"] }
          : undefined
      }
      transition={{ duration: 0.5 }}
      className={cn(
        "flex items-start justify-between gap-6 py-4",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <Label
            htmlFor={id}
            id={labelId}
            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground"
          >
            {title}
            {tooltipText && (
              <span className="relative inline-flex group/tip">
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={tooltipAriaLabel ?? `More info about ${title}`}
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                <span
                  id={tipId}
                  role="tooltip"
                  className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-60 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
                >
                  {tooltipText}
                </span>
              </span>
            )}
          </Label>
          <p id={descId} className="mt-0.5 text-sm text-muted-foreground leading-snug">
            {description}
          </p>
          {disabledHint && (
            <p id={hintId} className="mt-1 text-xs text-muted-foreground/70 italic">
              {disabledHint}
            </p>
          )}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className="mt-0.5 shrink-0"
      />
    </motion.div>
  );
}

// ─── SettingsSection ───────────────────────────────────────────────────────────

type SectionProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
};

function SettingsSection({ id, label, icon: Icon, title, description, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24", className)}>
      {/* Section label */}
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{description}</p>
        </div>

        {/* Content */}
        <div className="px-6">{children}</div>
      </div>
    </section>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-border" />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Settings() {
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

  const [settings, setSettings]               = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving]               = useState(false);
  const [hasUnsavedChanges, setHasUnsaved]    = useState(false);
  const [isLoadingSettings, setIsLoading]     = useState(true);
  const [pulseRowId, setPulseRowId]           = useState<string | null>(null);
  const [isExportingData, setIsExporting]     = useState(false);
  const [isDeletingData, setIsDeleting]       = useState(false);
  const [isDeleteDialogOpen, setDeleteDialog] = useState(false);
  const [confirmResetOpen, setConfirmReset]   = useState(false);
  const [activeSection, setActiveSection]     = useState("section-account");
  const resetBtnRef = useRef<HTMLButtonElement | null>(null);

  const [fontSize, setFontSize] = useState<number>(
    () => readAccessibilityPreferences().fontSize,
  );
  const [reduceMotion, setReduceMotion] = useState<boolean>(
    () => readAccessibilityPreferences().reduceMotion,
  );
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    () => readNotificationPreferences(user?.id),
  );
  const [browserPushReadiness, setBrowserPushReadiness] = useState<BrowserPushReadiness>(
    () => getBrowserPushReadiness(),
  );
  const [isUpdatingBrowserPush, setIsUpdatingBrowserPush] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [isUpdatingProfilePrivacy, setIsUpdatingProfilePrivacy] = useState(false);

  const text = useCallback(
    (key: string, fallback: string) => humanizeUiText(String(t(key, fallback))),
    [t],
  );

  const initialStateRef = useRef<SettingsState>(DEFAULT_SETTINGS);
  // Mirrors `hasUnsavedChanges` synchronously so async loads (getProfile /
  // realtime) can tell whether the user has in-progress edits before stomping them.
  const hasUnsavedRef = useRef(false);

  const hasSettingsChangedMemo = useCallback(
    () => hasSettingsChanged(initialStateRef.current, settings),
    [settings],
  );

  // Scroll-spy
  useEffect(() => {
    if (isLoadingSettings) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLoadingSettings]);

  // Load settings
  useEffect(() => {
    let subscription: RealtimeChannel | null = null;
    let isMounted = true;

    const loadSettings = async () => {
      if (!isMounted) return;
      if (!user?.id) { setIsLoading(false); return; }

      setIsLoading(true);
      try {
        const apply = (loaded: SettingsState, opts?: { force?: boolean }) => {
          // A late server refresh (getProfile resolving, or a realtime push)
          // must not overwrite edits the user has already made but not saved.
          // `force` is used only for the initial load that seeds the baseline.
          if (!opts?.force && hasUnsavedRef.current) return;
          const normalized = normalizeSettingsState(loaded, DEFAULT_SETTINGS);
          setSettings(normalized);
          initialStateRef.current = normalized;
          hasUnsavedRef.current = false;
          setHasUnsaved(false);
        };

        apply(
          readStoredSettings(localStorage.getItem(profileKey), DEFAULT_SETTINGS) ?? DEFAULT_SETTINGS,
          { force: true },
        );

        void profileService.getProfile(user.id)
          .then((profile) => {
            if (!isMounted || !profile) return;
            setIsPublicProfile(profile.is_public ?? false);
            apply({ showWatchlist: profile.show_watchlist, showStats: profile.show_stats, allowRecommendations: profile.allow_recommendations });
          })
          .catch((e) => { if (isMounted) logger.error("Error loading settings", e); });

        if (isMounted) {
          subscription = await profileService.subscribeToProfile(user.id, (p) => {
            if (!isMounted) return;
            setIsPublicProfile(p.is_public ?? false);
            apply({ showWatchlist: p.show_watchlist, showStats: p.show_stats, allowRecommendations: p.allow_recommendations });
          });
        }
      } catch (e) {
        logger.error("Error loading settings", e);
        toast({ title: text("settings.loadErrorTitle", "Error loading settings"), description: text("settings.loadErrorDesc", "Using default settings."), variant: "destructive" });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadSettings();
    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [profileKey, text, toast, user?.id]);

  useEffect(() => {
    if (isLoadingSettings) return;
    const dirty = hasSettingsChangedMemo();
    hasUnsavedRef.current = dirty;
    setHasUnsaved(dirty);
  }, [isLoadingSettings, hasSettingsChangedMemo]);

  // Hash scroll
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    setNotificationPreferences(readNotificationPreferences(user?.id));

    if (!user?.id) return () => { cancelled = true; };

    void loadSyncedNotificationPreferences(user.id)
      .then((preferences) => {
        if (!cancelled) setNotificationPreferences(preferences);
      })
      .catch((error) => {
        logger.warn("Notification preferences could not sync", error);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  // Font size
  useEffect(() => {
    const clamped = saveFontSizePreference(fontSize);
    if (clamped !== fontSize) { setFontSize(clamped); return; }
    applyAccessibilityPreferencesToRoot();
  }, [fontSize]);

  // Reduce motion
  useEffect(() => {
    saveReduceMotionPreference(reduceMotion);
    applyAccessibilityPreferencesToRoot();
  }, [reduceMotion]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const triggerPulse = (rowId: string) => {
    setPulseRowId(rowId);
    window.setTimeout(() => setPulseRowId((a) => (a === rowId ? null : a)), 520);
  };

  const updateProfileSetting = (key: keyof typeof DEFAULT_SETTINGS, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
    triggerPulse(key);
    toast({
      title: text("settings.changeSaved", "Preference updated"),
      description: text("settings.changeSavedDesc", "Your change will be included when you tap Save Changes."),
    });
  };

  const handleProfilePrivacyToggle = async () => {
    if (!user?.id) {
      toast({
        title: text("settings.profilePrivacySignIn", "Sign in to change profile privacy"),
        description: text(
          "settings.profilePrivacySignInDesc",
          "Profile visibility is connected to your CineTrekker account.",
        ),
      });
      return;
    }

    const previousIsPublic = isPublicProfile;
    const nextIsPublic = !previousIsPublic;
    setIsPublicProfile(nextIsPublic);
    setIsUpdatingProfilePrivacy(true);

    try {
      await profileService.updateProfile(user.id, { is_public: nextIsPublic });
      window.dispatchEvent(new CustomEvent("profileUpdated"));
      toast({
        title: nextIsPublic
          ? text("profile.publicModeEnabled", "Public profile enabled")
          : text("profile.privateModeEnabled", "Private profile enabled"),
        description: nextIsPublic
          ? text(
              "profile.publicModeEnabledDesc",
              "Other members can now view your public profile details.",
            )
          : text(
              "profile.privateModeEnabledDesc",
              "Your profile details are now hidden from other members.",
            ),
      });
    } catch (error) {
      logger.error("Profile privacy update failed", error);
      setIsPublicProfile(previousIsPublic);
      toast({
        title: text("profile.privacyUpdateFailed", "Privacy update failed"),
        description: text(
          "profile.privacyUpdateFailedDesc",
          "Your profile visibility could not be changed. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfilePrivacy(false);
    }
  };

  const updateNotificationPreference = (
    key: keyof NotificationPreferences,
    checked: boolean,
  ) => {
    const next = saveNotificationPreferences(user?.id, {
      ...notificationPreferences,
      [key]: checked,
    });
    setNotificationPreferences(next);
    triggerPulse(`notification-${key}`);
    void syncNotificationPreferences(user?.id, next).catch((error) => {
      logger.warn("Notification preference sync failed", error);
    });
    toast({
      title: text("settings.notificationsUpdated", "Notification preference updated"),
      description: text("settings.notificationsUpdatedDesc", "This choice is active now and will sync to your account when available."),
    });
  };

  const handleBrowserPushChange = async () => {
    if (!user?.id) {
      toast({
        title: text("settings.browserAlertsSignInTitle", "Sign in to enable browser alerts"),
        description: text("settings.browserAlertsSignInDesc", "Browser alerts are connected to your CineTrekker account."),
      });
      return;
    }

    setIsUpdatingBrowserPush(true);
    try {
      const nextReadiness = notificationPreferences.browserPushEnabled
        ? await disableBrowserPush(user.id)
        : await enableBrowserPush(user.id);
      setBrowserPushReadiness(nextReadiness);
      setNotificationPreferences((current) => ({
        ...current,
        browserPushEnabled: !current.browserPushEnabled,
      }));
      toast({
        title: notificationPreferences.browserPushEnabled
          ? text("settings.browserAlertsDisabled", "Browser alerts disabled")
          : text("settings.browserAlertsEnabled", "Browser alerts enabled"),
        description: notificationPreferences.browserPushEnabled
          ? text("settings.browserAlertsDisabledDesc", "This device will no longer receive CineTrekker browser alerts.")
          : text("settings.browserAlertsEnabledDesc", "This device can now receive the updates you choose."),
      });
    } catch (error) {
      const description = error instanceof BrowserPushError
        ? error.message
        : text("settings.browserAlertsErrorDesc", "CineTrekker could not update browser alerts on this device.");
      setBrowserPushReadiness(getBrowserPushReadiness());
      toast({
        title: text("settings.browserAlertsError", "Browser alerts were not changed"),
        description,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingBrowserPush(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const parsed = readStoredProfileData(localStorage.getItem(profileKey));
      localStorage.setItem(profileKey, JSON.stringify({ ...parsed, settings }));
      if (user?.id) {
        await profileService.updateProfile(user.id, {
          show_watchlist: settings.showWatchlist,
          show_stats: settings.showStats,
          allow_recommendations: settings.allowRecommendations,
        });
      }
      initialStateRef.current = { ...settings };
      hasUnsavedRef.current = false;
      setHasUnsaved(false);
      toast({ title: text("settings.settingsSaved", "Settings saved"), description: text("settings.settingsSavedDesc", "Your preferences have been updated.") });
    } catch (e) {
      logger.error("Error saving settings", e);
      toast({ title: text("settings.saveErrorTitle", "Error saving settings"), description: text("settings.saveErrorDesc", "Settings saved locally, but syncing to server failed."), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setSettings({ ...initialStateRef.current });
    hasUnsavedRef.current = false;
    setHasUnsaved(false);
  };

  const handleLanguageChange = (langCode: string) => {
    void changeLanguage(langCode);
    toast({
      title: text("settings.languageUpdated", "Language updated"),
      description: `${text("settings.languageChangedTo", "Language changed to")} ${languages.find((l) => l.code === langCode)?.name}`,
    });
  };

  const updateSafetyMode = async (nextLevel: SafetyLevel) => {
    if (maturityRating === nextLevel) return;
    triggerPulse("content-safety");
    const { syncedRemotely } = await setMaturityRating(nextLevel);
    toast({
      title: syncedRemotely ? text("contentPolicy.savedTitle", "Safety settings updated") : text("contentPolicy.savedLocallyTitle", "Saved on this device"),
      description: text(
        syncedRemotely ? "contentPolicy.savedDescription" : "contentPolicy.savedLocallyDescription",
        syncedRemotely ? "Your content visibility preferences were saved right away." : "Your safety preference is active now.",
      ),
    });
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const storedProfile = readStoredProfileData(localStorage.getItem(profileKey));
      const remoteProfile = user?.id ? await profileService.getProfile(user.id) : null;
      const payload = {
        exportedAt: new Date().toISOString(),
        app: "CineTrekker",
        version: "settings-export-v1",
        account: user ? { userId: user.id, email: user.email ?? null } : { userId: "guest", email: null },
        profile: remoteProfile ?? storedProfile,
        settings,
        contentSafety: { maturityRating, isAgeKnown },
        watchlist, watched, hiddenRecommendations,
      };
      const blob   = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href  = url;
      anchor.download = `cinetrekker-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast({ title: text("settings.exportReadyTitle", "Export ready"), description: text("settings.exportReadyDesc", "Your profile, settings, and list data were downloaded as JSON.") });
    } catch (e) {
      logger.error("Error exporting data", e);
      toast({ title: text("settings.exportFailedTitle", "Export failed"), description: text("settings.exportFailedDesc", "Could not generate your data export. Please try again."), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const clearLocalAccountData = useCallback(() => {
    localStorage.removeItem(profileKey);
    localStorage.removeItem(`cinetrekker_profile_favorites_${user?.id || "guest"}`);
    localStorage.removeItem(user?.id ? `${STORAGE_KEYS.hidden}_${user.id}` : STORAGE_KEYS.hidden);
    clearGuestWatchlist();
    clearGuestWatched();
    localStorage.setItem(user?.id ? `${STORAGE_KEYS.hidden}_${user.id}` : STORAGE_KEYS.hidden, JSON.stringify([]));
  }, [profileKey, user?.id]);

  const deleteAccountData = async () => {
    setIsDeleting(true);
    try {
      clearLocalAccountData();
      if (user?.id) {
        const results = await Promise.all([
          supabase.from("user_watchlist").delete().eq("user_id", user.id),
          supabase.from("user_watched").delete().eq("user_id", user.id),
          supabase.from("profiles").delete().eq("user_id", user.id),
        ]);
        const err = results.find((r) => r.error)?.error;
        if (err) throw err;
        await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
        await signOut();
      }
      toast({
        title: text("settings.accountDeletedTitle", "Account data deleted"),
        description: user?.id
          ? text("settings.accountDeletedSignedInDesc", "Your CineTrekker profile data was removed and you were signed out.")
          : text("settings.accountDeletedGuestDesc", "This device's CineTrekker data was cleared."),
      });
      navigate(user?.id ? "/auth" : "/");
    } catch (e) {
      logger.error("Error deleting account data", e);
      toast({ title: text("settings.deletionFailedTitle", "Deletion failed"), description: text("settings.deletionFailedDesc", "We could not remove all account data. Please try again."), variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialog(false);
    }
  };

  const resetAccessibility = () => {
    setFontSize(100);
    setReduceMotion(false);
    setTheme("dark");
    toast({ title: text("settings.accessibilityResetTitle", "Accessibility reset"), description: text("settings.accessibilityResetDesc", "Theme, text size, and motion preferences are back to defaults.") });
  };

  // ── Computed ─────────────────────────────────────────────────────────────────

  const currentLanguage       = languages.find((l) => l.code === i18n.language) || languages[0];
  const ageLabel              = isAgeKnown ? text("contentPolicy.verified", "Verified") : text("contentPolicy.notSet", "Not set");
  const familyFriendlyEnabled = maturityRating === SafetyLevel.STRICT;
  const teenSafeEnabled       = maturityRating === SafetyLevel.STRICT || maturityRating === SafetyLevel.MODERATE;

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <SEO
        title={text("settings.seoTitle", "Settings - CineTrekker")}
        description={text("settings.seoDescription", "Manage your account settings and preferences")}
        canonical="https://cinetrekker.vercel.app/settings"
      />

      <div className="page-container ct-page-shell max-w-5xl pt-20 pb-28 md:pb-12">

        {/* ── Page heading ──────────────────────────────────────────────── */}
        <motion.div
          variants={rowVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {text("nav.settings", "Settings")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {text("settings.heroDescription", "Manage your account, privacy, and content preferences.")}
              </p>
            </div>
          </div>

          <AnimatePresence>
            {!hasUnsavedChanges && !isLoadingSettings && (
              <motion.div
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex"
              >
                <Check className="h-3 w-3 text-emerald-500" />
                All changes saved
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Layout ─────────────────────────────────────────────────────── */}
        <div className="flex gap-10 lg:items-start">

          {/* Sidebar navigation */}
          <motion.aside
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            className="hidden w-44 shrink-0 lg:block"
          >
            <nav className="sticky top-24 space-y-0.5" aria-label="Settings sections">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = activeSection === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollTo(id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      active
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </motion.aside>

          {/* Main content */}
          {isLoadingSettings ? (
            <div className="min-w-0 flex-1 space-y-8" aria-busy="true" aria-label="Loading settings">
              {Array.from({ length: 4 }).map((_, index) => (
                <section
                  key={index}
                  className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_14px_40px_hsl(var(--background)/0.14)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded-md bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
                      <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-muted/75" />
                    </div>
                  </div>
                  <div className="mt-6 divide-y divide-border/50">
                    {Array.from({ length: index === 0 ? 2 : 3 }).map((__, row) => (
                      <div key={row} className="flex min-h-20 items-center justify-between gap-4 py-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
                          <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-muted/70" />
                        </div>
                        <span className="h-9 w-16 shrink-0 animate-pulse rounded-full bg-muted/80" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              <p className="sr-only" role="status">Loading settings…</p>
            </div>
          ) : (
            <motion.div
              className="min-w-0 flex-1 space-y-8"
              variants={pageVariants}
              initial="hidden"
              animate="visible"
            >

              {/* ══ 1. ACCOUNT ══════════════════════════════════════════════ */}
              <motion.div variants={rowVariants}>
                <SettingsSection
                  id="section-account"
                  label={text("settings.accountSection", "Account")}
                  icon={UserRound}
                  title={text("settings.accountPanelTitle", "Account preferences")}
                  description={text("settings.accountPanelDesc", "Manage language and personalized features.")}
                >
                  {/* Language */}
                  <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label htmlFor="language" className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {text("settings.language", "Language")}
                      </Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text("settings.languageOptionDesc", "Pick the language used for buttons, labels, and menus.")}
                      </p>
                    </div>
                    <Select value={currentLanguage.code} onValueChange={handleLanguageChange}>
                      <SelectTrigger id="language" className="w-full sm:w-48">
                        <Languages className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
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

                  <Divider />

                  <SettingsSwitchRow
                    id="allowRecommendations"
                    icon={Sparkles}
                    title={text("settings.allowRecommendations", "Smart recommendations")}
                    description={text("settings.allowRecommendationsDesc", "Show personalized picks based on what you watch and rate.")}
                    checked={settings.allowRecommendations}
                    onCheckedChange={(v) => updateProfileSetting("allowRecommendations", v)}
                    isPulsing={pulseRowId === "allowRecommendations"}
                  />
                </SettingsSection>
              </motion.div>

              {/* ══ 2. NOTIFICATIONS ════════════════════════════════════════ */}
              <motion.div id="section-notifications" variants={rowVariants}>
                <SettingsSection
                  id="section-notifications-panel"
                  label={text("settings.notificationsSection", "Notifications")}
                  icon={BellRing}
                  title={text("settings.notificationsTitle", "Notification controls")}
                  description={text("settings.notificationsDescription", "Choose the updates that earn your attention. These choices are saved on this device and affect the in-app notification center immediately.")}
                >
                  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <BellRing className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.notificationDeliveryNow", "In-app delivery is on")}
                        </p>
                        <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                          {text("settings.notificationDeliveryNowDesc", "Release updates appear in your CineTrekker inbox while you are using the app. Browser alerts and email delivery are not enabled yet.")}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/notifications"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {text("settings.openNotificationCenter", "Open inbox")}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  <Divider />

                  <SettingsSwitchRow
                    id="notification-releaseUpdates"
                    icon={BellRing}
                    title={text("settings.releaseUpdates", "Followed-title release updates")}
                    description={text("settings.releaseUpdatesDesc", "Add new episodes, movie releases, season changes, and release-date changes from titles you follow to your notification inbox.")}
                    checked={notificationPreferences.releaseUpdates}
                    onCheckedChange={(checked) => updateNotificationPreference("releaseUpdates", checked)}
                    isPulsing={pulseRowId === "notification-releaseUpdates"}
                  />

                  <Divider />

                  <SettingsSwitchRow
                    id="notification-inAppToasts"
                    icon={Sparkles}
                    title={text("settings.inAppToastAlerts", "In-app update banners")}
                    description={text("settings.inAppToastAlertsDesc", "Show a small on-screen banner when a new eligible update reaches your inbox.")}
                    checked={notificationPreferences.inAppToasts}
                    disabled={!notificationPreferences.releaseUpdates}
                    disabledHint={text("settings.inAppToastAlertsHint", "Turn on followed-title release updates first.")}
                    onCheckedChange={(checked) => updateNotificationPreference("inAppToasts", checked)}
                    isPulsing={pulseRowId === "notification-inAppToasts"}
                  />

                  <Divider />

                  <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.browserAlerts", "Browser alerts")}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                          {browserPushReadiness.permission === "denied"
                            ? text("settings.browserAlertsDenied", "Alerts are blocked in this browser. You can re-enable them from your browser's site settings.")
                            : browserPushReadiness.supported && browserPushReadiness.configured
                              ? text("settings.browserAlertsReady", "Receive the release updates you choose even when CineTrekker is not open.")
                              : text("settings.browserAlertsPending", "The permission flow is ready; secure delivery configuration is being completed.")}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={notificationPreferences.browserPushEnabled ? "outline" : "default"}
                      disabled={
                        isUpdatingBrowserPush ||
                        !browserPushReadiness.supported ||
                        !browserPushReadiness.secure ||
                        !browserPushReadiness.configured ||
                        browserPushReadiness.permission === "denied"
                      }
                      onClick={() => void handleBrowserPushChange()}
                      className="min-h-10 shrink-0 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                    >
                      {isUpdatingBrowserPush
                        ? text("settings.browserAlertsUpdating", "Updating…")
                        : notificationPreferences.browserPushEnabled
                          ? text("settings.browserAlertsDisable", "Disable on this device")
                          : browserPushReadiness.permission === "denied"
                            ? text("settings.browserAlertsBlocked", "Blocked by browser")
                            : !browserPushReadiness.configured
                              ? text("common.comingSoon", "Coming soon")
                              : text("settings.browserAlertsEnable", "Enable browser alerts")}
                    </Button>
                  </div>

                  <Divider />

                  <div className="flex items-start justify-between gap-6 py-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.socialUpdates", "Replies and social activity")}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                          {text("settings.socialUpdatesDesc", "Comment replies, follow activity, and collection interactions will use this preference when their delivery is enabled.")}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {text("common.comingSoon", "Coming soon")}
                    </span>
                  </div>

                  <Divider />

                  <div className="flex items-start justify-between gap-6 py-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.weeklyDigest", "Weekly watchlist digest")}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                          {text("settings.weeklyDigestDesc", "A calm weekly look at what is new, what is unfinished, and what is waiting in your watchlist. It will always be opt-in.")}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {text("common.comingSoon", "Coming soon")}
                    </span>
                  </div>
                </SettingsSection>
              </motion.div>

              {/* ══ 3. ACCESSIBILITY ════════════════════════════════════════ */}
              <motion.div id="section-accessibility" variants={rowVariants}>
                <SettingsSection
                  id="section-accessibility-panel"
                  label={text("settings.accessibilitySection", "Accessibility")}
                  icon={Accessibility}
                  title={text("settings.accessibilityDisplay", "Accessibility & display")}
                  description={text("settings.accessibilityDisplayDesc", "Adjust readability, theme, and motion preferences.")}
                >
                  {/* Text size */}
                  <div className="py-4">
                    <div className="flex items-start gap-3">
                      <Type className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.textSize", "Text size")}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {text("settings.textSizeDesc", "Adjust the base font size across the app.")}
                        </p>

                        {/* Slider */}
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setFontSize((c) => Math.max(MIN_FONT_SIZE, c - FONT_SIZE_STEP))}
                            disabled={fontSize <= MIN_FONT_SIZE}
                            aria-label={text("settings.decreaseFontSize", "Decrease font size")}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-base font-semibold text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                          >
                            −
                          </button>
                          <Slider
                            value={[fontSize]}
                            onValueChange={([v]) => setFontSize(v)}
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
                          <button
                            type="button"
                            onClick={() => setFontSize((c) => Math.min(MAX_FONT_SIZE, c + FONT_SIZE_STEP))}
                            disabled={fontSize >= MAX_FONT_SIZE}
                            aria-label={text("settings.increaseFontSize", "Increase font size")}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-base font-semibold text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                          >
                            +
                          </button>
                          <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                            {fontSize}%
                          </span>
                        </div>

                        {/* Preview */}
                        <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                          <p
                            className="text-muted-foreground transition-[font-size] duration-200"
                            style={{ fontSize: `${fontSize / 100}em` }}
                          >
                            The quick brown fox jumps over the lazy dog.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  {/* Theme */}
                  <div className="py-4">
                    <div className="flex items-start gap-3">
                      <Sun className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.appTheme", "App theme")}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {text("settings.appThemeDesc", "Choose Dark, Light, or OLED mode.")}
                        </p>

                        {/* Theme options */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(
                            [
                              { value: "dark"  as const, label: "Dark",  icon: Moon, swatch: "bg-neutral-900 border-neutral-700" },
                              { value: "light" as const, label: "Light", icon: Sun,  swatch: "bg-neutral-100 border-neutral-300" },
                              { value: "oled"  as const, label: "OLED",  icon: Zap,  swatch: "bg-black border-neutral-800"       },
                            ]
                          ).map(({ value, label, icon: ThemeIcon, swatch }) => {
                            const active = theme === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setTheme(value)}
                                className={cn(
                                  "group relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
                                  active
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                                )}
                              >
                                <div className={cn("flex h-8 w-full items-center justify-center rounded border", swatch)}>
                                  <ThemeIcon className={cn("h-3.5 w-3.5", value === "light" ? "text-neutral-700" : "text-neutral-300")} />
                                </div>
                                <span className="text-xs font-medium">{label}</span>
                                {active && (
                                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Divider />

                  {/* Reduce motion */}
                  <SettingsSwitchRow
                    id="reduceMotion"
                    icon={Eye}
                    title={text("settings.reduceMotion", "Reduce motion")}
                    description={text("settings.reduceMotionDesc", "Minimize animations and transitions across the app.")}
                    checked={reduceMotion}
                    onCheckedChange={setReduceMotion}
                  />

                  <Divider />

                  {/* Reset */}
                  <div className="py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Reset to defaults</p>
                        <p className="text-sm text-muted-foreground">Restore theme, text size, and motion preferences.</p>
                      </div>
                      <Button
                        ref={resetBtnRef}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmReset(true)}
                        className="shrink-0 gap-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {text("settings.resetAccessibilityDefaults", "Reset defaults")}
                      </Button>
                    </div>
                  </div>
                </SettingsSection>
              </motion.div>

              {/* ══ 3. PRIVACY ══════════════════════════════════════════════ */}
              <motion.div variants={rowVariants}>
                <SettingsSection
                  id="section-privacy"
                  label={text("settings.privacySection", "Privacy")}
                  icon={Lock}
                  title={text("profile.privacySettings", "Privacy settings")}
                  description={text("settings.privacyDesc", "Control what others can see on your profile.")}
                >
                  <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-foreground">
                          {text("profile.privateProfile", "Private profile")}
                        </p>
                        <span className="rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {isPublicProfile
                            ? text("profile.currentlyPublic", "Currently public")
                            : text("profile.currentlyPrivate", "Currently private")}
                        </span>
                      </div>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                        {isPublicProfile
                          ? text(
                              "profile.privateProfilePublicHint",
                              "Your public profile can show your bio, favorites, and public activity. Your age, private lists, and settings stay protected.",
                            )
                          : text(
                              "profile.privateProfilePrivateHint",
                              "People can find your name, but your profile details, favorites, activity, counts, and avatar stay hidden.",
                            )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isPublicProfile ? "outline" : "default"}
                      onClick={() => void handleProfilePrivacyToggle()}
                      disabled={!user?.id || isUpdatingProfilePrivacy}
                      className="shrink-0 gap-2"
                    >
                      {isUpdatingProfilePrivacy ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : isPublicProfile ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {isPublicProfile
                        ? text("profile.enablePrivateProfile", "Enable private profile")
                        : text("profile.disablePrivateProfile", "Disable private profile")}
                    </Button>
                  </div>
                  <Divider />
                  <SettingsSwitchRow
                    id="showWatchlist"
                    icon={Bookmark}
                    title={text("profile.showWatchlist", "Show watchlist")}
                    description={text("profile.showWatchlistDesc", "Allow others to see the titles in your watchlist.")}
                    checked={settings.showWatchlist}
                    onCheckedChange={(v) => updateProfileSetting("showWatchlist", v)}
                    isPulsing={pulseRowId === "showWatchlist"}
                  />
                  <Divider />
                  <SettingsSwitchRow
                    id="showStats"
                    icon={TrendingUp}
                    title={text("profile.showStats", "Show statistics")}
                    description={text("profile.showStatsDesc", "Show your viewing activity and progress stats on your profile.")}
                    checked={settings.showStats}
                    onCheckedChange={(v) => updateProfileSetting("showStats", v)}
                    isPulsing={pulseRowId === "showStats"}
                  />
                </SettingsSection>
              </motion.div>

              {/* ══ 4. CONTENT SAFETY ═══════════════════════════════════════ */}
              <motion.div variants={rowVariants}>
                <SettingsSection
                  id="section-content-safety"
                  label={text("settings.contentSafetySection", "Content Safety")}
                  icon={Shield}
                  title={text("contentPolicy.safetySettingsTitle", "Content safety")}
                  description={text("contentPolicy.safetySettingsDesc", "Choose what maturity levels are visible across the app.")}
                >
                  {/* Safety level selector */}
                  <div className="py-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(
                        [
                          { level: SafetyLevel.NONE,     label: "All ages",      sublabel: "No filtering applied",      icon: Globe       },
                          { level: SafetyLevel.MODERATE, label: "Teen safe",     sublabel: "Hides explicit 18+ titles",  icon: ShieldCheck },
                          { level: SafetyLevel.STRICT,   label: "Family",        sublabel: "Hides all mature content",   icon: Baby        },
                        ] as const
                      ).map(({ level, label, sublabel, icon: LevelIcon }) => {
                        const active = maturityRating === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => void updateSafetyMode(level)}
                            className={cn(
                              "group relative flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors",
                              active
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:bg-accent",
                            )}
                          >
                            <LevelIcon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                            <div>
                              <p className={cn("text-sm font-medium", active ? "text-foreground" : "text-foreground/80")}>
                                {label}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
                            </div>
                            {active && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Divider />

                  {/* Info strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Filtering hierarchy:</span>{" "}
                      {text("contentPolicy.hierarchyHintDesc", "Family Friendly includes Teen Safe filtering.")}
                    </p>
                    <span className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium",
                      isAgeKnown
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border bg-muted text-muted-foreground",
                    )}>
                      {text("contentPolicy.ageStatus", "Age")}: {ageLabel}
                    </span>
                  </div>
                </SettingsSection>
              </motion.div>

              {/* ══ 5. DATA MANAGEMENT ══════════════════════════════════════ */}
              <motion.div variants={rowVariants}>
                <SettingsSection
                  id="section-data"
                  label={text("settings.dataManagementSection", "Data")}
                  icon={Database}
                  title={text("settings.dataManagementTitle", "Data management")}
                  description={text("settings.dataManagementDesc", "Export a copy of your data or permanently remove your account.")}
                >
                  {/* Export */}
                  <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {text("settings.downloadDataTitle", "Export your data")}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {text("settings.downloadDataDesc", "Download your profile, settings, watchlist, and history as a JSON file.")}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={() => void exportData()}
                      disabled={isExportingData}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isExportingData
                        ? text("settings.preparingExport", "Preparing…")
                        : text("settings.exportData", "Export data")}
                    </Button>
                  </div>

                  <Divider />

                  {/* Danger zone */}
                  <div className="py-4">
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {text("settings.dangerZone", "Delete account data")}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground leading-snug">
                            {text("settings.dangerZoneDesc", "Permanently removes your profile, preferences, watchlist, and history. This cannot be undone.")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {text("settings.dangerZoneHelp", "Full identity-provider account removal may require a separate privacy request.")}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="flex gap-2">
                              <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs text-muted-foreground">
                                <Link to="/privacy">{text("settings.privacyPolicyLink", "Privacy policy")}</Link>
                              </Button>
                              <span className="text-muted-foreground/40">·</span>
                              <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs text-muted-foreground">
                                <Link to="/feedback">{text("settings.feedbackPageLink", "Feedback")}</Link>
                              </Button>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="ml-auto gap-2"
                              onClick={() => setDeleteDialog(true)}
                              disabled={isDeletingData}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {user
                                ? text("settings.deleteAccount", "Delete account")
                                : text("settings.clearThisDevice", "Clear this device")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingsSection>
              </motion.div>

            </motion.div>
          )}
        </div>
      </div>

      {/* ── Sticky Save Bar ──────────────────────────────────────────────── */}
      <StickySaveBar
        isVisible={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSaveSettings}
        onCancel={handleCancelChanges}
        saveLabel={text("settings.saveChanges", "Save changes")}
        cancelLabel={text("common.cancel", "Cancel")}
        className="border-t-red-500/10"
      >
        {text("settings.savePendingHint", "You have unsaved changes.")}
      </StickySaveBar>

      {/* ── Confirm Reset Accessibility ──────────────────────────────────── */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmReset}>
        <AlertDialogContent
          className="border-border bg-background"
          onCloseAutoFocus={(e) => { e.preventDefault(); resetBtnRef.current?.focus(); }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Reset accessibility settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore theme, text size, and motion preferences to their defaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={resetAccessibility}>
              Reset defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm Delete Account ───────────────────────────────────────── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account data?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your CineTrekker profile, saved settings, watch history, watchlist, and local backups.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingData}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void deleteAccountData(); }}
              disabled={isDeletingData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingData ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
