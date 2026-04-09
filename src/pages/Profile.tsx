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

            return {
              key: `${item.mediaType}-${item.mediaId}`,
              title: details.title || details.name || t("common.untitled", "Untitled"),
              posterPath: details.poster_path || null,
              runtimeMinutes:
                item.mediaType === "movie"
                  ? details.runtime || 0
                  : details.episode_run_time?.[0] || 0,
              genreIds: (details.genres || []).map((genre) => genre.id),
            };
          } catch {
            return {
              key: `${item.mediaType}-${item.mediaId}`,
              runtimeMinutes: 0,
              genreIds: [] as number[],
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
        icon: <Trophy className="h-5 w-5 text-amber-500" />,
        colorClass:
          "border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
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
        icon: <Award className="h-5 w-5 text-neutral-300" />,
        colorClass:
          "border-primary/30 bg-primary/10 text-primary shadow-[0_0_15px_rgba(229,9,20,0.12)]",
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
        icon: <Star className="h-5 w-5 text-yellow-400" />,
        colorClass:
          "border-yellow-400/30 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.1)]",
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
        icon: <Sparkles className="h-5 w-5 text-purple-400" />,
        colorClass:
          "border-purple-400/30 bg-purple-400/10 text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.1)]",
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
        className:
          "border-l-4 border-l-[#E50914] bg-neutral-900/95 text-neutral-100 rounded-full",
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
        className="profile-page page-container ct-page-shell max-w-full overflow-x-hidden pt-20 pb-24 md:pb-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoadingProfile && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoadingProfile && (
          <TooltipProvider>
            <>
              <motion.section variants={itemVariants} className="mb-8">
                <Card
                  className={cn(
                    "ct-panel-strong relative overflow-hidden shadow-2xl",
                    isLightTheme
                      ? "border-border/70 bg-card"
                      : "border-border/60 bg-card/95",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0",
                      isLightTheme
                        ? "bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.12),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(229,9,20,0.06),transparent_30%),linear-gradient(135deg,#ffffff_8%,#f6f7f9_100%)]"
                        : "bg-[radial-gradient(circle_at_20%_20%,rgba(229,9,20,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,#0b0b0d_20%,#111216_100%)]",
                    )}
                  />
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22220%22 height=%22220%22 viewBox=%220 0 220 220%22%3E%3Cfilter id=%22n%22 x=%220%22 y=%220%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22220%22 height=%22220%22 filter=%22url(%23n)%22 opacity=%220.42%22/%3E%3C/svg%3E')]",
                      isLightTheme ? "opacity-[0.02]" : "opacity-[0.045]",
                    )}
                  />

                  <CardContent className="relative z-10 pt-8 pb-7">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                      <div
                        className="flex w-full flex-col items-center sm:w-[21rem] sm:min-w-[21rem]"
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
                              "pointer-events-none absolute -inset-3 rounded-full",
                              isLightTheme
                                ? "bg-[radial-gradient(circle,rgba(229,9,20,0.16)_0%,rgba(229,9,20,0.06)_48%,rgba(255,255,255,0)_76%)]"
                                : "bg-[radial-gradient(circle,rgba(229,9,20,0.18)_0%,rgba(229,9,20,0.08)_46%,rgba(0,0,0,0)_72%)]",
                            )}
                          />
                          <div
                            className={cn(
                              "pointer-events-none absolute -inset-1 rounded-full blur-xl",
                              isLightTheme
                                ? "bg-[#ff4d57]/25 opacity-80"
                                : "bg-[#E50914]/30 opacity-75",
                            )}
                          />
                          <div
                            className={cn(
                              "relative h-36 w-36 overflow-hidden rounded-full border-[5px] border-[#E50914] bg-card shadow-[0_0_0_2px_rgba(255,255,255,0.08),0_0_40px_rgba(229,9,20,0.45)] sm:h-40 sm:w-40",
                              isAvatarDragActive &&
                                "scale-[1.02] border-[#ff6b73] shadow-[0_0_0_2px_rgba(255,255,255,0.16),0_0_50px_rgba(229,9,20,0.6)]",
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
                        <div className="mt-4 grid w-full max-w-[21rem] grid-cols-2 gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="sm"
                                className={cn(
                                  "h-14 w-full justify-center rounded-full px-4 text-base font-semibold",
                                  !profilePhoto && "col-span-2",
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
                              className="h-14 w-full justify-center rounded-full px-4 text-base font-semibold"
                              onClick={handlePhotoRemove}
                            >
                              <X className="mr-2 h-4 w-4" />
                              {text("common.delete", "Remove")}
                            </Button>
                          ) : null}
                        </div>
                        <p className="mt-3 max-w-[21rem] text-center text-[11px] text-muted-foreground">
                          {text("profile.photoUploadHint", "Drag and drop a profile picture or choose a file.")}
                        </p>
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                            {userName}
                          </h1>
                          <Badge className="border-none bg-[#E50914]/20 text-[#ff6b73]">
                            <Trophy className="mr-1 h-3.5 w-3.5" />
                            {cinephileLevel}
                          </Badge>
                        </div>

                        {user && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <p className="text-muted-foreground">
                              {visibleEmail}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                setIsEmailRevealed((prev) => !prev)
                              }
                            >
                              {isEmailRevealed ? (
                                <EyeOff className="mr-1 h-3.5 w-3.5" />
                              ) : (
                                <Eye className="mr-1 h-3.5 w-3.5" />
                              )}
                              {isEmailRevealed
                                ? text("auth.hide", "Hide")
                                : text("auth.show", "Show")}
                            </Button>
                            <Tooltip open={shareCopied ? true : undefined}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={handleCopyProfileLink}
                                >
                                  <Share2 className="mr-1 h-3.5 w-3.5" />
                                  {text("profile.shareProfile", "Share Profile")}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{text("profile.linkCopied", "Link copied!")}</TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {text("profile.moviesWatched", "Movies Watched")}
                            </p>
                            <p className="text-xl font-bold">{moviesWatched}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {text("profile.ratings", "Ratings")}
                            </p>
                            <p className="text-xl font-bold">{ratingsCount}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              {text("profile.watchTime", "Watch Time")}
                            </p>
                            <p className="text-xl font-bold">
                              {totalWatchHours}h
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {achievements.slice(0, 4).map((achievement) => (
                            <Tooltip key={achievement.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "relative flex items-center justify-center rounded-lg border p-2.5 transition-all duration-300 hover:scale-110 hover:shadow-lg",
                                    achievement.unlocked
                                      ? achievement.colorClass
                                      : "border-border bg-background/70 opacity-45 grayscale hover:grayscale-0 hover:border-border/80",
                                  )}
                                >
                                  {achievement.icon}
                                  {!achievement.unlocked ? (
                                    <span className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground">
                                      <Lock className="h-2.5 w-2.5" />
                                    </span>
                                  ) : null}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-semibold">
                                  {achievement.fullLabel}
                                </p>
                                {achievement.unlocked ? (
                                  <p className="text-xs text-amber-300">
                                    {text("achievements.unlockedPrefix", "Unlocked")}{" "}
                                    {achievement.unlockedLabel ?? text("achievements.recently", "Recently")}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    {achievement.progressLabel}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>

                        <div className="mt-3">
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

              <div className="space-y-8">
                <div className="space-y-8">
                  <motion.section
                    variants={itemVariants}
                    id="profile-details"
                    className="mb-2"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-xl font-bold">
                        <User className="h-5 w-5 text-primary" />
                        {text("profile.profileDetails", "Profile Details")}
                      </h2>
                      {!isEditMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditMode(true)}
                        >
                          {text("profile.editProfile", "Edit Profile")}
                        </Button>
                      ) : null}
                    </div>

                    <Card className="ct-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                      <CardContent className="space-y-6 pt-6">
                        {!isEditMode ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                {text("profile.displayName", "Display Name")}
                              </p>
                              <p className="text-base text-foreground">
                                {displayName || text("profile.notSet", "Not set")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                {text("profile.currentAge", "Current age")}
                              </p>
                              <p className="text-base text-foreground">
                                {userAge ?? text("profile.notSet", "Not set")}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                {text("profile.bio", "Bio")}
                              </p>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {bio ||
                                  text(
                                    "profile.noBioYet",
                                    "No bio yet. Tell people about your cinematic journey.",
                                  )}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label
                                  htmlFor="displayName"
                                  className="flex items-center gap-2 text-foreground"
                                >
                                  <User className="h-4 w-4" />
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
                                  className="bg-background/70 border-border focus:border-red-500 focus:ring-red-500/20"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label
                                  htmlFor="ageInput"
                                  className="flex items-center gap-2 text-foreground"
                                >
                                  <CalendarDays className="h-4 w-4" />
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
                                    "bg-background/70 border-border focus:border-red-500 focus:ring-red-500/20",
                                    dobError &&
                                      "border-destructive focus:border-destructive",
                                  )}
                                />
                                {dobError ? (
                                  <p className="text-xs text-destructive">
                                    {dobError}
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bio" className="text-foreground">
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
                                className="min-h-[100px] w-full resize-y rounded-md border border-border bg-background/70 p-3 transition-colors duration-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                maxLength={500}
                              />
                              <p className="text-xs text-muted-foreground">
                                {bio.length}/500{" "}
                                {text("profile.characters", "characters")}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                              >
                                {t("settings.saveChanges", "Save Changes")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelChanges}
                                disabled={isSaving}
                              >
                                {t("common.cancel", "Cancel")}
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.section>

                  <motion.section variants={itemVariants} id="stats-overview">
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                      <TrendingUp className="h-5 w-5 text-red-500" />
                      {t("profile.overview")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("profile-details")
                            ?.scrollIntoView({
                              behavior: reduceMotion ? "auto" : "smooth",
                            })
                        }
                        className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#E50914]/40 hover:shadow-[0_0_30px_rgba(229,9,20,0.15)] focus:outline-none focus:ring-2 focus:ring-[#E50914]/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="relative p-5">
                          <Film className="mb-3 h-6 w-6 text-red-500 transition-transform duration-300 group-hover:scale-110" />
                          <p className="text-[3.5rem] font-black leading-none tracking-tight text-foreground dark:text-white transition-colors group-hover:text-red-50">
                            {countMoviesWatched}
                          </p>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                            {text("profile.moviesWatched", "Movies Watched")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("profile.watchedThisMonth", "+{{count}} this month", {
                              count: watchedThisMonth,
                            })}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("ratings-distribution")
                            ?.scrollIntoView({
                              behavior: reduceMotion ? "auto" : "smooth",
                            })
                        }
                        className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#E50914]/40 hover:shadow-[0_0_30px_rgba(229,9,20,0.15)] focus:outline-none focus:ring-2 focus:ring-[#E50914]/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#E50914]/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="relative p-5">
                          <Star className="mb-3 h-6 w-6 text-[#E50914] transition-transform duration-300 group-hover:scale-110" />
                          <p className="text-[3.5rem] font-black leading-none tracking-tight text-foreground dark:text-white transition-colors group-hover:text-red-50">
                            {countRatings}
                          </p>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                            {text("profile.ratings", "Ratings")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {latestRatedDateLabel}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("favorite-series")
                            ?.scrollIntoView({
                              behavior: reduceMotion ? "auto" : "smooth",
                            })
                        }
                        className="group relative overflow-hidden rounded-xl border border-border/70 bg-card/80 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="relative p-5">
                          <Clock className="mb-3 h-6 w-6 text-emerald-400 transition-transform duration-300 group-hover:scale-110" />
                          <p className="text-[3.5rem] font-black leading-none tracking-tight text-foreground dark:text-white transition-colors group-hover:text-emerald-50">
                            {countWatchHours}h
                          </p>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                            {text("profile.watchTime", "Watch Time")}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("profile.averageHoursPerMovie", "Avg {{hours}}h per movie", {
                              hours: averageMovieHours,
                            })}
                          </p>
                        </div>
                      </button>
                    </div>
                  </motion.section>

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
                </div>

                <div className="space-y-8">
                  <motion.section variants={itemVariants} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Film className="h-4 w-4 text-primary" />
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
                      <Card className="border-border/60 bg-card/55">
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
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -4 }}
                                className="group relative w-full overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/70 shadow-xl backdrop-blur-md transition-all duration-300"
                              >
                                <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-background/90 text-foreground/75 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    onClick={() =>
                                      unpinFavorite(
                                        item.mediaId,
                                        item.mediaType,
                                        preview.title,
                                      )
                                    }
                                    aria-label={t("profile.removeFromFavorites", "Remove {{title}} from favorites", { title: preview.title })}
                                  >
                                    <X className="h-4 w-4" />
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
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    showSkeleton
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <p className="line-clamp-2 text-xs font-bold tracking-tight text-white drop-shadow-md">
                                    {preview.title}
                                  </p>
                                </div>
                              </motion.div>
                            </div>
                          ))}

                          <div className="w-[calc(50vw-1rem)] min-w-[calc(50vw-1rem)] flex-shrink-0 snap-start sm:w-[180px] sm:min-w-[180px] md:w-[200px] md:min-w-[200px] lg:w-[220px] lg:min-w-[220px] xl:w-[240px] xl:min-w-[240px]">
                            <button
                              type="button"
                              className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed border-border/60 bg-card/50 text-muted-foreground transition-all duration-300 hover:border-primary/45 hover:bg-primary/6 hover:text-primary"
                              onClick={() => openFavoritesPicker("movie")}
                            >
                              <div className="rounded-full border border-border/60 bg-card/90 p-3 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary/25 group-hover:bg-primary/10">
                                <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">
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

                  <motion.section
                    variants={itemVariants}
                    id="favorite-series"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Sparkles className="h-4 w-4 text-primary" />
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
                      <Card className="border-border/60 bg-card/55">
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
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -4 }}
                                className="group relative w-full overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/70 shadow-xl backdrop-blur-md transition-all duration-300"
                              >
                                <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-background/90 text-foreground/75 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    onClick={() =>
                                      unpinFavorite(
                                        item.mediaId,
                                        item.mediaType,
                                        preview.title,
                                      )
                                    }
                                    aria-label={t("profile.removeFromFavorites", "Remove {{title}} from favorites", { title: preview.title })}
                                  >
                                    <X className="h-4 w-4" />
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
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    showSkeleton
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <p className="line-clamp-2 text-xs font-bold tracking-tight text-white drop-shadow-md">
                                    {preview.title}
                                  </p>
                                </div>
                              </motion.div>
                            </div>
                          ))}

                          <div className="w-[132px] flex-shrink-0 snap-start sm:w-[180px] md:w-[200px] lg:w-[220px] xl:w-[240px]">
                            <button
                              type="button"
                              className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed border-border/60 bg-card/50 text-muted-foreground transition-all duration-300 hover:border-primary/45 hover:bg-primary/6 hover:text-primary"
                              onClick={() => openFavoritesPicker("tv")}
                            >
                              <div className="rounded-full border border-border/60 bg-card/90 p-3 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary/25 group-hover:bg-primary/10">
                                <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">
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
                      className="max-w-3xl border-border/70 bg-[#09090b]/95 p-0 text-foreground shadow-2xl backdrop-blur-xl sm:rounded-3xl"
                      aria-describedby="favorites-picker-description"
                    >
                      <DialogHeader className="border-b border-border/50 bg-[radial-gradient(circle_at_top,rgba(229,9,20,0.16),transparent_46%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] px-6 py-6 text-left">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E50914]/30 bg-[#E50914]/12 text-[#ff6b73] shadow-[0_0_30px_rgba(229,9,20,0.18)]">
                            {favoriteSearchType === "movie" ? (
                              <Film className="h-5 w-5" />
                            ) : (
                              <Sparkles className="h-5 w-5" />
                            )}
                          </span>
                          {favoriteSearchType === "movie"
                            ? text("profile.chooseFavoriteMovies", "Choose Favorite Movies")
                            : text("profile.chooseFavoriteSeries", "Choose Favorite Series")}
                        </DialogTitle>
                        <DialogDescription
                          id="favorites-picker-description"
                          className="max-w-2xl text-sm text-muted-foreground"
                        >
                          {text(
                            "profile.favoritesPickerDesc",
                            "Search TMDB and pin the titles that define your taste. Favorites are saved to your profile shelf right away.",
                          )}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 px-6 pb-6 pt-2">
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
                            className="h-14 rounded-2xl border-border/60 bg-background/60 pl-11 pr-4 text-base shadow-inner"
                            autoFocus
                          />
                        </div>

                        {favoriteSearchTerm.length < 2 ? (
                          <div className="rounded-2xl border border-dashed border-border/60 bg-card/35 px-5 py-8 text-center">
                            <p className="text-base font-semibold text-foreground">
                              {text("profile.startTypingToSearch", "Start typing to search")}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
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
                                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3"
                              >
                                <div className="h-16 w-12 rounded-md skeleton-shimmer" />
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                                  <div className="h-3 w-1/2 rounded skeleton-shimmer" />
                                </div>
                                <div className="h-9 w-20 rounded-full skeleton-shimmer" />
                              </div>
                            ))}
                          </div>
                        ) : favoriteSearchResults.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border/60 bg-card/35 px-5 py-8 text-center">
                            <p className="text-base font-semibold text-foreground">
                              {text("profile.noMatchesFound", "No matches found")}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
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
                                  className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 transition-all duration-200 hover:border-primary/40 hover:bg-card"
                                >
                                  <Image
                                    src={getImageUrl(result.posterPath, "w154")}
                                    srcSet={`${getImageUrl(result.posterPath, "w92")} 92w, ${getImageUrl(result.posterPath, "w154")} 154w, ${getImageUrl(result.posterPath, "w342")} 342w`}
                                    sizes="48px"
                                    alt={result.title}
                                    width={154}
                                    height={231}
                                    className="h-16 w-12 shrink-0 rounded-md object-cover shadow-md"
                                    loading="lazy"
                                    showSkeleton
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                      {result.title}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
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
                                    className="min-w-[88px] rounded-full"
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

                  <motion.section variants={itemVariants}>
                    <h2 className="mb-2 text-xl font-bold">
                      {text("profile.favoriteGenres", "Favorite Genres")}
                    </h2>
                    <p className="mb-4 text-sm text-neutral-400">
                      {t("profile.genresSelected", "{{count}} genres selected", {
                        count: favoriteGenres.length,
                      })}
                    </p>
                    <Card className="ct-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-2">
                          {genres.map((genre) => {
                            const selected = favoriteGenres.includes(genre.id);
                            const watchCount =
                              genreWatchCounts.get(genre.id) || 0;
                            return (
                              <Tooltip key={genre.id}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={selected ? "default" : "outline"}
                                    className={cn(
                                      "cursor-pointer px-3 py-1.5 transition-all duration-200 hover:scale-105",
                                      selected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border/70 text-foreground/85 hover:border-primary/60 hover:text-foreground",
                                    )}
                                    onClick={() => toggleGenre(genre.id)}
                                  >
                                    {selected ? (
                                      <Check className="mr-1.5 h-3.5 w-3.5" />
                                    ) : null}
                                    {genre.name}
                                  </Badge>
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
                      </CardContent>
                    </Card>
                  </motion.section>

                  <motion.section
                    variants={itemVariants}
                    id="ratings-distribution"
                    className="space-y-3"
                  >
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <BarChart3 className="h-4 w-4 text-[#E50914]" />
                      {text("profile.ratingDistribution", "Rating Distribution")}
                    </h3>
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
                                className={cn(
                                  "h-2.5 flex-1 bg-neutral-800",
                                  isTopBar
                                    ? "[&>div]:bg-gradient-to-r [&>div]:from-[#ff3b45] [&>div]:to-[#ff8f96]"
                                    : "[&>div]:bg-gradient-to-r [&>div]:from-[#E50914] [&>div]:to-[#ff6b73]",
                                )}
                              />
                              <span className="w-8 text-right text-xs text-neutral-400">
                                {entry.count}
                              </span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-neutral-400">
                          {mostUsedRating
                            ? t("profile.mostFrequentRating", "Most frequent rating: {{rating}} stars", { rating: mostUsedRating.rating })
                            : text("profile.noRatingsYet", "No ratings yet")}
                        </p>
                        {ratingsCount === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4">
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
            </>
          </TooltipProvider>
        )}
      </motion.div>
    </>
  );
}
