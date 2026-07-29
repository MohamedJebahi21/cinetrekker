import type { CrewMember, Creator, CastMember } from "@/types/media";
import { useTranslation } from "react-i18next";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Film,
  Check,
  Plus,
  Search,
  Lock,
  Trophy,
  Share2,
  CheckCircle2,
  BarChart3,
  CalendarDays,
  Camera,
  Sparkles,
  Star,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  X,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserLists } from "@/contexts/UserListsContext";
import { useAuth } from "@/contexts/AuthContext";
import { profileService, type UserProfile } from "@/services/profile";
import { validateDisplayName, sanitizeBio } from "@/lib/validation";
import { profileUpdateRateLimiter } from "@/lib/reviewRateLimiter";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/Image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { PaginationDotButton, PaginationDots } from "@/components/ui/pagination-dots";
import SEO from "@/components/SEO";
import { StickySaveBar } from "@/components/StickySaveBar";
import { humanizeUiText } from "@/lib/humanize-ui-text";
import { useTheme } from "@/contexts/ThemeContext";
import { usePinnedFavorites } from "@/hooks/usePinnedFavorites";
import { normalizePinnedFavoriteKeys } from "@/utils/pinnedFavorites";
import { absoluteSiteUrl } from "@/lib/siteUrl";
import {
  getImageUrl,
  getBackdropUrl,
  getMovieDetails,
  getTVDetails,
  searchMovies,
  searchTV,
} from "@/services/tmdb";

const ActorMatchesSection = lazy(
  () => import("@/components/profile/ActorMatchesSection"),
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

type LocalProfileDraft = {
  dob: string;
  displayName: string;
  bio: string;
  favoriteGenres: number[];
};

type ProfileMediaPreview = {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  runtimeMinutes: number;
  genreIds: number[];
};

type PinnedFavoriteRef = {
  mediaId: number;
  mediaType: "movie" | "tv";
};

type CarouselState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  activePage: number;
  pageCount: number;
};

const DEFAULT_CAROUSEL_STATE: CarouselState = {
  canScrollLeft: false,
  canScrollRight: true,
  activePage: 0,
  pageCount: 1,
};

function getCarouselState(
  container: HTMLDivElement | null,
): CarouselState {
  if (!container) {
    return DEFAULT_CAROUSEL_STATE;
  }

  const cards = Array.from(container.children) as HTMLElement[];
  const hasScroll = container.scrollWidth > container.clientWidth;
  const pageCount = hasScroll
    ? Math.max(1, Math.ceil(container.scrollWidth / container.clientWidth))
    : 1;
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - container.scrollLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  const activePage = hasScroll && cards.length > 1
    ? Math.min(
        pageCount - 1,
        Math.round((nearestIndex / (cards.length - 1)) * (pageCount - 1)),
      )
    : 0;

  return {
    canScrollLeft: hasScroll && container.scrollLeft > 10,
    canScrollRight:
      hasScroll &&
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10,
    activePage,
    pageCount,
  };
}

function useCountUp(target: number, durationMs: number, reduceMotion: boolean) {
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion) {
      setValue(target);
      return;
    }

    let animationFrame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      setValue(Math.round(target * progress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [durationMs, reduceMotion, target]);

  return value;
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { watched } = useUserLists();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const isLightTheme = theme === "light";

  const profileKey = useMemo(
    () => `cinetrekker_profile_${user?.id || "guest"}`,
    [user?.id],
  );
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [ageInput, setAgeInput] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [dobError, setDobError] = useState<string>("");
  const [favoriteGenres, setFavoriteGenres] = useState<number[]>([]);
  const [isEmailRevealed, setIsEmailRevealed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAvatarDragActive, setIsAvatarDragActive] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isFavoritesPickerOpen, setIsFavoritesPickerOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<
    "overview" | "favorites" | "taste" | "edit"
  >("overview");
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const favoriteMoviesCarouselRef = useRef<HTMLDivElement>(null);
  const favoriteSeriesCarouselRef = useRef<HTMLDivElement>(null);
  const [favoriteMoviesCarouselState, setFavoriteMoviesCarouselState] =
    useState<CarouselState>(DEFAULT_CAROUSEL_STATE);
  const [favoriteSeriesCarouselState, setFavoriteSeriesCarouselState] =
    useState<CarouselState>(DEFAULT_CAROUSEL_STATE);
  const [favoriteSearchType, setFavoriteSearchType] = useState<
    "all" | "movie" | "tv"
  >("all");
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const {
    pinnedFavoriteKeys,
    pinnedFavoritesStorageKey,
    persistPinnedFavorites,
    setPinnedFavoriteKeys,
  } = usePinnedFavorites({
    userId: user?.id,
    onSyncError: (error) => {
      console.error("Error syncing favorites:", error);
      toast({
        title: t("profile.favoritesSyncDelayed", "Favorites sync delayed"),
        description: t(
          "profile.favoritesSyncDelayedDesc",
          "Saved locally. Will retry on your next update.",
        ),
        variant: "destructive",
      });
    },
  });

  const text = useCallback(
    (key: string, fallback: string) => humanizeUiText(String(t(key, fallback))),
    [t],
  );

  const parseLocalDate = useCallback((value: string): Date | null => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day, 12, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const persistGuestProfile = useCallback(
    (draft: LocalProfileDraft) => {
      if (typeof window === "undefined") return;
      if (user?.id) return;

      const currentRaw = localStorage.getItem(profileKey);
      const currentParsed = currentRaw
        ? (JSON.parse(currentRaw) as Record<string, unknown>)
        : {};
      const merged = {
        ...currentParsed,
        ...draft,
      };

      localStorage.setItem(profileKey, JSON.stringify(merged));
    },
    [profileKey, user?.id],
  );

  const maskEmail = useCallback((email: string): string => {
    const atIndex = email.indexOf("@");
    if (atIndex <= 0) return text("common.hidden", "Hidden");
    const localPart = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);
    if (!domain) return text("common.hidden", "Hidden");

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}****@${domain}`;
    }

    return `${localPart[0]}****${localPart[localPart.length - 1]}@${domain}`;
  }, [text]);

  const visibleEmail = useMemo(() => {
    if (!user?.email) return "";
    return isEmailRevealed ? user.email : maskEmail(user.email);
  }, [isEmailRevealed, maskEmail, user?.email]);

  useEffect(() => {
    if (!shareCopied) return;
    const timer = window.setTimeout(() => setShareCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [shareCopied]);

  useEffect(() => {
    if (isEditMode) {
      setActiveProfileTab("edit");
    } else if (activeProfileTab === "edit") {
      setActiveProfileTab("overview");
    }
  }, [activeProfileTab, isEditMode]);

  const optimisticGenresMutation = useMutation({
    mutationFn: async (nextGenres: number[]) => {
      if (!user?.id) return;
      await profileService.saveProfile(user.id, {
        favorite_genres: nextGenres,
      });
    },
    onSuccess: (_, nextGenres) => {
      initialStateRef.current = {
        ...initialStateRef.current,
        favoriteGenres: [...nextGenres],
      };
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: () => {
      toast({
        title: t("profile.syncFailed", "Sync failed"),
        description: t(
          "profile.syncGenreChangesFailed",
          "Could not sync genre changes. Please try again.",
        ),
        variant: "destructive",
      });
    },
  });

  // Store initial state for change detection
  const initialStateRef = useRef({
    profilePhoto: "",
    dateOfBirth: "",
    displayName: "",
    bio: "",
    favoriteGenres: [] as number[],
  });
  const initialSnapshotReadyRef = useRef(false);

  // Helper function to detect actual changes
  const hasChanges = useCallback(() => {
    const initial = initialStateRef.current;
    const current = {
      profilePhoto: profilePhoto || "",
      dateOfBirth: dateOfBirth || "",
      displayName: displayName || "",
      bio: bio || "",
      favoriteGenres: favoriteGenres,
    };

    return (
      initial.profilePhoto !== current.profilePhoto ||
      initial.dateOfBirth !== current.dateOfBirth ||
      initial.displayName !== current.displayName ||
      initial.bio !== current.bio ||
      JSON.stringify(initial.favoriteGenres) !==
        JSON.stringify(current.favoriteGenres)
    );
  }, [profilePhoto, dateOfBirth, displayName, bio, favoriteGenres]);

  // Load profile from Supabase (with localStorage fallback)
  useEffect(() => {
    let subscription: { unsubscribe: () => Promise<unknown> | void } | null =
      null;
    let isMounted = true;

    const loadProfile = async () => {
      if (!isMounted) return;

      setIsLoadingProfile(true);

      try {
        if (user?.id) {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile load timeout")), 10000),
          );

          const loadPromise = profileService.getProfile(user.id);
          const profile = (await Promise.race([
            loadPromise,
            timeoutPromise,
          ])) as UserProfile | null;

          if (!isMounted) return;

          if (profile) {
            setProfilePhoto(
              profile.avatar_url || profile.profile_photo || null,
            );
            setDateOfBirth(profile.date_of_birth || "");
            setDisplayName(profile.display_name || "");
            setBio(profile.bio || "");
            setFavoriteGenres(profile.favorite_genres || []);
            const normalizedFavorites = normalizePinnedFavoriteKeys(
              Array.isArray(profile.favorite_titles)
                ? profile.favorite_titles
                : [],
            );
            setPinnedFavoriteKeys(normalizedFavorites);
            localStorage.setItem(
              pinnedFavoritesStorageKey,
              JSON.stringify(normalizedFavorites),
            );
          } else {
            // Fallback to localStorage if not in Supabase yet
            const stored = localStorage.getItem(profileKey);
            if (stored) {
              const parsed = JSON.parse(stored) as {
                dob?: string;
                displayName?: string;
                bio?: string;
                favoriteGenres?: number[];
              };
              setDateOfBirth(parsed.dob || "");
              setDisplayName(parsed.displayName || "");
              setBio(parsed.bio || "");
              setFavoriteGenres(parsed.favoriteGenres || []);
            }
          }

          // Subscribe to real-time updates (only if component is still mounted)
          if (isMounted) {
            subscription = await profileService.subscribeToProfile(
              user.id,
              (updatedProfile) => {
                if (!isMounted) return;
                setProfilePhoto(
                  updatedProfile.avatar_url ||
                    updatedProfile.profile_photo ||
                    null,
                );
                setDateOfBirth(updatedProfile.date_of_birth || "");
                setDisplayName(updatedProfile.display_name || "");
                setBio(updatedProfile.bio || "");
                setFavoriteGenres(updatedProfile.favorite_genres || []);
                setPinnedFavoriteKeys(
                  normalizePinnedFavoriteKeys(
                    Array.isArray(updatedProfile.favorite_titles)
                      ? updatedProfile.favorite_titles
                      : [],
                  ),
                );
              },
            );
          }
        } else {
          // Guest user - load from localStorage only
          const stored = localStorage.getItem(profileKey);
          if (!stored) {
            setInitialLoadComplete(true);
            setIsLoadingProfile(false);
            return;
          }
          const parsed = JSON.parse(stored) as {
            dob?: string;
            displayName?: string;
            bio?: string;
            favoriteGenres?: number[];
          };
          setDateOfBirth(parsed.dob || "");
          setDisplayName(parsed.displayName || "");
          setBio(parsed.bio || "");
          setFavoriteGenres(parsed.favoriteGenres || []);
        }
      } catch (error) {
        console.error("Error loading profile:", error);

        // Show user-friendly error
        if (isMounted) {
          toast({
            title: t("profile.loadingErrorTitle", "Profile Loading Error"),
            description: t(
              "profile.loadingErrorDesc",
              "Failed to load profile from server. Using cached data.",
            ),
            variant: "destructive",
          });
        }

        // Fallback to localStorage
        const stored = localStorage.getItem(profileKey);
        if (stored && isMounted) {
          try {
            const parsed = JSON.parse(stored) as {
              dob?: string;
              displayName?: string;
              bio?: string;
              favoriteGenres?: number[];
            };
            setDateOfBirth(parsed.dob || "");
            setDisplayName(parsed.displayName || "");
            setBio(parsed.bio || "");
            setFavoriteGenres(parsed.favoriteGenres || []);
          } catch (parseError) {
            console.error("Failed to parse localStorage profile:", parseError);
          }
        }
      } finally {
        if (isMounted) {
          setInitialLoadComplete(true);
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    // Cleanup function
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id, profileKey, pinnedFavoritesStorageKey, setPinnedFavoriteKeys, t, toast]);

  // Capture the loaded profile as the baseline once.
  useEffect(() => {
    if (initialLoadComplete && !initialSnapshotReadyRef.current) {
      initialStateRef.current = {
        profilePhoto: profilePhoto || "",
        dateOfBirth: dateOfBirth || "",
        displayName: displayName || "",
        bio: bio || "",
        favoriteGenres: [...favoriteGenres],
      };
      initialSnapshotReadyRef.current = true;
      setHasUnsavedChanges(false);
    }
  }, [
    initialLoadComplete,
    profilePhoto,
    dateOfBirth,
    displayName,
    bio,
    favoriteGenres,
    hasChanges,
  ]);

  // Detect unsaved changes against the captured baseline.
  useEffect(() => {
    if (initialSnapshotReadyRef.current) {
      setHasUnsavedChanges(hasChanges());
    }
  }, [profilePhoto, dateOfBirth, displayName, bio, favoriteGenres, hasChanges]);

  const handleSaveProfile = async (): Promise<void> => {
    setIsSaving(true);
    try {
      // Rate limiting check
      if (user?.id) {
        const rateLimitCheck = profileUpdateRateLimiter.canUpdateProfile(
          user.id,
        );
        if (!rateLimitCheck.allowed) {
          toast({
            title: t("profile.tooManyUpdates", "Too many updates"),
            description: t(
              "profile.waitBeforeUpdatingAgain",
              "Please wait {{seconds}} seconds before updating again.",
              { seconds: rateLimitCheck.retryAfter },
            ),
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      // Validate and sanitize inputs before saving
      const validatedDisplayName = validateDisplayName(displayName);
      const sanitizedBio = sanitizeBio(bio);

      // Update state with validated values
      if (validatedDisplayName !== displayName) {
        setDisplayName(validatedDisplayName || "");
      }
      if (sanitizedBio !== bio) {
        setBio(sanitizedBio || "");
      }

      // Save guest draft locally (avoid duplicating authenticated profile PII in localStorage)
      persistGuestProfile({
        dob: dateOfBirth,
        displayName: validatedDisplayName || "",
        bio: sanitizedBio || "",
        favoriteGenres,
      });

      // Save to Supabase if user is authenticated
      if (user?.id) {
        await profileService.saveProfile(user.id, {
          display_name: validatedDisplayName || null,
          bio: sanitizedBio || null,
          date_of_birth: dateOfBirth || null,
          profile_photo: null,
          avatar_url: profilePhoto || null,
          favorite_genres: favoriteGenres,
          is_public: false,
          show_age: false,
        });
      }

      setHasUnsavedChanges(false);

      // Update initial state to current state
      initialStateRef.current = {
        profilePhoto: profilePhoto || "",
        dateOfBirth: dateOfBirth || "",
        displayName: validatedDisplayName || "",
        bio: sanitizedBio || "",
        favoriteGenres: [...favoriteGenres],
      };

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("profileUpdated"));

      toast({
        title: t("profile.updatedSuccessfully", "Profile updated successfully"),
        description: t(
          "profile.latestChangesLive",
          "Your latest profile changes are now live.",
        ),
        className:
          "border-l-4 border-l-[#E50914] bg-neutral-900/95 text-neutral-100 rounded-full",
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("profile.errorSavingProfile", "Error saving profile"),
        description: t(
          "profile.savedLocallySyncFailed",
          "Profile saved locally, but syncing to server failed. Changes will sync when connection is restored.",
        ),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = (): void => {
    setProfilePhoto(initialStateRef.current.profilePhoto || null);
    setDateOfBirth(initialStateRef.current.dateOfBirth || "");
    setDisplayName(initialStateRef.current.displayName || "");
    setBio(initialStateRef.current.bio || "");
    setFavoriteGenres([...initialStateRef.current.favoriteGenres]);
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (!file) return;

      if (!user?.id) {
        toast({
          title: t("profile.signInRequired", "Sign in required"),
          description: t(
            "profile.mustBeSignedInToUploadPhoto",
            "You must be signed in to upload a profile photo.",
          ),
          variant: "destructive",
        });
        return;
      }

      const ALLOWED_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
      ];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: t("profile.invalidFileType", "Invalid file type"),
          description: t(
            "profile.allowedImageTypes",
            "Only JPEG, PNG, and WebP images are allowed.",
          ),
          variant: "destructive",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: t("profile.imageTooLarge", "Image too large"),
          description: t(
            "profile.selectImageSmallerThan2Mb",
            "Please select an image smaller than 2MB.",
          ),
          variant: "destructive",
        });
        return;
      }

      try {
        const filePath = `${user.id}/avatar.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
        setProfilePhoto(urlWithCacheBust);
        setHasUnsavedChanges(true);

        toast({
          title: t("profile.photoUploaded", "Photo uploaded"),
          description: t(
            "profile.clickSaveChangesToFinalize",
            "Click 'Save Changes' to finalize your profile.",
          ),
        });
      } catch (error) {
        console.error("Avatar upload error:", error);
        toast({
          title: t("profile.uploadFailed", "Upload failed"),
          description: t(
            "profile.couldNotUploadPhoto",
            "Could not upload photo. Please try again.",
          ),
          variant: "destructive",
        });
      }
    },
    [t, toast, user?.id],
  );

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handlePhotoFile(file);
    event.target.value = "";
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
    setHasUnsavedChanges(true);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateOfBirth(value);

    if (!value) {
      setDobError("");
      return;
    }

    const date = parseLocalDate(value);
    if (!date) {
      setDobError(t("profile.enterValidDate", "Please enter a valid date"));
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age -= 1;
    }

    if (age < 13) {
      setDobError(
        t("profile.mustBeAtLeast13YearsOld", "You must be at least 13 years old"),
      );
    } else if (age > 120) {
      setDobError(t("profile.enterValidDate", "Please enter a valid date"));
    } else {
      setDobError("");
      setAgeInput(String(age));
    }
  };

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleAgeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setAgeInput(raw);

    if (!raw) {
      setDateOfBirth("");
      setDobError("");
      return;
    }

    const age = Number(raw);
    if (!Number.isInteger(age) || age < 0) {
      setDobError(t("profile.enterValidAge", "Please enter a valid age"));
      return;
    }

    if (age < 13) {
      setDobError(
        t("profile.mustBeAtLeast13YearsOld", "You must be at least 13 years old"),
      );
      return;
    }

    if (age > 120) {
      setDobError(t("profile.enterValidAge", "Please enter a valid age"));
      return;
    }

    const today = new Date();
    const dob = new Date(
      today.getFullYear() - age,
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
    );
    setDateOfBirth(formatLocalDate(dob));
    setDobError("");
  };

  const genres: Array<{ id: number; name: string }> = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Sci-Fi" },
    { id: 10770, name: "TV Movie" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
  ];

  const toggleGenre = (genreId: number) => {
    setFavoriteGenres((previousGenres) => {
      const nextGenres = previousGenres.includes(genreId)
        ? previousGenres.filter((id) => id !== genreId)
        : [...previousGenres, genreId];

      if (user?.id) {
        optimisticGenresMutation.mutate(nextGenres, {
          onError: () => {
            setFavoriteGenres(previousGenres);
          },
        });
      } else {
        persistGuestProfile({
          dob: dateOfBirth,
          displayName,
          bio,
          favoriteGenres: nextGenres,
        });
      }

      return nextGenres;
    });
  };

  const profileCompletion = useMemo(() => {
    let completed = 0;
    const total = 5;
    if (profilePhoto) completed++;
    if (displayName) completed++;
    if (dateOfBirth && !dobError) completed++;
    if (bio) completed++;
    if (favoriteGenres.length > 0) completed++;
    return (completed / total) * 100;
  }, [profilePhoto, displayName, dateOfBirth, dobError, bio, favoriteGenres]);

  const parsedDob = useMemo(() => {
    if (!dateOfBirth) return null;
    // Parse as local date string (YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = dateOfBirth.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid DST issues
    return Number.isNaN(date.getTime()) ? null : date;
  }, [dateOfBirth]);

  const userAge = useMemo(() => {
    if (!parsedDob) return null;
    const today = new Date();
    let age = today.getFullYear() - parsedDob.getFullYear();
    const m = today.getMonth() - parsedDob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < parsedDob.getDate())) {
      age -= 1;
    }
    return age;
  }, [parsedDob]);

  useEffect(() => {
    if (userAge !== null && !dobError) {
      setAgeInput(String(userAge));
      return;
    }
    if (!dateOfBirth) {
      setAgeInput("");
    }
  }, [userAge, dateOfBirth, dobError]);

  const pinnedFavoriteBase = useMemo(() => {
    if (pinnedFavoriteKeys.length === 0) return [];
    return pinnedFavoriteKeys
      .map((key) => {
        const [mediaType, idPart] = key.split("-");
        const mediaId = Number(idPart);

        if (
          (mediaType === "movie" || mediaType === "tv") &&
          Number.isFinite(mediaId) &&
          mediaId > 0
        ) {
          return { mediaType, mediaId } as PinnedFavoriteRef;
        }

        return null;
      })
      .filter((item): item is PinnedFavoriteRef => Boolean(item));
  }, [pinnedFavoriteKeys]);

  const uniqueWatchedEntries = useMemo(() => {
    const map = new Map<string, (typeof watched)[number]>();

    watched.forEach((item) => {
      const key = `${item.mediaType}-${item.mediaId}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, item);
        return;
      }

      const existingTime = new Date(
        existing.watchedAt || existing.addedAt || 0,
      ).getTime();
      const currentTime = new Date(
        item.watchedAt || item.addedAt || 0,
      ).getTime();

      if (currentTime >= existingTime) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [watched]);

  const previewLookupItems = useMemo(() => {
    const merged = [...pinnedFavoriteBase];
    const unique = new Map<string, PinnedFavoriteRef>();

    merged.forEach((item) => {
      unique.set(`${item.mediaType}-${item.mediaId}`, item);
    });

    return Array.from(unique.values());
  }, [pinnedFavoriteBase]);

  const { data: previewMap = {}, isLoading: isLoadingPreviews } = useQuery({
    queryKey: ["profile-preview-media", previewLookupItems, i18n.language],
    enabled: previewLookupItems.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const entries = await Promise.all(
        previewLookupItems.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId, i18n.language)
                : await getTVDetails(item.mediaId, i18n.language);

            const preview: ProfileMediaPreview = {
              mediaId: item.mediaId,
              mediaType: item.mediaType,
              title: details.title || details.name || t("common.untitled", "Untitled"),
              posterPath: details.poster_path || null,
              backdropPath: details.backdrop_path || null,
              runtimeMinutes:
                item.mediaType === "movie"
                  ? details.runtime || 0
                  : details.episode_run_time?.[0] || 0,
              genreIds: (details.genres || []).map((genre) => genre.id),
            };

            return [`${item.mediaType}-${item.mediaId}`, preview] as const;
          } catch {
            const fallback: ProfileMediaPreview = {
              mediaId: item.mediaId,
              mediaType: item.mediaType,
              title: `${
                item.mediaType === "movie"
                  ? t("watchHistory.mediaTypeMovie", "Movie")
                  : t("profile.series", "Series")
              } #${item.mediaId}`,
              posterPath: null,
              backdropPath: null,
              runtimeMinutes: 0,
              genreIds: [],
            };

            return [`${item.mediaType}-${item.mediaId}`, fallback] as const;
          }
        }),
      );

      return Object.fromEntries(entries) as Record<string, ProfileMediaPreview>;
    },
  });

  const { data: watchedInsights = [] } = useQuery({
    queryKey: [
      "profile-watched-insights",
      uniqueWatchedEntries.map((item) => `${item.mediaType}-${item.mediaId}`),
      i18n.language,
    ],
    enabled: uniqueWatchedEntries.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const capped = uniqueWatchedEntries.slice(0, 120);
      return Promise.all(
        capped.map(async (item) => {
          try {
            const details =
              item.mediaType === "movie"
                ? await getMovieDetails(item.mediaId, i18n.language)
                : await getTVDetails(item.mediaId, i18n.language);

            const directors = item.mediaType === "movie"
              ? (details.credits?.crew || [])
                  .filter((member: CrewMember) => member.job === "Director")
                  .map((member: CrewMember) => member.name)
              : (details.created_by || []).map((creator: Creator) => creator.name);

            const cast = (details.credits?.cast || [])
              .slice(0, 5)
              .map((member: CastMember) => member.name);

            const releaseDate = details.release_date || details.first_air_date;
            const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null;

            return {
              key: `${item.mediaType}-${item.mediaId}`,
              title: details.title || details.name || t("common.untitled", "Untitled"),
              posterPath: details.poster_path || null,
              runtimeMinutes:
                item.mediaType === "movie"
                  ? details.runtime || 0
                  : details.episode_run_time?.[0] || 0,
              genreIds: (details.genres || []).map((genre) => genre.id),
              directors: directors || [],
              cast: cast || [],
              releaseYear: releaseYear || null,
            };
          } catch {
            return {
              key: `${item.mediaType}-${item.mediaId}`,
              title: t("common.untitled", "Untitled"),
              posterPath: null,
              runtimeMinutes: 0,
              genreIds: [] as number[],
              directors: [] as string[],
              cast: [] as string[],
              releaseYear: null as number | null,
            };
          }
        }),
      );
    },
  });

  const moviesWatched = uniqueWatchedEntries.filter(
    (item) => item.mediaType === "movie",
  ).length;
  const ratingsCount = uniqueWatchedEntries.filter(
    (item) => typeof item.rating === "number",
  ).length;

  const totalWatchHours = useMemo(() => {
    const runtimeMinutes = watchedInsights.reduce(
      (total, item) => total + item.runtimeMinutes,
      0,
    );

    return Math.round(runtimeMinutes / 60);
  }, [watchedInsights]);

  const averageMovieHours = moviesWatched
    ? (totalWatchHours / moviesWatched).toFixed(1)
    : "0.0";

  const genreWatchCounts = useMemo(() => {
    const map = new Map<number, number>();
    watchedInsights.forEach((item) => {
      item.genreIds.forEach((genreId) => {
        map.set(genreId, (map.get(genreId) || 0) + 1);
      });
    });
    return map;
  }, [watchedInsights]);

  const favoriteMovies = useMemo(
    () =>
      pinnedFavoriteBase
        .filter((item) => item.mediaType === "movie")
        .map((item) => ({
          item,
          preview: previewMap[`${item.mediaType}-${item.mediaId}`],
        }))
        .filter((entry) => Boolean(entry.preview)),
    [pinnedFavoriteBase, previewMap],
  );

  const favoriteSeries = useMemo(
    () =>
      pinnedFavoriteBase
        .filter((item) => item.mediaType === "tv")
        .map((item) => ({
          item,
          preview: previewMap[`${item.mediaType}-${item.mediaId}`],
        }))
        .filter((entry) => Boolean(entry.preview)),
    [pinnedFavoriteBase, previewMap],
  );

  const profileCoverBackdrop = useMemo(() => {
    const firstMovieFav = favoriteMovies[0]?.preview?.backdropPath;
    if (firstMovieFav) return firstMovieFav;

    const firstSeriesFav = favoriteSeries[0]?.preview?.backdropPath;
    if (firstSeriesFav) return firstSeriesFav;

    return null;
  }, [favoriteMovies, favoriteSeries]);

  const levelProgress = useMemo(() => {
    if (moviesWatched <= 50) return (moviesWatched / 50) * 100;
    if (moviesWatched <= 150) return ((moviesWatched - 50) / 100) * 100;
    if (moviesWatched <= 300) return ((moviesWatched - 150) / 150) * 100;
    return 100;
  }, [moviesWatched]);

  const nextLevelRequirement = useMemo(() => {
    if (moviesWatched <= 50) return { name: text("profile.levelMovieBuff", "Movie Buff"), count: 50 };
    if (moviesWatched <= 150) return { name: text("profile.levelCinephile", "Cinephile"), count: 150 };
    if (moviesWatched <= 300) return { name: text("profile.levelFilmHistorian", "Film Historian"), count: 300 };
    return null;
  }, [moviesWatched, text]);

  const totalWatchDaysHoursMinutes = useMemo(() => {
    const runtimeMinutes = watchedInsights.reduce(
      (total, item) => total + item.runtimeMinutes,
      0,
    );

    const days = Math.floor(runtimeMinutes / (24 * 60));
    const hours = Math.floor((runtimeMinutes % (24 * 60)) / 60);
    const minutes = runtimeMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(" ") : "0m";
  }, [watchedInsights]);

  const cinephilePersona = useMemo(() => {
    if (watchedInsights.length === 0) {
      return {
        title: text("profile.personaCurator", "Eclectic Curator"),
        description: text(
          "profile.personaCuratorDesc",
          "You are beginning your cinematic trek. Start logging and rating films to discover your true taste archetype!"
        ),
        icon: <Sparkles className="h-7 w-7 text-muted-foreground" />,
        badge: "Curator",
      };
    }

    const sortedGenres = Array.from(genreWatchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const primaryGenre = sortedGenres[0];
    const secondaryGenre = sortedGenres[1];

    if (primaryGenre === 28 || primaryGenre === 12 || primaryGenre === 53) {
      if (secondaryGenre === 878 || secondaryGenre === 14) {
        return {
          title: "Cosmic Adventurer",
          description: "You thrive on massive scales, interstellar voyages, and fantastical journeys that push the boundaries of space and time.",
          icon: <Sparkles className="h-7 w-7 text-muted-foreground" />,
          badge: "Sci-Fi & Action",
        };
      }
      return {
        title: "Adrenaline Junkie",
        description: "You seek high-octane sequences, edge-of-your-seat suspense, and high-stakes narratives that get your heart racing.",
        icon: <TrendingUp className="h-7 w-7 text-muted-foreground" />,
        badge: "Action & Thriller",
      };
    }

    if (primaryGenre === 878 || primaryGenre === 14) {
      return {
        title: "Dream Weaver",
        description: "You explore alternate realities, futuristic tech, and magical realms, valuing infinite imagination and cerebral concepts.",
        icon: <Sparkles className="h-7 w-7 text-muted-foreground" />,
        badge: "Sci-Fi & Fantasy",
      };
    }

    if (primaryGenre === 18) {
      if (secondaryGenre === 10749) {
        return {
          title: "Romantic Realist",
          description: "You appreciate the tender nuances of human intimacy, heartfelt connections, and the emotional rollercoasters of love.",
          icon: <Star className="h-7 w-7 text-muted-foreground" />,
          badge: "Romance & Drama",
        };
      }
      return {
        title: "Drama Connoisseur",
        description: "You value deep character studies, complex moral dilemmas, and powerful performances that reflect the truths of life.",
        icon: <Award className="h-7 w-7 text-muted-foreground" />,
        badge: "Drama Specialist",
      };
    }

    if (primaryGenre === 35) {
      return {
        title: "Joyous Spectator",
        description: "You believe cinema is a source of joy, appreciating clever banter, visual comedy, and stories that leave you with a smile.",
        icon: <Sparkles className="h-7 w-7 text-muted-foreground" />,
        badge: "Comedy Enthusiast",
      };
    }

    if (primaryGenre === 80 || primaryGenre === 9648) {
      return {
        title: "Noir Sleuth",
        description: "You love unraveling dark criminal conspiracies, tracking down clues with detectives, and solving intricate mysteries.",
        icon: <Eye className="h-8 w-8 text-zinc-400" />,
        badge: "Crime & Mystery",
      };
    }

    if (primaryGenre === 27) {
      return {
        title: "Terror Scholar",
        description: "You appreciate the craft of fear, studying psychological dread, cinematic monsters, and the thrill of the macabre.",
        icon: <EyeOff className="h-8 w-8 text-orange-500" />,
        badge: "Horror Devotee",
      };
    }

    return {
      title: "Eclectic Cinephile",
      description: "Your taste knows no bounds. You display a balanced, versatile appreciation for diverse genres and cinematic storytelling styles.",
      icon: <Trophy className="h-7 w-7 text-muted-foreground" />,
      badge: "Multifaceted",
    };
  }, [genreWatchCounts, watchedInsights.length, text]);

  const decadeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    watchedInsights.forEach((item) => {
      if (typeof item.releaseYear === "number") {
        const decadeStart = Math.floor(item.releaseYear / 10) * 10;
        const key = `${decadeStart}s`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort newest to oldest
      .map(([decade, count]) => ({
        decade,
        count,
      }));
  }, [watchedInsights]);

  const topDirectors = useMemo(() => {
    const counts = new Map<string, number>();
    watchedInsights.forEach((item) => {
      (item.directors || []).forEach((director: string) => {
        counts.set(director, (counts.get(director) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [watchedInsights]);

  const topCast = useMemo(() => {
    const counts = new Map<string, number>();
    watchedInsights.forEach((item) => {
      (item.cast || []).forEach((actor: string) => {
        counts.set(actor, (counts.get(actor) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [watchedInsights]);

  const syncFavoriteMoviesCarousel = useCallback(() => {
    setFavoriteMoviesCarouselState(
      getCarouselState(favoriteMoviesCarouselRef.current),
    );
  }, []);

  const syncFavoriteSeriesCarousel = useCallback(() => {
    setFavoriteSeriesCarouselState(
      getCarouselState(favoriteSeriesCarouselRef.current),
    );
  }, []);

  const scrollFavoriteCarousel = useCallback(
    (
      ref: { current: HTMLDivElement | null },
      direction: "left" | "right",
    ) => {
      const container = ref.current;
      if (!container) return;
      const scrollDistance = 400;
      container.scrollTo({
        left:
          container.scrollLeft +
          (direction === "left" ? -scrollDistance : scrollDistance),
        behavior: "smooth",
      });
    },
    [],
  );

  const pinnedMovieCount = useMemo(
    () => pinnedFavoriteKeys.filter((key) => key.startsWith("movie-")).length,
    [pinnedFavoriteKeys],
  );

  const pinnedSeriesCount = useMemo(
    () => pinnedFavoriteKeys.filter((key) => key.startsWith("tv-")).length,
    [pinnedFavoriteKeys],
  );

  useEffect(() => {
    syncFavoriteMoviesCarousel();
    const container = favoriteMoviesCarouselRef.current;
    if (!container) return;

    const handleScroll = () => syncFavoriteMoviesCarousel();
    const handleResize = () => syncFavoriteMoviesCarousel();
    const resizeObserver = new ResizeObserver(() =>
      syncFavoriteMoviesCarousel(),
    );

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [favoriteMovies.length, syncFavoriteMoviesCarousel]);

  useEffect(() => {
    syncFavoriteSeriesCarousel();
    const container = favoriteSeriesCarouselRef.current;
    if (!container) return;

    const handleScroll = () => syncFavoriteSeriesCarousel();
    const handleResize = () => syncFavoriteSeriesCarousel();
    const resizeObserver = new ResizeObserver(() =>
      syncFavoriteSeriesCarousel(),
    );

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [favoriteSeries.length, syncFavoriteSeriesCarousel]);

  const favoriteSearchTerm = favoriteSearchQuery.trim();

  const { data: favoriteSearchResults = [], isFetching: isSearchingFavorites } =
    useQuery({
      queryKey: [
        "profile-favorite-search",
        favoriteSearchTerm,
        favoriteSearchType,
        i18n.language,
      ],
      enabled: isFavoritesPickerOpen && favoriteSearchTerm.length >= 2,
      staleTime: 60 * 1000,
      queryFn: async () => {
        const mapResults = (
          items: Array<{
            id: number;
            title?: string;
            name?: string;
            poster_path?: string | null;
            release_date?: string;
            first_air_date?: string;
          }>,
          mediaType: "movie" | "tv",
        ) =>
          items
            .filter(
              (item) => Boolean(item.id) && Boolean(item.title || item.name),
            )
            .map((item) => ({
              id: item.id,
              mediaType,
              title: item.title || item.name || t("common.untitled", "Untitled"),
              posterPath: item.poster_path || null,
              year: (item.release_date || item.first_air_date || "").slice(
                0,
                4,
              ),
            }));

        if (favoriteSearchType === "movie") {
          const movieResults = await searchMovies(
            favoriteSearchTerm,
            1,
            i18n.language,
          );
          return mapResults(movieResults.results || [], "movie").slice(0, 12);
        }

        if (favoriteSearchType === "tv") {
          const tvResults = await searchTV(
            favoriteSearchTerm,
            1,
            i18n.language,
          );
          return mapResults(tvResults.results || [], "tv").slice(0, 12);
        }

        const [movieResults, tvResults] = await Promise.all([
          searchMovies(favoriteSearchTerm, 1, i18n.language),
          searchTV(favoriteSearchTerm, 1, i18n.language),
        ]);

        return [
          ...mapResults(movieResults.results || [], "movie"),
          ...mapResults(tvResults.results || [], "tv"),
        ].slice(0, 12);
      },
    });

  const userName =
    displayName ||
    user?.email?.split("@")[0] ||
    t("common.appName", "CineTrekker");
  const shareProfileLink = absoluteSiteUrl("/profile");
  const shouldShowProfileSection = useCallback(
    (section: "overview" | "favorites" | "taste" | "edit") => {
      if (section === "edit") return activeProfileTab === "edit";
      if (activeProfileTab === "edit") return false;
      return activeProfileTab === "overview" || activeProfileTab === section;
    },
    [activeProfileTab],
  );

  const watchedThisMonth = useMemo(() => {
    const now = new Date();
    return watched.filter((item) => {
      const when = new Date(item.watchedAt || item.addedAt || 0);
      return (
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth()
      );
    }).length;
  }, [watched]);

  const latestRatedDateLabel = useMemo(() => {
    const rated = watched
      .filter((item) => typeof item.rating === "number")
      .sort(
        (a, b) =>
          new Date(b.watchedAt || b.addedAt || 0).getTime() -
          new Date(a.watchedAt || a.addedAt || 0).getTime(),
      );

    if (rated.length === 0) return t("profile.noRatingsYet", "No ratings yet");
    const last = new Date(rated[0].watchedAt || rated[0].addedAt || 0);
    const diff = Math.max(
      0,
      Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)),
    );

    if (diff === 0) return t("profile.lastRatedToday", "Last rated today");
    if (diff === 1)
      return t("profile.lastRatedOneDayAgo", "Last rated 1 day ago");
    return t("profile.lastRatedDaysAgo", "Last rated {{days}} days ago", {
      days: diff,
    });
  }, [t, watched]);

  const ratingDistribution = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, index) => ({
      rating: index + 1,
      count: 0,
    }));

    watched.forEach((item) => {
      if (typeof item.rating !== "number") return;
      const rounded = Math.max(1, Math.min(10, Math.round(item.rating)));
      bins[rounded - 1].count += 1;
    });

    return bins.reverse();
  }, [watched]);

  const mostUsedRating = useMemo(() => {
    if (ratingDistribution.every((entry) => entry.count === 0)) return null;
    return [...ratingDistribution].sort((a, b) => b.count - a.count)[0];
  }, [ratingDistribution]);

  const maxRatingCount = useMemo(
    () => Math.max(...ratingDistribution.map((entry) => entry.count), 0),
    [ratingDistribution],
  );

  const movieWatchDates = useMemo(
    () =>
      uniqueWatchedEntries
        .filter((item) => item.mediaType === "movie")
        .map((item) => new Date(item.watchedAt || item.addedAt || 0))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime()),
    [uniqueWatchedEntries],
  );

  const ratingDates = useMemo(
    () =>
      uniqueWatchedEntries
        .filter((item) => typeof item.rating === "number")
        .map((item) => new Date(item.watchedAt || item.addedAt || 0))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime()),
    [uniqueWatchedEntries],
  );

  const recentlyWatched = useMemo(
    () =>
      [...uniqueWatchedEntries]
        .sort(
          (a, b) =>
            new Date(b.watchedAt || b.addedAt || 0).getTime() -
            new Date(a.watchedAt || a.addedAt || 0).getTime(),
        )
        .slice(0, 10),
    [uniqueWatchedEntries],
  );

  const formatUnlockMonthYear = useCallback((date: Date | undefined) => {
    if (!date) return null;
    return date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  }, []);

  const getUnlockLabel = useCallback(
    (dates: Date[], threshold: number) => {
      if (dates.length < threshold) return null;
      return formatUnlockMonthYear(dates[threshold - 1]);
    },
    [formatUnlockMonthYear],
  );

  const cinephileLevel = useMemo(() => {
    if (moviesWatched <= 50)
      return text("profile.levelCasualViewer", "Casual Viewer");
    if (moviesWatched <= 150)
      return text("profile.levelMovieBuff", "Movie Buff");
    if (moviesWatched <= 300)
      return text("profile.levelCinephile", "Cinephile");
    return text("profile.levelFilmHistorian", "Film Historian");
  }, [moviesWatched, text]);

  const achievements = useMemo(
    () => [
      {
        id: "first-log",
        icon: <Trophy className="h-5 w-5 text-muted-foreground" />,
        colorClass: "",
        shortLabel: text("profile.achievementFirstLogShort", "First Log"),
        fullLabel: text("achievements.watchFirst", "First Movie Logged"),
        condition: text("profile.achievementFirstLogCondition", "Log at least 1 movie"),
        progressLabel: t("profile.achievementProgressMovies", "{{count}}/1 movies", {
          count: Math.min(moviesWatched, 1),
        }),
        unlocked: moviesWatched >= 1,
        unlockedLabel: getUnlockLabel(movieWatchDates, 1),
      },
      {
        id: "50-movies",
        icon: <Award className="h-5 w-5 text-muted-foreground" />,
        colorClass: "",
        shortLabel: text("profile.achievement50MoviesShort", "50 Movies"),
        fullLabel: text("achievements.watch50", "50 Movies Watched"),
        condition: text("profile.achievement50MoviesCondition", "Watch 50 movies"),
        progressLabel: t("profile.achievementProgress50Movies", "{{count}}/50 movies", {
          count: Math.min(moviesWatched, 50),
        }),
        unlocked: moviesWatched >= 50,
        unlockedLabel: getUnlockLabel(movieWatchDates, 50),
      },
      {
        id: "100-movies",
        icon: <Star className="h-5 w-5 text-muted-foreground" />,
        colorClass: "",
        shortLabel: text("profile.achievement100MoviesShort", "100 Movies"),
        fullLabel: text("achievements.watch100", "100 Movies Watched"),
        condition: text("profile.achievement100MoviesCondition", "Watch 100 movies"),
        progressLabel: t("profile.achievementProgress100Movies", "{{count}}/100 movies", {
          count: Math.min(moviesWatched, 100),
        }),
        unlocked: moviesWatched >= 100,
        unlockedLabel: getUnlockLabel(movieWatchDates, 100),
      },
      {
        id: "200-ratings",
        icon: <Sparkles className="h-5 w-5 text-muted-foreground" />,
        colorClass: "",
        shortLabel: text("profile.achievement200RatingsShort", "200 Ratings"),
        fullLabel: text("achievements.rate200", "200 Ratings"),
        condition: text("profile.achievement200RatingsCondition", "Rate 200 titles"),
        progressLabel: t("profile.achievementProgress200Ratings", "{{count}}/200 ratings", {
          count: Math.min(ratingsCount, 200),
        }),
        unlocked: ratingsCount >= 200,
        unlockedLabel: getUnlockLabel(ratingDates, 200),
      },
    ],
    [
      getUnlockLabel,
      movieWatchDates,
      moviesWatched,
      ratingDates,
      ratingsCount,
      t,
      text,
    ],
  );

  const countMoviesWatched = useCountUp(moviesWatched, 1100, !!reduceMotion);
  const countRatings = useCountUp(ratingsCount, 1200, !!reduceMotion);
  const countWatchHours = useCountUp(totalWatchHours, 1300, !!reduceMotion);

  const handleCopyProfileLink = async () => {
    const shareTitle = `${userName}'s CineTrekker profile`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: t("profile.shareProfileMessage", "Check out this CineTrekker profile."),
          url: shareProfileLink,
        });
        return;
      }

      await navigator.clipboard.writeText(shareProfileLink);
      setShareCopied(true);
      toast({
        title: t("profile.linkCopiedToClipboard", "Link copied to clipboard!"),
        description: t("profile.profileLinkReady", "Your profile link is ready to share."),

      });
    } catch {
      toast({
        title: t("profile.copyFailed", "Copy failed"),
        description: t("profile.copyFailedDesc", "Could not copy profile link. Please try again."),
        variant: "destructive",
      });
    }
  };

  const openFavoritesPicker = useCallback(
    (type: "movie" | "tv") => {
      setFavoriteSearchType(type);
      setFavoriteSearchQuery("");
      setIsFavoritesPickerOpen(true);
    },
    [],
  );

  const pinFavorite = useCallback(
    (mediaId: number, mediaType: "movie" | "tv", title: string) => {
      const key = `${mediaType}-${mediaId}`;

      setPinnedFavoriteKeys((current) => {
        if (current.includes(key)) return current;
        const next = [...current, key];
        void persistPinnedFavorites(next);
        toast({
          title: t("profile.pinnedToFavorites", "Pinned to favorites"),
          description: t("profile.pinnedToFavoritesDesc", "{{title}} was added to your pinned favorites.", {
            title,
          }),
        });
        setIsFavoritesPickerOpen(false);
        setFavoriteSearchQuery("");
        return next;
      });
    },
    [persistPinnedFavorites, setPinnedFavoriteKeys, t, toast],
  );

  const unpinFavorite = useCallback(
    (mediaId: number, mediaType: "movie" | "tv", title: string) => {
      const key = `${mediaType}-${mediaId}`;

      setPinnedFavoriteKeys((current) => {
        if (!current.includes(key)) return current;
        const next = current.filter((entry) => entry !== key);
        void persistPinnedFavorites(next);
        toast({
          title: t("profile.removedFromFavorites", "Removed from favorites"),
          description: t("profile.removedFromFavoritesDesc", "{{title}} was removed from your pinned favorites.", {
            title,
          }),
        });
        return next;
      });
    },
    [persistPinnedFavorites, setPinnedFavoriteKeys, t, toast],
  );

  return (
    <>
      <SEO
        title={t("profile.seoTitle", "My Profile - CineTrekker")}
        description={t("profile.seoDescription", "View your watching statistics and preferences")}
        canonical="https://cinetrekker.vercel.app/profile"
      />
      <motion.div
        className="profile-page page-container ct-page-shell relative mx-auto max-w-[82rem] overflow-x-hidden pb-24 pt-20 md:pb-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Widescreen Cover Backdrop */}
        <div className="absolute inset-x-0 top-0 z-0 h-[200px] md:h-[260px] w-full overflow-hidden border-b border-border">
          {profileCoverBackdrop ? (
            <img
              src={getBackdropUrl(profileCoverBackdrop, "original") ?? ""}
              alt="Profile cover backdrop"
              className="h-full w-full object-cover opacity-15"
            />
          ) : (
            <div className="h-full w-full bg-muted/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        {isLoadingProfile && (
          <div className="flex justify-center items-center py-12 relative z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoadingProfile && (
          <TooltipProvider>
            <div className="relative z-10 mt-10 md:mt-20">
              <motion.section variants={itemVariants} className="mb-8">
                <Card className="profile-identity-card relative overflow-hidden">
                  <CardContent className="p-5 sm:p-7">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                      <div
                        className="flex w-full flex-col items-center sm:w-[11rem] sm:min-w-[11rem]"
                      >
                        <div
                          className="relative group"
                          onDragOver={(event) => {
                            event.preventDefault();
                            setIsAvatarDragActive(true);
                          }}
                          onDragLeave={(event) => {
                            if (
                              event.currentTarget.contains(
                                event.relatedTarget as Node | null,
                              )
                            ) {
                              return;
                            }
                            setIsAvatarDragActive(false);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setIsAvatarDragActive(false);
                            const file = event.dataTransfer.files?.[0];
                            if (!file) return;
                            void handlePhotoFile(file);
                          }}
                        >
                          <div
                            className={cn(
                              "relative h-28 w-28 overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-lg sm:h-32 sm:w-32",
                              isAvatarDragActive && "border-primary scale-[1.02]",
                            )}
                          >
                            {profilePhoto ? (
                              <Image
                                src={profilePhoto}
                                alt={text("profile.title", "Profile")}
                                width={160}
                                height={160}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <User className="h-16 w-16 text-neutral-600" />
                              </div>
                            )}
                            <div
                              className={cn(
                                "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 px-4 text-center text-white transition-opacity",
                                isAvatarDragActive
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100",
                              )}
                            >
                              <Camera className="h-6 w-6" />
                              <p className="text-xs font-semibold">
                                {text("profile.dropPhotoToUpload", "Drop a photo to upload")}
                              </p>
                              <p className="text-[11px] text-white/70">
                                {text("profile.photoFormats", "JPG, PNG, or WebP up to 2MB")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="profile-photo-input"
                          ref={profilePhotoInputRef}
                          onChange={handlePhotoChange}
                        />
                        <div className="mt-4 flex w-full max-w-[11rem] flex-col gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                className={cn(
                                  "h-9 w-full justify-center text-xs",
                                )}
                                onClick={() => profilePhotoInputRef.current?.click()}
                                type="button"
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                {profilePhoto
                                  ? text("profile.changePhoto", "Change photo")
                                  : text("profile.uploadPhoto", "Upload photo")}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {text("profile.avatarUploadHint", "Click or drop an image to update your avatar")}
                            </TooltipContent>
                          </Tooltip>
                          {profilePhoto ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 w-full justify-center text-xs"
                              onClick={handlePhotoRemove}
                            >
                              <X className="mr-2 h-4 w-4" />
                              {text("common.delete", "Remove")}
                            </Button>
                          ) : null}
                        </div>
                        <p className="mt-2 max-w-[11rem] text-center text-[11px] leading-4 text-muted-foreground">
                          {text("profile.photoUploadHint", "Drag and drop a profile picture or choose a file.")}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                            {userName}
                          </h1>
                          <Badge variant="secondary" className="rounded-md px-2.5 py-1">
                            <Trophy className="mr-1.5 h-3.5 w-3.5" />
                            {cinephileLevel}
                          </Badge>
                        </div>

                        {/* Cinephile Level Progression Bar */}
                        <div className="mt-3 max-w-xl">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground">{cinephileLevel}</span>
                            {nextLevelRequirement ? (
                              <span>
                                {moviesWatched} / {nextLevelRequirement.count} {text("profile.toNextLevel", "to")} {nextLevelRequirement.name}
                              </span>
                            ) : (
                              <span className="text-primary font-bold">{text("profile.maxLevel", "Max Rank")}</span>
                            )}
                          </div>
                          <Progress
                            value={levelProgress}
                            className="h-1.5"
                          />
                        </div>

                        <div className="profile-stat-grid mt-5 grid gap-2 sm:grid-cols-3">
                          {/* Movies Watched */}
                          <div className="profile-stat px-4 py-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Film className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {text("profile.moviesWatched", "Movies Watched")}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{countMoviesWatched}</p>
                          </div>
                          {/* Ratings */}
                          <div className="profile-stat px-4 py-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Star className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {text("profile.ratings", "Ratings")}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{countRatings}</p>
                          </div>
                          {/* Watch Time */}
                          <div className="profile-stat px-4 py-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {text("profile.watchTime", "Watch Time")}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-foreground tabular-nums">
                              {totalWatchDaysHoursMinutes}
                            </p>
                          </div>
                        </div>

                      <div className="mt-3 flex items-center gap-3">
                          <Link
                            to="/achievements"
                            className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                          >
                            {text("profile.viewAllAchievements", "View All Achievements")} {"->"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.section variants={itemVariants} className="mb-8">
                <Tabs
                  value={activeProfileTab}
                  onValueChange={(value) => {
                    const nextTab = value as "overview" | "favorites" | "taste" | "edit";
                    setActiveProfileTab(nextTab);
                    setIsEditMode(nextTab === "edit");
                  }}
                >
                  <TabsList className="profile-tabs h-auto w-full justify-start gap-1 overflow-x-auto p-1">
                    <TabsTrigger value="overview" className="shrink-0 rounded-md px-4 py-2 gap-2 text-sm font-medium transition-colors">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {text("profile.overview", "Overview")}
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="shrink-0 rounded-md px-4 py-2 gap-2 text-sm font-medium transition-colors">
                      <Star className="h-3.5 w-3.5" />
                      {text("profile.favorites", "Favorites")}
                    </TabsTrigger>
                    <TabsTrigger value="taste" className="shrink-0 rounded-md px-4 py-2 gap-2 text-sm font-medium transition-colors">
                      <Sparkles className="h-3.5 w-3.5" />
                      {text("profile.tasteAndStats", "Taste & Stats")}
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="shrink-0 rounded-md px-4 py-2 gap-2 text-sm font-medium transition-colors">
                      <User className="h-3.5 w-3.5" />
                      {text("profile.editProfile", "Edit Profile")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </motion.section>

              <div className="space-y-8">
                <div className="space-y-8">
                  {activeProfileTab === "edit" ? (
                  <motion.section
                    variants={itemVariants}
                    id="profile-details"
                    className="mb-2"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <User className="h-5 w-5 text-muted-foreground" />
                        {text("profile.profileDetails", "Profile Details")}
                      </h2>
                    </div>

                    <Card className="ct-panel">
                      <CardContent className="space-y-6 pt-6">
                        {!isEditMode ? (
                          <div className="space-y-5">
                            {/* Name + Age row */}
                            <div className="flex flex-wrap gap-4">
                              <div className="min-w-[120px] flex-1 rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {text("profile.displayName", "Display Name")}
                                </p>
                                <p className="text-base font-semibold text-foreground">
                                  {displayName || <span className="italic text-muted-foreground">{text("profile.notSet", "Not set")}</span>}
                                </p>
                              </div>
                              {userAge !== null && (
                                <div className="min-w-[80px] rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {text("profile.age", "Age")}
                                  </p>
                                  <p className="text-base font-semibold text-foreground">{userAge}</p>
                                </div>
                              )}
                            </div>
                            {/* Bio */}
                            {bio ? (
                              <blockquote className="relative rounded-xl border border-border bg-muted/30 px-5 py-4">
                                <p className="text-sm leading-relaxed text-foreground/90">{bio}</p>
                              </blockquote>
                            ) : (
                              <div className="rounded-lg border border-dashed border-border px-5 py-4 text-center">
                                <p className="text-sm text-muted-foreground italic">
                                  {text("profile.noBioYet", "No bio yet. Tell people about your cinematic journey.")}
                                </p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="mt-3 text-xs"
                                  onClick={() => setIsEditMode(true)}
                                >
                                  {text("profile.addBio", "Add a bio")}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Profile Completion Indicator */}
                            {profileCompletion < 100 && (
                              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="font-semibold text-foreground">
                                    {text("profile.profileCompletion", "Profile Completion")}
                                  </span>
                                  <span className="text-muted-foreground font-medium">{Math.round(profileCompletion)}%</span>
                                </div>
                                <Progress
                                  value={profileCompletion}
                                  className="h-1.5"
                                />
                                <p className="mt-1.5 text-[10px] text-muted-foreground">
                                  {text("profile.addPhotoNameBio", "Add a photo, name, age, bio, and select genre preferences to complete your profile.")}
                                </p>
                              </div>
                            )}

                            <div className="grid gap-5 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="displayName"
                                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
                                >
                                  <User className="h-3.5 w-3.5" />
                                  {text("profile.displayName", "Display Name")}
                                </Label>
                                <Input
                                  id="displayName"
                                  type="text"
                                  value={displayName}
                                  onChange={(e) =>
                                    setDisplayName(e.target.value)
                                  }
                                  placeholder={text(
                                    "profile.displayNamePlaceholder",
                                    "How should we call you?",
                                  )}
                                  maxLength={50}
                                  className="h-11 border-border bg-background px-4 text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground">{displayName.length}/50</p>
                              </div>
                              <div className="space-y-1.5">
                                <Label
                                  htmlFor="ageInput"
                                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
                                >
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {text("profile.currentAge", "Current age")}
                                </Label>
                                <Input
                                  id="ageInput"
                                  type="number"
                                  min={13}
                                  max={120}
                                  step={1}
                                  inputMode="numeric"
                                  value={ageInput}
                                  onChange={handleAgeInputChange}
                                  placeholder={t("profile.agePlaceholder", "22")}
                                  className={cn(
                                    "h-11 border-border bg-background px-4 text-sm",
                                    dobError && "border-destructive",
                                  )}
                                />
                                {dobError ? (
                                  <p className="text-xs text-destructive">
                                    {dobError}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="bio" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {text("profile.bio", "Bio")}
                              </Label>
                              <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder={text(
                                  "profile.bioPlaceholder",
                                  "Tell us about your cinematic journey...",
                                )}
                                className="min-h-[110px] w-full resize-y rounded-lg border border-border bg-background p-4 text-sm"
                                maxLength={500}
                              />
                              <p className="text-[10px] text-muted-foreground">
                                <span className={cn(bio.length > 450 && "text-destructive font-semibold")}>{bio.length}</span>/500{" "}
                                {text("profile.characters", "characters")}
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <Button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex-1 rounded-xl sm:flex-none"
                              >
                                {isSaving ? (
                                  <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    {text("profile.saving", "Saving…")}
                                  </span>
                                ) : (
                                  t("settings.saveChanges", "Save Changes")
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelChanges}
                                disabled={isSaving}
                                className="rounded-xl"
                              >
                                {t("common.cancel", "Cancel")}
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.section>
                  ) : null}

                  {shouldShowProfileSection("overview") ? (
                  <motion.section variants={itemVariants} id="stats-overview" className="space-y-6">
                    <div className="mb-2 space-y-1">
                      <h2 className="flex items-center gap-2 text-xl font-semibold">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {text("profile.viewingProfile", "Viewing profile")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {text("profile.overviewSubtitle", "A quick read on your taste and progress.")}
                      </p>
                    </div>

                    <div className="hidden grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Movies Watched Card */}
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab("taste")}
                        className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Film className="mb-3 h-5 w-5 text-muted-foreground" />
                        <p className="text-4xl font-bold leading-none tracking-tight text-foreground">
                          {countMoviesWatched}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {text("profile.moviesWatched", "Movies Watched")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {t("profile.watchedThisMonth", "+{{count}} this month", {
                            count: watchedThisMonth,
                          })}
                        </p>
                      </button>

                      {/* Ratings Card */}
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab("taste")}
                        className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Star className="mb-3 h-5 w-5 text-muted-foreground" />
                        <p className="text-4xl font-bold leading-none tracking-tight text-foreground">
                          {countRatings}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {text("profile.ratings", "Ratings")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {latestRatedDateLabel}
                        </p>
                      </button>

                      {/* Watch Time Card */}
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab("taste")}
                        className="profile-insight group relative overflow-hidden p-5 text-left focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <Clock className="mb-3 h-5 w-5 text-muted-foreground" />
                        <p className="text-3xl font-bold leading-none tracking-tight text-foreground">
                          {totalWatchDaysHoursMinutes}
                        </p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {text("profile.watchTime", "Watch Time")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {t("profile.averageHoursPerMovie", "Avg {{hours}}h per movie", {
                            hours: averageMovieHours,
                          })}
                        </p>
                      </button>
                    </div>

                    {/* Persona & Level Details row */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Persona Card */}
                      {cinephilePersona && (
                        <div className="h-full">
                          <Card className="border border-border bg-card h-full transition-colors duration-150 hover:bg-accent/20">
                            <CardContent className="pt-6 space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-muted p-3 text-foreground">
                                  {cinephilePersona.icon}
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {text("profile.tasteArchetype", "Taste Archetype")}
                                  </p>
                                  <h4 className="text-xl font-bold tracking-tight text-foreground">
                                    {cinephilePersona.title}
                                  </h4>
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {cinephilePersona.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-muted border border-border text-foreground">
                                  {cinephilePersona.badge}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Milestone Stats Card */}
                      <Card className="border border-border bg-card h-full transition-colors duration-150 hover:bg-accent/20">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-muted p-3 text-foreground">
                              <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {text("profile.cinephileMilestones", "Trek Progress")}
                              </p>
                              <h4 className="text-xl font-bold tracking-tight text-foreground">
                                {text("profile.journeyTitle", "Cinephile Ranks")}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="space-y-3 pt-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Casual Viewer (1-50)</span>
                              <span className="font-semibold text-foreground">{moviesWatched >= 50 ? "✓ Completed" : `${moviesWatched}/50`}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Movie Buff (51-150)</span>
                              <span className="font-semibold text-foreground">{moviesWatched >= 150 ? "✓ Completed" : moviesWatched > 50 ? `${moviesWatched}/150` : "Locked"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Cinephile (151-300)</span>
                              <span className="font-semibold text-foreground">{moviesWatched >= 300 ? "✓ Completed" : moviesWatched > 150 ? `${moviesWatched}/300` : "Locked"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.section>
                  ) : null}

                  {shouldShowProfileSection("overview") && recentlyWatched.length > 0 ? (
                  <motion.section variants={itemVariants} id="recently-watched" className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {text("profile.recentlyWatched", "Recently Watched")}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {text("profile.recentlyWatchedSubtitle", "Your latest additions to the watch log.")}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                        <Link to="/watched">{text("profile.viewAll", "View all")}</Link>
                      </Button>
                    </div>
                    <div className="relative overflow-hidden">
                      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                        {recentlyWatched.map((item) => {
                          const itemKey = `${item.mediaType}-${item.mediaId}`;
                          const insight = watchedInsights.find((wi) => wi.key === itemKey);
                          const daysAgo = Math.floor(
                            (Date.now() - new Date(item.watchedAt || item.addedAt || 0).getTime()) /
                              (24 * 60 * 60 * 1000),
                          );
                          const timeLabel =
                            daysAgo === 0
                              ? text("common.today", "Today")
                              : daysAgo === 1
                              ? text("common.yesterday", "Yesterday")
                              : t("profile.daysAgo", "{{n}}d ago", { n: daysAgo });

                          return (
                            <Link
                              key={itemKey}
                              to={`/${item.mediaType === "movie" ? "movie" : "tv"}/${item.mediaId}`}
                              className="group relative flex-shrink-0 w-[100px]"
                            >
                              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 group-hover:border-border-hover">
                                {insight?.posterPath ? (
                                  <Image
                                    src={getImageUrl(insight.posterPath, "w185")}
                                    alt={insight.title}
                                    width={185}
                                    height={278}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    showSkeleton
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-card">
                                    <Film className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                {typeof item.rating === "number" && (
                                  <div className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                    {item.rating}
                                  </div>
                                )}
                              </div>
                              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-tight text-foreground/95">
                                {insight?.title || `#${item.mediaId}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </motion.section>
                  ) : null}

                  {shouldShowProfileSection("taste") ? (
                  <motion.section variants={itemVariants}>
                    <div className="mb-4 space-y-1">
                      <h2 className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        {t("profile.actorMatches")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {text(
                          "profile.actorMatchesIntro",
                          "Discover performers whose age range and genre footprint line up with the movies you rate most.",
                        )}
                      </p>
                    </div>
                    <Suspense
                      fallback={
                        <div className="grid grid-cols-1 gap-3">
                          {[...Array(4)].map((_, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3"
                            >
                              <div className="flex gap-3">
                                <div className="h-32 w-24 rounded-md skeleton-shimmer" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 w-1/2 rounded skeleton-shimmer" />
                                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                                  <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                    >
                      <ActorMatchesSection
                        dateOfBirth={dateOfBirth}
                        userAge={userAge}
                        language={i18n.language}
                        hasPreferences={favoriteGenres.length > 0}
                        ratingsCount={ratingsCount}
                        favoriteGenres={favoriteGenres}
                      />
                    </Suspense>
                  </motion.section>
                  ) : null}
                </div>

                <div className="space-y-8">
                  {shouldShowProfileSection("favorites") ? (
                  <motion.section variants={itemVariants} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Film className="h-4 w-4 text-muted-foreground" />
                        {text("profile.favoriteMovies", "Favorite Movies")}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.moviesPinned", {
                        count: pinnedMovieCount,
                        defaultValue: "{{count}} movie pinned",
                        defaultValue_plural: "{{count}} movies pinned",
                      })}
                    </p>
                    {favoriteMovies.length === 0 ? (
                      <Card className="border-border bg-card">
                        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {text("profile.startEssentialsShelf", "Start your essentials shelf")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {text(
                                "profile.startEssentialsShelfDesc",
                                "Pin your first favorite films and keep building the shelf as long as you want.",
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openFavoritesPicker("movie")}
                            >
                              {text("profile.addMovie", "Add a movie")}
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link to="/search">{text("profile.browseFilms", "Browse films")}</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}


                    {favoriteMovies.length > 0 ? (
                      <div className="group/scroll relative pb-8">
                        <button
                          onClick={() =>
                            scrollFavoriteCarousel(
                              favoriteMoviesCarouselRef,
                              "left",
                            )
                          }
                          disabled={!favoriteMoviesCarouselState.canScrollLeft}
                          type="button"
                          className="absolute left-2 top-[40%] z-10 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:left-3 md:opacity-0 md:group-hover/scroll:opacity-100"
                          aria-label={text("profile.previousFavoriteMovies", "Previous favorite movies")}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            scrollFavoriteCarousel(
                              favoriteMoviesCarouselRef,
                              "right",
                            )
                          }
                          disabled={!favoriteMoviesCarouselState.canScrollRight}
                          type="button"
                          className="absolute right-2 top-[40%] z-10 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:opacity-0 md:group-hover/scroll:opacity-100"
                          aria-label={text("profile.nextFavoriteMovies", "Next favorite movies")}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        <div
                          ref={favoriteMoviesCarouselRef}
                          className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-2 scroll-smooth overscroll-x-contain"
                        >
                          {favoriteMovies.map(({ item, preview }) => (
                            <div
                              key={`favorite-${item.mediaType}-${item.mediaId}`}
                              className="w-[calc(50vw-1rem)] min-w-[calc(50vw-1rem)] flex-shrink-0 snap-start sm:w-[180px] sm:min-w-[180px] md:w-[200px] md:min-w-[200px] lg:w-[220px] lg:min-w-[220px] xl:w-[240px] xl:min-w-[240px]"
                            >
                              <motion.div
                                layout
                                className="group relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors duration-150"
                              >
                                <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-150 md:opacity-0 md:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground/75 shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() =>
                                      unpinFavorite(
                                        item.mediaId,
                                        item.mediaType,
                                        preview.title,
                                      )
                                    }
                                    aria-label={t("profile.removeFromFavorites", "Remove {{title}} from favorites", { title: preview.title })}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="relative aspect-[2/3] overflow-hidden">
                                  <Image
                                    src={getImageUrl(preview.posterPath, "w342")}
                                    srcSet={`${getImageUrl(preview.posterPath, "w154")} 154w, ${getImageUrl(preview.posterPath, "w342")} 342w, ${getImageUrl(preview.posterPath, "w500")} 500w`}
                                    sizes="(max-width: 640px) 132px, (max-width: 768px) 180px, (max-width: 1024px) 200px, (max-width: 1280px) 220px, 240px"
                                    alt={preview.title}
                                    width={342}
                                    height={513}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    showSkeleton
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <p className="line-clamp-2 text-xs font-semibold tracking-tight text-white">
                                    {preview.title}
                                  </p>
                                </div>
                              </motion.div>
                            </div>
                          ))}

                          <div className="w-[calc(50vw-1rem)] min-w-[calc(50vw-1rem)] flex-shrink-0 snap-start sm:w-[180px] sm:min-w-[180px] md:w-[200px] md:min-w-[200px] lg:w-[220px] lg:min-w-[220px] xl:w-[240px] xl:min-w-[240px]">
                            <button
                              type="button"
                              className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-border-hover hover:bg-accent"
                              onClick={() => openFavoritesPicker("movie")}
                            >
                              <div className="rounded-full border border-border bg-background p-3 shadow-sm group-hover:bg-accent">
                                <Plus className="h-5 w-5" />
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 group-hover:opacity-100">
                                {text("profile.addMovieShort", "Add Movie")}
                              </span>
                            </button>
                          </div>
                        </div>

                        {favoriteMoviesCarouselState.pageCount > 1 ? (
                          <PaginationDots>
                            {Array.from({
                              length: favoriteMoviesCarouselState.pageCount,
                            }).map((_, index) => (
                              <PaginationDotButton
                                key={`favorite-movies-page-${index}`}
                                onClick={() => {
                                  const container =
                                    favoriteMoviesCarouselRef.current;
                                  if (!container) return;
                                  const cards = Array.from(container.children) as HTMLElement[];
                                  const targetChildIndex =
                                    favoriteMoviesCarouselState.pageCount <= 1 || cards.length <= 1
                                      ? 0
                                      : Math.round(
                                          (index * (cards.length - 1)) /
                                            (favoriteMoviesCarouselState.pageCount - 1),
                                        );
                                  cards[targetChildIndex]?.scrollIntoView({
                                    behavior: "smooth",
                                    inline: "start",
                                    block: "nearest",
                                  });
                                }}
                                active={index === favoriteMoviesCarouselState.activePage}
                                aria-label={t("profile.goToFavoriteMoviesPage", "Go to favorite movies page {{index}}", { index: index + 1 })}
                                aria-pressed={
                                  index ===
                                  favoriteMoviesCarouselState.activePage
                                }
                              />
                            ))}
                          </PaginationDots>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.section>
                  ) : null}

                  {shouldShowProfileSection("favorites") ? (
                  <motion.section
                    variants={itemVariants}
                    id="favorite-series"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        {text("profile.favoriteSeries", "Favorite Series")}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("profile.seriesPinned", {
                        count: pinnedSeriesCount,
                        defaultValue: "{{count}} series pinned",
                      })}
                    </p>
                    {favoriteSeries.length === 0 ? (
                      <Card className="border-border bg-card">
                        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {text("profile.spotlightShows", "Spotlight the shows you always recommend")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {text(
                                "profile.spotlightShowsDesc",
                                "Pin the shows you always recommend and keep the row growing over time.",
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openFavoritesPicker("tv")}
                            >
                              {text("profile.addSeries", "Add a series")}
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link to="/search">{text("profile.browseShows", "Browse shows")}</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}

                    {favoriteSeries.length > 0 ? (
                      <div className="group/scroll relative pb-8">
                        <button
                          onClick={() =>
                            scrollFavoriteCarousel(
                              favoriteSeriesCarouselRef,
                              "left",
                            )
                          }
                          disabled={!favoriteSeriesCarouselState.canScrollLeft}
                          type="button"
                          className="absolute left-2 top-[40%] z-10 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:left-3 md:opacity-0 md:group-hover/scroll:opacity-100"
                          aria-label={text("profile.previousFavoriteSeries", "Previous favorite series")}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() =>
                            scrollFavoriteCarousel(
                              favoriteSeriesCarouselRef,
                              "right",
                            )
                          }
                          disabled={!favoriteSeriesCarouselState.canScrollRight}
                          type="button"
                          className="absolute right-2 top-[40%] z-10 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 md:right-3 md:opacity-0 md:group-hover/scroll:opacity-100"
                          aria-label={text("profile.nextFavoriteSeries", "Next favorite series")}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        <div
                          ref={favoriteSeriesCarouselRef}
                          className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-2 scroll-smooth overscroll-x-contain"
                        >
                          {favoriteSeries.map(({ item, preview }) => (
                            <div
                              key={`favorite-series-${item.mediaType}-${item.mediaId}`}
                              className="w-[calc(50vw-1rem)] min-w-[calc(50vw-1rem)] flex-shrink-0 snap-start sm:w-[180px] sm:min-w-[180px] md:w-[200px] md:min-w-[200px] lg:w-[220px] lg:min-w-[220px] xl:w-[240px] xl:min-w-[240px]"
                            >
                              <motion.div
                                layout
                                className="group relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors duration-150"
                              >
                                <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-150 md:opacity-0 md:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground/75 shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    onClick={() =>
                                      unpinFavorite(
                                        item.mediaId,
                                        item.mediaType,
                                        preview.title,
                                      )
                                    }
                                    aria-label={t("profile.removeFromFavorites", "Remove {{title}} from favorites", { title: preview.title })}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="relative aspect-[2/3] overflow-hidden">
                                  <Image
                                    src={getImageUrl(preview.posterPath, "w342")}
                                    srcSet={`${getImageUrl(preview.posterPath, "w154")} 154w, ${getImageUrl(preview.posterPath, "w342")} 342w, ${getImageUrl(preview.posterPath, "w500")} 500w`}
                                    sizes="(max-width: 640px) 132px, (max-width: 768px) 180px, (max-width: 1024px) 200px, (max-width: 1280px) 220px, 240px"
                                    alt={preview.title}
                                    width={342}
                                    height={513}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                    showSkeleton
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <p className="line-clamp-2 text-xs font-semibold tracking-tight text-white">
                                    {preview.title}
                                  </p>
                                </div>
                              </motion.div>
                            </div>
                          ))}

                          <div className="w-[132px] flex-shrink-0 snap-start sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]">
                            <button
                              type="button"
                              className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-border-hover hover:bg-accent"
                              onClick={() => openFavoritesPicker("tv")}
                            >
                              <div className="rounded-full border border-border bg-background p-3 shadow-sm group-hover:bg-accent">
                                <Plus className="h-5 w-5" />
                              </div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60 group-hover:opacity-100">
                                {text("profile.addSeriesShort", "Add Series")}
                              </span>
                            </button>
                          </div>
                        </div>

                        {favoriteSeriesCarouselState.pageCount > 1 ? (
                          <PaginationDots>
                            {Array.from({
                              length: favoriteSeriesCarouselState.pageCount,
                            }).map((_, index) => (
                              <PaginationDotButton
                                key={`favorite-series-page-${index}`}
                                onClick={() => {
                                  const container =
                                    favoriteSeriesCarouselRef.current;
                                  if (!container) return;
                                  const cards = Array.from(container.children) as HTMLElement[];
                                  const targetChildIndex =
                                    favoriteSeriesCarouselState.pageCount <= 1 || cards.length <= 1
                                      ? 0
                                      : Math.round(
                                          (index * (cards.length - 1)) /
                                            (favoriteSeriesCarouselState.pageCount - 1),
                                        );
                                  cards[targetChildIndex]?.scrollIntoView({
                                    behavior: "smooth",
                                    inline: "start",
                                    block: "nearest",
                                  });
                                }}
                                active={index === favoriteSeriesCarouselState.activePage}
                                aria-label={t("profile.goToFavoriteSeriesPage", "Go to favorite series page {{index}}", { index: index + 1 })}
                                aria-pressed={
                                  index ===
                                  favoriteSeriesCarouselState.activePage
                                }
                              />
                            ))}
                          </PaginationDots>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.section>
                  ) : null}

                  <Dialog
                    open={isFavoritesPickerOpen}
                    onOpenChange={(open) => {
                      setIsFavoritesPickerOpen(open);
                      if (!open) {
                        setFavoriteSearchQuery("");
                      }
                    }}
                  >
                    <DialogContent
                      className="max-w-3xl border-border bg-card p-0 text-foreground shadow-md sm:rounded-xl"
                      aria-describedby="favorites-picker-description"
                    >
                      <DialogHeader className="border-b border-border px-6 py-5 text-left">
                        <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                            {favoriteSearchType === "movie" ? (
                              <Film className="h-4.5 w-4.5" />
                            ) : (
                              <Sparkles className="h-4.5 w-4.5" />
                            )}
                          </span>
                          {favoriteSearchType === "movie"
                            ? text("profile.chooseFavoriteMovies", "Choose Favorite Movies")
                            : text("profile.chooseFavoriteSeries", "Choose Favorite Series")}
                        </DialogTitle>
                        <DialogDescription
                          id="favorites-picker-description"
                          className="max-w-2xl text-xs text-muted-foreground leading-relaxed"
                        >
                          {text(
                            "profile.favoritesPickerDesc",
                            "Search TMDB and pin the titles that define your taste. Favorites are saved to your profile shelf right away.",
                          )}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 px-6 pb-6 pt-3">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                          <Input
                            value={favoriteSearchQuery}
                            onChange={(event) =>
                              setFavoriteSearchQuery(event.target.value)
                            }
                            placeholder={
                              favoriteSearchType === "movie"
                                ? text("profile.searchMovies", "Search movies")
                                : text("profile.searchSeries", "Search TV series")
                            }
                            className="h-12 rounded-lg border-border/80 bg-background/50 pl-11 pr-4 text-sm"
                            autoFocus
                          />
                        </div>

                        {favoriteSearchTerm.length < 2 ? (
                          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
                            <p className="text-sm font-semibold text-foreground">
                              {text("profile.startTypingToSearch", "Start typing to search")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {text("profile.enterTwoChars", "Enter at least 2 characters to find")}{" "}
                              {favoriteSearchType === "movie"
                                ? text("common.movies", "movies")
                                : text("common.tvShows", "series")}
                              .
                            </p>
                          </div>
                        ) : isSearchingFavorites ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                              <div
                                key={`favorite-picker-skeleton-${index}`}
                                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
                              >
                                <div className="h-16 w-12 rounded-md skeleton-shimmer" />
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                                  <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                                </div>
                                <div className="h-9 w-20 rounded skeleton-shimmer" />
                              </div>
                            ))}
                          </div>
                        ) : favoriteSearchResults.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-8 text-center">
                            <p className="text-sm font-semibold text-foreground">
                              {text("profile.noMatchesFound", "No matches found")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {text("profile.tryDifferentSearch", "Try a different title, year, or spelling.")}
                            </p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {favoriteSearchResults.map((result) => {
                              const key = `${result.mediaType}-${result.id}`;
                              const isPinned =
                                pinnedFavoriteKeys.includes(key);

                              return (
                                <div
                                  key={key}
                                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-150 hover:bg-accent/40"
                                >
                                  <Image
                                    src={getImageUrl(result.posterPath, "w154")}
                                    srcSet={`${getImageUrl(result.posterPath, "w92")} 92w, ${getImageUrl(result.posterPath, "w154")} 154w, ${getImageUrl(result.posterPath, "w342")} 342w`}
                                    sizes="48px"
                                    alt={result.title}
                                    width={154}
                                    height={231}
                                    className="h-16 w-12 shrink-0 rounded object-cover shadow-sm"
                                    loading="lazy"
                                    showSkeleton
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                      {result.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {result.mediaType === "movie"
                                        ? text("watchHistory.mediaTypeMovie", "Movie")
                                        : text("profile.series", "Series")}
                                      {result.year ? ` • ${result.year}` : ""}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isPinned ? "secondary" : "outline"}
                                    className="min-w-[80px]"
                                    onClick={() =>
                                      isPinned
                                        ? unpinFavorite(
                                            result.id,
                                            result.mediaType,
                                            result.title,
                                          )
                                        : pinFavorite(
                                            result.id,
                                            result.mediaType,
                                            result.title,
                                          )
                                    }
                                  >
                                    {isPinned ? (
                                      <>
                                        <Check className="mr-1 h-3.5 w-3.5" />
                                        {text("profile.pinned", "Pinned")}
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {text("profile.add", "Add")}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {shouldShowProfileSection("taste") ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Genres & Decades */}
                      <div className="space-y-6">
                        <motion.section variants={itemVariants} className="space-y-3">
                          <h2 className="flex items-center gap-2 text-xl font-bold">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            {text("profile.favoriteGenres", "Favorite Genres")}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {t("profile.genresSelected", "{{count}} genres selected", {
                              count: favoriteGenres.length,
                            })}
                          </p>
                          <Card className="ct-panel">
                            <CardContent className="pt-5 pb-5">
                              {favoriteGenres.length === 0 && (
                                <p className="mb-3 rounded-lg border border-dashed border-border/50 bg-background/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
                                  {text("profile.tapGenresToSelect", "Tap genres below to build your taste profile — this powers recommendations.")}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {genres.map((genre) => {
                                  const selected = favoriteGenres.includes(genre.id);
                                  const watchCount =
                                    genreWatchCounts.get(genre.id) || 0;
                                  return (
                                    <Tooltip key={genre.id}>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => toggleGenre(genre.id)}
                                          className={cn(
                                            "group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
                                            selected
                                              ? "border-primary bg-primary text-primary-foreground"
                                              : "border-border bg-card text-foreground hover:bg-accent",
                                          )}
                                        >
                                          {selected && (
                                            <Check className="h-3 w-3 shrink-0" />
                                          )}
                                          {genre.name}
                                          {watchCount > 0 && (
                                            <span className={cn(
                                              "ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                                              selected
                                                ? "bg-white/20 text-white"
                                                : "bg-primary/10 text-primary",
                                            )}>
                                              {watchCount}
                                            </span>
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {t("profile.genreFilmsCount", "{{genre}} ({{count}} films)", {
                                          genre: genre.name,
                                          count: watchCount,
                                        })}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                              {favoriteGenres.length > 0 && (
                                <p className="mt-3 text-[10px] text-muted-foreground border-t border-border/20 pt-3">
                                  {t("profile.genresSelected", "{{count}} genres selected", {
                                    count: favoriteGenres.length,
                                  })}{" — "}{text("profile.genresSavedAutomatically", "saved automatically.")}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </motion.section>

                        <motion.section variants={itemVariants} className="space-y-3">
                          <h2 className="flex items-center gap-2 text-xl font-bold">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            {text("profile.decadeDistribution", "Decade Distribution")}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {text("profile.decadeDistributionSubtitle", "Distribution of logged films across decades of release.")}
                          </p>
                          <Card className="ct-panel w-full">
                            <CardContent className="space-y-4 pt-6">
                              {decadeDistribution.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{text("profile.noDecadeStats", "No decade statistics available yet.")}</p>
                              ) : (
                                decadeDistribution.map((entry) => {
                                  const max = Math.max(
                                    ...decadeDistribution.map((value) => value.count),
                                    1,
                                  );
                                  const progressValue = (entry.count / max) * 100;
                                  return (
                                    <div key={entry.decade} className="flex items-center gap-3">
                                      <span className="w-12 text-xs text-neutral-400 font-semibold">{entry.decade}</span>
                                      <Progress
                                        value={progressValue}
                                        className="h-2 flex-1"
                                      />
                                      <span className="w-8 text-right text-xs text-neutral-400">{entry.count}</span>
                                    </div>
                                  );
                                })
                              )}
                            </CardContent>
                          </Card>
                        </motion.section>
                      </div>

                      {/* Right Column: Ratings & Crew */}
                      <div className="space-y-6">
                        <motion.section
                          variants={itemVariants}
                          id="ratings-distribution"
                          className="space-y-3"
                        >
                          <h3 className="flex items-center gap-2 text-xl font-bold">
                            <BarChart3 className="h-5 w-5 text-[#E50914]" />
                            {text("profile.ratingDistribution", "Rating Distribution")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {text("profile.ratingDistributionSubtitle", "Spread of your rated titles.")}
                          </p>
                          <Card className="ct-panel w-full">
                            <CardContent className="space-y-4 pt-6">
                              {ratingDistribution.map((entry) => {
                                const max = Math.max(
                                  ...ratingDistribution.map((value) => value.count),
                                  1,
                                );
                                const progressValue = (entry.count / max) * 100;
                                const isTopBar =
                                  maxRatingCount > 0 &&
                                  entry.count === maxRatingCount;

                                return (
                                  <div
                                    key={entry.rating}
                                    className="flex items-center gap-3"
                                  >
                                    <span className="w-8 text-xs text-neutral-400">
                                      {entry.rating}
                                    </span>
                                    <Progress
                                      value={progressValue}
                                      className="h-2 flex-1"
                                    />
                                    <span className="w-8 text-right text-xs text-neutral-400">
                                      {entry.count}
                                    </span>
                                  </div>
                                );
                              })}
                              <p className="text-xs text-neutral-400 pt-1 border-t border-border/20">
                                {mostUsedRating
                                  ? t("profile.mostFrequentRating", "Most frequent rating: {{rating}} stars", { rating: mostUsedRating.rating })
                                  : text("profile.noRatingsYet", "No ratings yet")}
                              </p>
                              {ratingsCount === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 mt-2">
                                  <p className="text-sm font-medium text-foreground">
                                    {text("profile.noRatingsTitle", "You have not rated anything yet")}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {text(
                                      "profile.noRatingsDesc",
                                      "Rate a few titles to unlock recommendations, actor matches, and a full ratings breakdown.",
                                    )}
                                  </p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button asChild size="sm">
                                      <Link to="/search">{text("profile.browseMoviesToRate", "Browse movies to rate")}</Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                      <Link to="/watched">{text("profile.openWatchedList", "Open watched list")}</Link>
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        </motion.section>

                        <motion.section variants={itemVariants} className="space-y-3">
                          <h2 className="flex items-center gap-2 text-xl font-bold">
                            <Award className="h-5 w-5 text-muted-foreground" />
                            {text("profile.crewInsights", "Crew Insights")}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {text("profile.crewInsightsSubtitle", "Directors and actors you watch most frequently.")}
                          </p>
                          <Card className="w-full transition-all duration-200">
                            <CardContent className="space-y-6 pt-6">
                              {/* Directors */}
                              <div className="space-y-3">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{text("profile.topDirectors", "Most Watched Directors")}</p>
                                {topDirectors.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">{text("profile.noDirectorsYet", "No director statistics yet.")}</p>
                                ) : (
                                  topDirectors.map((director) => {
                                    const max = Math.max(...topDirectors.map((d) => d.count), 1);
                                    const progressValue = (director.count / max) * 100;
                                    return (
                                      <div key={director.name} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="font-medium text-foreground">{director.name}</span>
                                          <span className="text-muted-foreground">{t("profile.watchedCount", "{{count}} films", { count: director.count })}</span>
                                        </div>
                                        <Progress value={progressValue} className="h-1.5" />
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Cast */}
                              <div className="space-y-3 pt-2">
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{text("profile.topCast", "Most Watched Cast")}</p>
                                {topCast.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">{text("profile.noCastYet", "No actor statistics yet.")}</p>
                                ) : (
                                  topCast.map((actor) => {
                                    const max = Math.max(...topCast.map((c) => c.count), 1);
                                    const progressValue = (actor.count / max) * 100;
                                    return (
                                      <div key={actor.name} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="font-medium text-foreground">{actor.name}</span>
                                          <span className="text-muted-foreground">{t("profile.watchedCount", "{{count}} films", { count: actor.count })}</span>
                                        </div>
                                        <Progress value={progressValue} className="h-1.5" />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.section>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

            </div>

            <StickySaveBar
              isVisible={hasUnsavedChanges && !isEditMode}
              isSaving={isSaving}
              onSave={handleSaveProfile}
              onCancel={handleCancelChanges}
              saveLabel={text("settings.saveChanges", "Save Changes")}
              cancelLabel={text("common.cancel", "Cancel")}
            />
          </TooltipProvider>
        )}
      </motion.div>
    </>
  );
}
