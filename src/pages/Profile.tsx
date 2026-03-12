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
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserLists } from "@/contexts/user-lists-context";
import { useAuth } from "@/contexts/auth-context";
import { profileService, type UserProfile } from "@/services/profile";
import { validateDisplayName, sanitizeBio } from "@/lib/validation";
import { profileUpdateRateLimiter } from "@/lib/reviewRateLimiter";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { StickySaveBar } from "@/components/StickySaveBar";
import { humanizeUiText } from "@/lib/humanize-ui-text";
import { useTheme } from "@/contexts/theme-context";
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

function normalizePinnedFavoriteKeys(keys: string[]): string[] {
  const movieKeys: string[] = [];
  const seriesKeys: string[] = [];

  keys.forEach((key) => {
    if (key.startsWith("movie-") && movieKeys.length < 4) {
      movieKeys.push(key);
      return;
    }

    if (key.startsWith("tv-") && seriesKeys.length < 4) {
      seriesKeys.push(key);
    }
  });

  return [...movieKeys, ...seriesKeys];
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
  const [shareCopied, setShareCopied] = useState(false);
  const [pinnedFavoriteKeys, setPinnedFavoriteKeys] = useState<string[]>([]);
  const [isFavoritesPickerOpen, setIsFavoritesPickerOpen] = useState(false);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState("");
  const [favoriteSearchType, setFavoriteSearchType] = useState<
    "all" | "movie" | "tv"
  >("all");

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
    if (atIndex <= 0) return "Hidden";
    const localPart = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);
    if (!domain) return "Hidden";

    if (localPart.length <= 2) {
      return `${localPart[0] ?? "*"}****@${domain}`;
    }

    return `${localPart[0]}****${localPart[localPart.length - 1]}@${domain}`;
  }, []);

  const visibleEmail = useMemo(() => {
    if (!user?.email) return "";
    return isEmailRevealed ? user.email : maskEmail(user.email);
  }, [isEmailRevealed, maskEmail, user?.email]);

  const pinnedFavoritesStorageKey = useMemo(
    () => `cinetrekker_profile_favorites_${user?.id || "guest"}`,
    [user?.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(pinnedFavoritesStorageKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const normalized = Array.isArray(parsed)
        ? normalizePinnedFavoriteKeys(parsed)
        : [];
      setPinnedFavoriteKeys(normalized);
      localStorage.setItem(
        pinnedFavoritesStorageKey,
        JSON.stringify(normalized),
      );
    } catch {
      setPinnedFavoriteKeys([]);
    }
  }, [pinnedFavoritesStorageKey]);

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
        title: "Sync failed",
        description: "Could not sync genre changes. Please try again.",
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
            setProfilePhoto(profile.avatar_url || profile.profile_photo || null);
            setDateOfBirth(profile.date_of_birth || "");
            setDisplayName(profile.display_name || "");
            setBio(profile.bio || "");
            setFavoriteGenres(profile.favorite_genres || []);
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
            subscription = profileService.subscribeToProfile(
              user.id,
              (updatedProfile) => {
                if (!isMounted) return;
                setProfilePhoto(
                  updatedProfile.avatar_url ||
                  updatedProfile.profile_photo ||
                  null
                );
                setDateOfBirth(updatedProfile.date_of_birth || "");
                setDisplayName(updatedProfile.display_name || "");
                setBio(updatedProfile.bio || "");
                setFavoriteGenres(updatedProfile.favorite_genres || []);
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
            title: "Profile Loading Error",
            description:
              "Failed to load profile from server. Using cached data.",
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
  }, [user?.id, profileKey, toast]);

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
            title: "Too many updates",
            description: `Please wait ${rateLimitCheck.retryAfter} seconds before updating again.`,
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
        title: "Profile updated successfully",
        description: "Your latest profile changes are now live.",
        className:
          "border-l-4 border-l-[#E50914] bg-neutral-900/95 text-neutral-100 rounded-full",
      });
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description:
          "Profile saved locally, but syncing to server failed. Changes will sync when connection is restored.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = (): void => {
    // Reload the page to discard changes
    window.location.reload();
  };

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to upload a profile photo.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    // Validate MIME type
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and WebP images are allowed.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      event.target.value = "";
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
        title: "Photo uploaded",
        description: "Click 'Save Changes' to finalize your profile.",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
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
      setDobError("Please enter a valid date");
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
      setDobError("You must be at least 13 years old");
    } else if (age > 120) {
      setDobError("Please enter a valid date");
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
      setDobError("Please enter a valid age");
      return;
    }

    if (age < 13) {
      setDobError("You must be at least 13 years old");
      return;
    }

    if (age > 120) {
      setDobError("Please enter a valid age");
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
              title: details.title || details.name || "Untitled",
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
              title: `${item.mediaType === "movie" ? "Movie" : "Series"} #${item.mediaId}`,
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
              title: details.title || details.name || "Untitled",
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

  const pinnedMovieCount = useMemo(
    () => pinnedFavoriteKeys.filter((key) => key.startsWith("movie-")).length,
    [pinnedFavoriteKeys],
  );

  const pinnedSeriesCount = useMemo(
    () => pinnedFavoriteKeys.filter((key) => key.startsWith("tv-")).length,
    [pinnedFavoriteKeys],
  );

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
              title: item.title || item.name || "Untitled",
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
  const usernameSlug = userName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const shareProfileLink = `https://cinetrekker.app/u/${usernameSlug || "viewer"}`;

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

    if (rated.length === 0) return "No ratings yet";
    const last = new Date(rated[0].watchedAt || rated[0].addedAt || 0);
    const diff = Math.max(
      0,
      Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)),
    );

    if (diff === 0) return "Last rated today";
    if (diff === 1) return "Last rated 1 day ago";
    return `Last rated ${diff} days ago`;
  }, [watched]);

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
    if (moviesWatched <= 50) return "Casual Viewer";
    if (moviesWatched <= 150) return "Movie Buff";
    if (moviesWatched <= 300) return "Cinephile";
    return "Film Historian";
  }, [moviesWatched]);

  const achievements = useMemo(
    () => [
      {
        id: "first-log",
        icon: <Trophy className="h-5 w-5 text-amber-500" />,
        colorClass: "border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        shortLabel: "First Log",
        fullLabel: "First Movie Logged",
        condition: "Log at least 1 movie",
        progressLabel: `${Math.min(moviesWatched, 1)}/1 movies`,
        unlocked: moviesWatched >= 1,
        unlockedLabel: getUnlockLabel(movieWatchDates, 1),
      },
      {
        id: "50-movies",
        icon: <Award className="h-5 w-5 text-neutral-300" />,
        colorClass: "border-blue-400/30 bg-blue-400/10 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.1)]",
        shortLabel: "50 Movies",
        fullLabel: "50 Movies Watched",
        condition: "Watch 50 movies",
        progressLabel: `${Math.min(moviesWatched, 50)}/50 movies`,
        unlocked: moviesWatched >= 50,
        unlockedLabel: getUnlockLabel(movieWatchDates, 50),
      },
      {
        id: "100-movies",
        icon: <Star className="h-5 w-5 text-yellow-400" />,
        colorClass: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.1)]",
        shortLabel: "100 Movies",
        fullLabel: "100 Movies Watched",
        condition: "Watch 100 movies",
        progressLabel: `${Math.min(moviesWatched, 100)}/100 movies`,
        unlocked: moviesWatched >= 100,
        unlockedLabel: getUnlockLabel(movieWatchDates, 100),
      },
      {
        id: "200-ratings",
        icon: <Sparkles className="h-5 w-5 text-purple-400" />,
        colorClass: "border-purple-400/30 bg-purple-400/10 text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.1)]",
        shortLabel: "200 Ratings",
        fullLabel: "200 Ratings Given",
        condition: "Rate 200 titles",
        progressLabel: `${Math.min(ratingsCount, 200)}/200 ratings`,
        unlocked: ratingsCount >= 200,
        unlockedLabel: getUnlockLabel(ratingDates, 200),
      },
    ],
    [getUnlockLabel, movieWatchDates, moviesWatched, ratingDates, ratingsCount],
  );

  const countMoviesWatched = useCountUp(moviesWatched, 1100, !!reduceMotion);
  const countRatings = useCountUp(ratingsCount, 1200, !!reduceMotion);
  const countWatchHours = useCountUp(totalWatchHours, 1300, !!reduceMotion);

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(shareProfileLink);
      setShareCopied(true);
      toast({
        title: "Link copied to clipboard!",
        description: "Your profile link is ready to share.",
        className:
          "border-l-4 border-l-[#E50914] bg-neutral-900/95 text-neutral-100 rounded-full",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy profile link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pinFavorite = useCallback(
    (mediaId: number, mediaType: "movie" | "tv", title: string) => {
      const key = `${mediaType}-${mediaId}`;

      setPinnedFavoriteKeys((current) => {
        if (current.includes(key)) return current;
        const typeCount = current.filter((entry) =>
          entry.startsWith(`${mediaType}-`),
        ).length;

        if (typeCount >= 4) {
          const label = mediaType === "movie" ? "movies" : "series";
          toast({
            title: "Favorites limit reached",
            description: `You can pin up to 4 favorite ${label}.`,
          });
          return current;
        }

        const next = normalizePinnedFavoriteKeys([...current, key]);
        localStorage.setItem(pinnedFavoritesStorageKey, JSON.stringify(next));
        toast({
          title: "Pinned to favorites",
          description: `${title} was added to your pinned favorites.`,
        });
        setIsFavoritesPickerOpen(false);
        setFavoriteSearchQuery("");
        return next;
      });
    },
    [pinnedFavoritesStorageKey, toast],
  );

  const unpinFavorite = useCallback(
    (mediaId: number, mediaType: "movie" | "tv", title: string) => {
      const key = `${mediaType}-${mediaId}`;

      setPinnedFavoriteKeys((current) => {
        if (!current.includes(key)) return current;
        const next = current.filter((entry) => entry !== key);
        localStorage.setItem(pinnedFavoritesStorageKey, JSON.stringify(next));
        toast({
          title: "Removed from favorites",
          description: `${title} was removed from your pinned favorites.`,
        });
        return next;
      });
    },
    [pinnedFavoritesStorageKey, toast],
  );

  return (
    <>
      <SEO
        title="My Profile - CineTrekker"
        description="View your watching statistics and preferences"
        canonical="https://cinetrekker.vercel.app/profile"
      />
      <motion.div
        className="profile-page page-container max-w-full overflow-x-hidden pt-20 pb-24 md:pb-0"
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
                    "relative overflow-hidden shadow-2xl",
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
                      <div className="relative group">
                        <div
                          className={cn(
                            "pointer-events-none absolute -inset-5 rounded-full",
                            isLightTheme
                              ? "bg-[radial-gradient(circle,rgba(229,9,20,0.22)_0%,rgba(229,9,20,0.08)_40%,rgba(0,0,0,0)_76%)]"
                              : "bg-[radial-gradient(circle,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.28)_40%,rgba(0,0,0,0)_76%)]",
                          )}
                        />
                        <div className="absolute -inset-2 rounded-full bg-[#E50914]/70 blur-md opacity-75" />
                        <div className="relative h-36 w-36 sm:h-40 sm:w-40 overflow-hidden rounded-full border-[5px] border-[#E50914] bg-card shadow-[0_0_0_2px_rgba(255,255,255,0.08),0_0_40px_rgba(229,9,20,0.45)]">
                          {profilePhoto ? (
                            <img
                              src={profilePhoto}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-16 w-16 text-neutral-600" />
                            </div>
                          )}
                        </div>

                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="profile-photo-input"
                          onChange={handlePhotoChange}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute bottom-1 right-0 h-11 w-11 rounded-full border border-border bg-card/95 transition-all duration-200 hover:scale-105 hover:bg-accent"
                              onClick={() =>
                                document
                                  .getElementById("profile-photo-input")
                                  ?.click()
                              }
                              type="button"
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Change avatar</TooltipContent>
                        </Tooltip>
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
                            <p className="text-muted-foreground">{visibleEmail}</p>
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
                              {isEmailRevealed ? "Hide" : "Show"}
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
                                  Share Profile
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Link copied!</TooltipContent>
                            </Tooltip>
                          </div>
                        )}

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Movies Watched
                            </p>
                            <p className="text-xl font-bold">{moviesWatched}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Ratings
                            </p>
                            <p className="text-xl font-bold">{ratingsCount}</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Watch Time
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
                                    Unlocked{" "}
                                    {achievement.unlockedLabel ?? "Recently"}
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
                            View All Achievements {"->"}
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
                        <User className="h-5 w-5 text-blue-400" />
                        {text("profile.profileDetails", "Profile Details")}
                      </h2>
                      {!isEditMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditMode(true)}
                        >
                          Edit Profile
                        </Button>
                      ) : null}
                    </div>

                    <Card className="border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                      <CardContent className="space-y-6 pt-6">
                        {!isEditMode ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Display Name
                              </p>
                              <p className="text-base text-foreground">
                                {displayName || "Not set"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Current age
                              </p>
                              <p className="text-base text-foreground">
                                {userAge ?? "Not set"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-neutral-500">
                                Bio
                              </p>
                              <p className="text-sm leading-relaxed text-muted-foreground">
                                {bio ||
                                  "No bio yet. Tell people about your cinematic journey."}
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
                                  placeholder="22"
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
                                Save Changes
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditMode(false)}
                                disabled={isSaving}
                              >
                                Cancel
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
                              Movies Watched
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              +{watchedThisMonth} this month
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
                              Ratings
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
                              Watch Time
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Avg {averageMovieHours}h per movie
                            </p>
                          </div>
                        </button>
                    </div>
                  </motion.section>


                  <motion.section variants={itemVariants}>
                    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      {t("profile.actorMatches")}
                    </h2>
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Favorite Movies</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pinnedMovieCount}/4 movies pinned
                    </p>

                    {isFavoritesPickerOpen && favoriteSearchType === "movie" ? (
                      <Card className="border-neutral-800/60 bg-neutral-900/55">
                        <CardContent className="space-y-3 pt-6">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <Input
                              value={favoriteSearchQuery}
                              onChange={(event) =>
                                setFavoriteSearchQuery(event.target.value)
                              }
                              placeholder="Search movies"
                              className="pl-9"
                            />
                          </div>

                          {favoriteSearchTerm.length < 2 ? (
                            <p className="text-xs text-muted-foreground">
                              Type at least 2 characters to search.
                            </p>
                          ) : isSearchingFavorites ? (
                            <p className="text-xs text-muted-foreground">
                              Searching titles...
                            </p>
                          ) : favoriteSearchResults.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No matches found.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {favoriteSearchResults.map((result) => {
                                const key = `${result.mediaType}-${result.id}`;
                                const isPinned =
                                  pinnedFavoriteKeys.includes(key);

                                return (
                                  <div
                                    key={key}
                                    className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 p-2"
                                  >
                                    <img
                                      src={getImageUrl(
                                        result.posterPath,
                                        "w154",
                                      )}
                                      alt={result.title}
                                      className="h-14 w-10 shrink-0 rounded object-cover"
                                      loading="lazy"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 text-sm font-medium text-neutral-100">
                                        {result.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {result.mediaType === "movie"
                                          ? "Movie"
                                          : "Series"}
                                        {result.year ? ` • ${result.year}` : ""}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={
                                        isPinned ? "secondary" : "outline"
                                      }
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
                                          Pinned
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="mr-1 h-3.5 w-3.5" />
                                          Pin
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {favoriteMovies.map(({ item, preview }) => (
                        <motion.div
                          key={`favorite-${item.mediaType}-${item.mediaId}`}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -4 }}
                          className="group relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 shadow-xl transition-all duration-300"
                        >
                          <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground/75 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              onClick={() =>
                                unpinFavorite(
                                  item.mediaId,
                                  item.mediaType,
                                  preview.title,
                                )
                              }
                              aria-label={`Remove ${preview.title} from favorites`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={getImageUrl(preview.posterPath, "w342")}
                              alt={preview.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className="line-clamp-2 text-xs font-bold tracking-tight text-white drop-shadow-md">
                              {preview.title}
                            </p>
                          </div>
                        </motion.div>
                      ))}

                       {Array.from({
                         length: Math.max(0, 4 - favoriteMovies.length),
                       }).map((_, index) => (
                         <button
                           key={`favorite-movie-slot-${index}`}
                           type="button"
                           className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-800/60 bg-neutral-900/20 text-neutral-600 transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
                           onClick={() => {
                             setFavoriteSearchType("movie");
                             setIsFavoritesPickerOpen(
                               (open) => !open || favoriteSearchType !== "movie",
                             );
                           }}
                         >
                           <div className="rounded-full border border-neutral-800 bg-neutral-900 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-red-500/10 group-hover:border-red-500/20 p-3">
                             <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
                           </div>
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">
                             Add Movie
                           </span>
                         </button>
                       ))}
                    </div>
                  </motion.section>

                  <motion.section
                    variants={itemVariants}
                    id="favorite-series"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Favorite Series</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pinnedSeriesCount}/4 series pinned
                    </p>

                    {isFavoritesPickerOpen && favoriteSearchType === "tv" ? (
                      <Card className="border-neutral-800/60 bg-neutral-900/55">
                        <CardContent className="space-y-3 pt-6">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <Input
                              value={favoriteSearchQuery}
                              onChange={(event) =>
                                setFavoriteSearchQuery(event.target.value)
                              }
                              placeholder="Search TV series"
                              className="pl-9"
                            />
                          </div>

                          {favoriteSearchTerm.length < 2 ? (
                            <p className="text-xs text-muted-foreground">
                              Type at least 2 characters to search.
                            </p>
                          ) : isSearchingFavorites ? (
                            <p className="text-xs text-muted-foreground">
                              Searching titles...
                            </p>
                          ) : favoriteSearchResults.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No matches found.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {favoriteSearchResults.map((result) => {
                                const key = `${result.mediaType}-${result.id}`;
                                const isPinned =
                                  pinnedFavoriteKeys.includes(key);

                                return (
                                  <div
                                    key={key}
                                    className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 p-2"
                                  >
                                    <img
                                      src={getImageUrl(
                                        result.posterPath,
                                        "w154",
                                      )}
                                      alt={result.title}
                                      className="h-14 w-10 shrink-0 rounded object-cover"
                                      loading="lazy"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-1 text-sm font-medium text-neutral-100">
                                        {result.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {result.mediaType === "movie"
                                          ? "Movie"
                                          : "Series"}
                                        {result.year ? ` • ${result.year}` : ""}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={
                                        isPinned ? "secondary" : "outline"
                                      }
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
                                          Pinned
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="mr-1 h-3.5 w-3.5" />
                                          Pin
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {favoriteSeries.map(({ item, preview }) => (
                        <motion.div
                          key={`favorite-series-${item.mediaType}-${item.mediaId}`}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -4 }}
                          className="group relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/40 shadow-xl transition-all duration-300"
                        >
                          <div className="absolute right-2 top-2 z-20 opacity-100 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground/75 shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              onClick={() =>
                                unpinFavorite(
                                  item.mediaId,
                                  item.mediaType,
                                  preview.title,
                                )
                              }
                              aria-label={`Remove ${preview.title} from favorites`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={getImageUrl(preview.posterPath, "w342")}
                              alt={preview.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className="line-clamp-2 text-xs font-bold tracking-tight text-white drop-shadow-md">
                              {preview.title}
                            </p>
                          </div>
                        </motion.div>
                      ))}

                       {Array.from({
                         length: Math.max(0, 4 - favoriteSeries.length),
                       }).map((_, index) => (
                         <button
                           key={`favorite-series-slot-${index}`}
                           type="button"
                           className="group flex aspect-[2/3] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-800/60 bg-neutral-900/20 text-neutral-600 transition-all duration-300 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-400"
                           onClick={() => {
                             setFavoriteSearchType("tv");
                             setIsFavoritesPickerOpen(
                               (open) => !open || favoriteSearchType !== "tv",
                             );
                           }}
                         >
                           <div className="rounded-full border border-neutral-800 bg-neutral-900 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 p-3">
                             <Plus className="h-6 w-6 transition-transform group-hover:rotate-90" />
                           </div>
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100">
                             Add Series
                           </span>
                         </button>
                       ))}
                    </div>
                  </motion.section>

                  <motion.section variants={itemVariants}>
                    <h2 className="mb-2 text-xl font-bold">
                      {text("profile.favoriteGenres", "Favorite Genres")}
                    </h2>
                    <p className="mb-4 text-sm text-neutral-400">
                      {favoriteGenres.length} genres selected
                    </p>
                    <Card className="border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
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
                                        : "border-neutral-700 text-neutral-200 hover:border-primary/60 hover:text-white",
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
                                  {genre.name} ({watchCount} films)
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
                      Rating Distribution
                    </h3>
                    <Card className="w-full border-neutral-800/60 bg-neutral-900/55">
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
                            ? `Most frequent rating: ${mostUsedRating.rating} stars`
                            : "No ratings yet"}
                        </p>
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

