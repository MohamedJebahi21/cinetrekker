import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// Track actor match missing-data logging across renders (and StrictMode double-mount)
let actorMatchesMissingLogged = false;
import { useQuery } from '@tanstack/react-query';
import { 
  User, 
  Film, 
  Tv, 
  Bookmark, 
  Heart, 
  PlayCircle, 
  CalendarDays, 
  Camera, 
  Sparkles, 
  Search,
  Star,
  Clock,
  Clapperboard,
  Plus,
  TrendingUp
} from 'lucide-react';
import { useUserLists, type UserListsContextType } from '@/contexts/user-lists-context';
import { useAuth } from '@/contexts/auth-context';
import { useFollowedShows, useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { Link } from 'react-router-dom';
import { getImageUrl, getPersonDetails, getPopularPeople, type PersonDetails } from '@/services/tmdb';
import { profileService, type UserProfile } from '@/services/profile';
import { validateNote, validateDisplayName, sanitizeBio } from '@/lib/validation';
import { profileUpdateRateLimiter } from '@/lib/reviewRateLimiter';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';
import { StickySaveBar } from '@/components/StickySaveBar';
import { EmptyState } from '@/components/EmptyState';

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
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { watched, watchlist } = useUserLists();
  const { user } = useAuth();
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();
  const { toast } = useToast();

  const profileKey = useMemo(() => `cinetrekker_profile_${user?.id || 'guest'}`, [user?.id]);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [dobError, setDobError] = useState<string>('');
  const [favoriteGenres, setFavoriteGenres] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const missingActorDataLogged = useRef(false);
  
  // Store initial state for change detection
  const initialStateRef = useRef({
    profilePhoto: '',
    dateOfBirth: '',
    displayName: '',
    bio: '',
    favoriteGenres: [] as number[],
  });

  // Helper function to detect actual changes
  const hasChanges = useCallback(() => {
    const initial = initialStateRef.current;
    const current = {
      profilePhoto: profilePhoto || '',
      dateOfBirth: dateOfBirth || '',
      displayName: displayName || '',
      bio: bio || '',
      favoriteGenres: favoriteGenres,
    };
    
    return (
      initial.profilePhoto !== current.profilePhoto ||
      initial.dateOfBirth !== current.dateOfBirth ||
      initial.displayName !== current.displayName ||
      initial.bio !== current.bio ||
      JSON.stringify(initial.favoriteGenres) !== JSON.stringify(current.favoriteGenres)
    );
  }, [profilePhoto, dateOfBirth, displayName, bio, favoriteGenres]);

  // Load profile from Supabase (with localStorage fallback)
  useEffect(() => {
    let subscription: { unsubscribe: () => Promise<void> | void } | null = null;
    let isMounted = true;

    const loadProfile = async () => {
      if (!isMounted) return;
      
      setIsLoadingProfile(true);
      
      try {
        if (user?.id) {
          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Profile load timeout')), 10000)
          );
          
          const loadPromise = profileService.getProfile(user.id);
          const profile = await Promise.race([loadPromise, timeoutPromise]) as UserProfile | null;
          
          if (!isMounted) return;
          
          if (profile) {
            setProfilePhoto(profile.profile_photo || null);
            setDateOfBirth(profile.date_of_birth || '');
            setDisplayName(profile.display_name || '');
            setBio(profile.bio || '');
            setFavoriteGenres(profile.favorite_genres || []);
          } else {
            // Fallback to localStorage if not in Supabase yet
            const stored = localStorage.getItem(profileKey);
            if (stored) {
              const parsed = JSON.parse(stored) as { 
                photo?: string; 
                dob?: string;
                displayName?: string;
                bio?: string;
                favoriteGenres?: number[];
              };
              setProfilePhoto(parsed.photo || null);
              setDateOfBirth(parsed.dob || '');
              setDisplayName(parsed.displayName || '');
              setBio(parsed.bio || '');
              setFavoriteGenres(parsed.favoriteGenres || []);
            }
          }

          // Subscribe to real-time updates (only if component is still mounted)
          if (isMounted) {
            subscription = profileService.subscribeToProfile(user.id, (updatedProfile) => {
              if (!isMounted) return;

              setProfilePhoto(updatedProfile.profile_photo || null);
              setDateOfBirth(updatedProfile.date_of_birth || '');
              setDisplayName(updatedProfile.display_name || '');
              setBio(updatedProfile.bio || '');
              setFavoriteGenres(updatedProfile.favorite_genres || []);
            });
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
            photo?: string; 
            dob?: string;
            displayName?: string;
            bio?: string;
            favoriteGenres?: number[];
          };
          setProfilePhoto(parsed.photo || null);
          setDateOfBirth(parsed.dob || '');
          setDisplayName(parsed.displayName || '');
          setBio(parsed.bio || '');
          setFavoriteGenres(parsed.favoriteGenres || []);
        }
      } catch (error) {
        console.error('❌ Error loading profile:', error);
        
        // Show user-friendly error
        if (isMounted) {
          toast({
            title: "Profile Loading Error",
            description: "Failed to load profile from server. Using cached data.",
            variant: "destructive",
          });
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem(profileKey);
        if (stored && isMounted) {
          try {
            const parsed = JSON.parse(stored) as { 
              photo?: string; 
              dob?: string;
              displayName?: string;
              bio?: string;
              favoriteGenres?: number[];
            };
            setProfilePhoto(parsed.photo || null);
            setDateOfBirth(parsed.dob || '');
            setDisplayName(parsed.displayName || '');
            setBio(parsed.bio || '');
            setFavoriteGenres(parsed.favoriteGenres || []);
          } catch (parseError) {
            console.error('❌ Failed to parse localStorage profile:', parseError);
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

  // Track unsaved changes (only after initial load)
  useEffect(() => {
    if (initialLoadComplete) {
      // Initialize the initial state when profile finishes loading
      initialStateRef.current = {
        profilePhoto: profilePhoto || '',
        dateOfBirth: dateOfBirth || '',
        displayName: displayName || '',
        bio: bio || '',
        favoriteGenres: [...favoriteGenres],
      };
      // Check if there are actual changes
      setHasUnsavedChanges(hasChanges());
    }
  }, [initialLoadComplete, profilePhoto, dateOfBirth, displayName, bio, favoriteGenres, hasChanges]);

  // Detect changes after initial load
  useEffect(() => {
    if (initialLoadComplete) {
      setHasUnsavedChanges(hasChanges());
    }
  }, [profilePhoto, dateOfBirth, displayName, bio, favoriteGenres, initialLoadComplete, hasChanges]);

  const handleSaveProfile = async (): Promise<void> => {
    setIsSaving(true);
    try {
      // Rate limiting check
      if (user?.id) {
        const rateLimitCheck = profileUpdateRateLimiter.canUpdateProfile(user.id);
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
        setDisplayName(validatedDisplayName || '');
      }
      if (sanitizedBio !== bio) {
        setBio(sanitizedBio || '');
      }
      
      // Save to localStorage (offline support)
      localStorage.setItem(profileKey, JSON.stringify({ 
        photo: profilePhoto, 
        dob: dateOfBirth,
        displayName: validatedDisplayName,
        bio: sanitizedBio,
        favoriteGenres,
      }));

      // Save to Supabase if user is authenticated
      if (user?.id) {
        await profileService.saveProfile(user.id, {
          display_name: validatedDisplayName || null,
          bio: sanitizedBio || null,
          date_of_birth: dateOfBirth || null,
          profile_photo: profilePhoto || null,
          favorite_genres: favoriteGenres,
        });
      }

      setHasUnsavedChanges(false);
      
      // Update initial state to current state
      initialStateRef.current = {
        profilePhoto: profilePhoto || '',
        dateOfBirth: dateOfBirth || '',
        displayName: validatedDisplayName || '',
        bio: sanitizedBio || '',
        favoriteGenres: [...favoriteGenres],
      };
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      
      toast({
        title: "Profile saved!",
        description: "Your profile changes have been saved and synced across your devices.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Profile saved locally, but syncing to server failed. Changes will sync when connection is restored.",
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

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and WebP images are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Use base64 for all users (stored in localStorage)
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      const validDataUrl = result
        ? /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(result)
        : false;

      if (!validDataUrl) {
        toast({
          title: 'Invalid image data',
          description: 'The selected image could not be validated.',
          variant: 'destructive',
        });
        event.target.value = '';
        return;
      }

      setProfilePhoto(result);
      setHasUnsavedChanges(true);
      
      toast({
        title: "Photo selected",
        description: "Click 'Save Changes' to update your profile photo.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = () => {
    setProfilePhoto(null);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateOfBirth(value);

    if (!value) {
      setDobError('');
      return;
    }

    const date = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();

    if (age < 13) {
      setDobError('You must be at least 13 years old');
    } else if (age > 120) {
      setDobError('Please enter a valid date');
    } else {
      setDobError('');
    }
  };

  const genres: Array<{ id: number; name: string }> = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Sci-Fi' },
    { id: 10770, name: 'TV Movie' },
    { id: 53, name: 'Thriller' },
    { id: 10752, name: 'War' },
    { id: 37, name: 'Western' },
  ];

  const toggleGenre = (genreId: number) => {
    setFavoriteGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
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
    const [year, month, day] = dateOfBirth.split('-').map(Number);
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

  const getActorAge = (birthday?: string | null): number | null => {
    if (!birthday) return null;
    const [year, month, day] = birthday.split('-').map(Number);
    if (!year || !month || !day) return null;

    const birth = new Date(year, month - 1, day, 12, 0, 0);
    if (Number.isNaN(birth.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  };

  const getTopWorks = (person: PersonDetails): string[] => {
    const cast = person.combined_credits?.cast ?? [];

    const sortedWorks = [...cast].sort((workA, workB) => {
      const popularityDiff = (workB.popularity ?? 0) - (workA.popularity ?? 0);
      if (popularityDiff !== 0) return popularityDiff;
      return (workB.vote_count ?? 0) - (workA.vote_count ?? 0);
    });

    const names = sortedWorks
      .map((work) => work.title || work.name)
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(names)).slice(0, 3);
  };

  const { data: popularPeopleDetails = [], isLoading: loadingPeople } = useQuery({
    queryKey: ['people-birthday-match', dateOfBirth, i18n.language],
    queryFn: async () => {
      if (!dateOfBirth) return [];
      try {
        // Fetch more pages to get a larger pool of actors to search from
        const pages = await Promise.all([
          getPopularPeople(1, i18n.language),
          getPopularPeople(2, i18n.language),
          getPopularPeople(3, i18n.language),
        ]);
        const people = pages.flatMap(p => p.results).slice(0, 60);
        
        const details = await Promise.all(
          people.map(p => getPersonDetails(p.id, i18n.language).catch((err) => {
            console.error(`Failed to fetch details for ${p.name}:`, err);
            return null;
          }))
        );
        
        const filtered = details.filter(Boolean) as Awaited<ReturnType<typeof getPersonDetails>>[];
        // Only keep people who have birthday data
        const withBirthday = filtered.filter(person => person?.birthday);
        return withBirthday;
      } catch (error) {
        console.error('❌ Error fetching popular people:', error);
        return [];
      }
    },
    enabled: Boolean(dateOfBirth),
  });

  const { sameAge } = useMemo(() => {
    if (!parsedDob || !popularPeopleDetails || popularPeopleDetails.length === 0) {
      if (!missingActorDataLogged.current && !actorMatchesMissingLogged) {
        missingActorDataLogged.current = true;
        actorMatchesMissingLogged = true;
      }
      return { sameAge: [] };
    }
    missingActorDataLogged.current = false;
    actorMatchesMissingLogged = false;

    const matchesAge = popularPeopleDetails
      .filter(person => {
        if (!person?.birthday || userAge === null) return false;
        try {
          // Parse birthday string (format: YYYY-MM-DD)
          const parts = person.birthday.split('-');
          if (parts.length !== 3) return false;
          const year = parseInt(parts[0], 10);
          const birthdayMonth = parseInt(parts[1], 10) - 1; // Convert to 0-indexed
          const birthdayDay = parseInt(parts[2], 10);
          if (isNaN(year) || isNaN(birthdayMonth) || isNaN(birthdayDay)) return false;
          
          const birth = new Date(year, birthdayMonth, birthdayDay, 12, 0, 0);
          if (Number.isNaN(birth.getTime())) return false;
          
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age -= 1;
          }
          return age === userAge;
        } catch {
          return false;
        }
      });

    return { sameAge: matchesAge };
  }, [parsedDob, popularPeopleDetails, userAge]);

  // Compute watch statistics from user lists
  const moviesWatched = watched.filter((item) => item.mediaType === 'movie').length;
  const showsWatched = watched.filter((item) => item.mediaType === 'tv').length;
  const totalWatchlist = watchlist.length;

  const stats = [
    { label: t('profile.moviesWatched'), value: moviesWatched, icon: Film },
    { label: t('profile.showsWatched'), value: showsWatched, icon: Tv },
    { label: t('profile.totalWatchlist'), value: totalWatchlist, icon: Bookmark },
    ...(user ? [
      { label: t('profile.showsFollowed'), value: followedShows.length, icon: Heart },
      { label: t('profile.episodesWatched'), value: watchedEpisodes.length, icon: PlayCircle },
    ] : []),
  ];

  return (
    <>
      <SEO 
        title="My Profile — CineTrekker" 
        description="View your watching statistics and preferences"
        canonical="https://cinetrekker.vercel.app/profile"
      />
    <motion.div 
      className="page-container pt-20 pb-24 md:pb-0 max-w-7xl"
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
      <>
      {/* Premium Profile Hero */}
      <motion.section variants={itemVariants} className="mb-8">
        <Card className="relative overflow-hidden border-neutral-800/50 bg-gradient-to-br from-neutral-900/90 via-neutral-900/70 to-neutral-800/90 backdrop-blur-md shadow-2xl">
          {/* Gradient Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-purple-900/10 pointer-events-none" />
          
          <CardContent className="pt-8 pb-6 relative z-10">
            <div className="flex items-start gap-6 flex-col sm:flex-row">
              {/* Avatar with Gradient Ring */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-purple-500 to-blue-500 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border-4 border-neutral-900/50">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 sm:w-14 sm:h-14 text-neutral-500" />
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="profile-photo-input"
                  onChange={handlePhotoChange}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-neutral-800/90 border border-neutral-700 hover:bg-neutral-700 hover:scale-110 transition-all shadow-lg"
                  onClick={() => document.getElementById('profile-photo-input')?.click()}
                  type="button"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              {/* User Info */}
              <div className="flex-1">
                {user ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                      {displayName || user.email?.split('@')[0]}
                    </h1>
                    <p className="text-neutral-400 mb-3">{user.email}</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t('common.appName')} {t('nav.profile')}</h1>
                    <Link to="/login">
                      <Button variant="link" className="p-0 h-auto text-primary hover:text-primary/80">
                        {t('auth.signInRequired')}
                      </Button>
                    </Link>
                  </>
                )}
                {profileCompletion < 100 && (
                  <div className="mt-4 max-w-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-400">{t('profile.profileCompletion', 'Profile Completion')}</span>
                      <span className="text-xs text-neutral-500">{Math.round(profileCompletion)}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-1.5" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Stats Bento Grid */}
      <motion.section variants={itemVariants} className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-500" />
          {t('profile.overview')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Movies Watched */}
          <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm hover:bg-neutral-900/70 transition-colors group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{moviesWatched}</p>
                  <p className="text-sm text-neutral-400">{t('profile.moviesWatched')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Ratings */}
          <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm hover:bg-neutral-900/70 transition-colors group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-red-500 fill-current" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{watched.length}</p>
                  <p className="text-sm text-neutral-400">{t('profile.totalRatings')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Watch Time */}
          <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm hover:bg-neutral-900/70 transition-colors group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{showsWatched}</p>
                  <p className="text-sm text-neutral-400">{t('profile.watchTime')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>

      {/* Profile Details */}
      <motion.section variants={itemVariants} className="mb-8">
        <h2 className="text-xl font-bold mb-4">{t('profile.profileDetails', 'Profile Details')}</h2>
        <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2 text-neutral-300">
                  <User className="w-4 h-4" />
                  {t('profile.displayName', 'Display Name')}
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('profile.displayNamePlaceholder', 'How should we call you?')}
                  maxLength={50}
                  className="bg-black/40 border-neutral-700 focus:border-red-500 focus:ring-red-500/20 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-2 text-neutral-300">
                  <CalendarDays className="w-4 h-4" />
                  {t('profile.dateOfBirth', 'Date of Birth')}
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={handleDobChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={cn(
                    "bg-black/40 border-neutral-700 focus:border-red-500 focus:ring-red-500/20 transition-colors",
                    dobError && "border-destructive focus:border-destructive"
                  )}
                />
                {dobError && <p className="text-xs text-destructive">{dobError}</p>}
                {userAge !== null && !dobError && (
                  <p className="text-xs text-neutral-500">{t('profile.currentAge', 'Current age')}: {userAge}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-neutral-300">{t('profile.bio', 'Bio')}</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('profile.bioPlaceholder', 'Tell us about your cinematic journey...')}
                className="w-full p-3 rounded-md border border-neutral-700 bg-black/40 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors min-h-[100px] resize-y"
                maxLength={500}
              />
              <p className="text-xs text-neutral-500">
                {bio.length}/500 {t('profile.characters', 'characters')}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Favorite Genres */}
      <motion.section variants={itemVariants} className="mb-8">
        <h2 className="text-xl font-bold mb-4">{t('profile.favoriteGenres', 'Favorite Genres')}</h2>
        <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <Badge
                  key={genre.id}
                  variant={favoriteGenres.includes(genre.id) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer transition-all hover:scale-105 px-3 py-1.5",
                    favoriteGenres.includes(genre.id) 
                      ? "bg-red-600 hover:bg-red-700 border-red-600" 
                      : "border-neutral-700 hover:border-red-500/50 hover:bg-neutral-800"
                  )}
                  onClick={() => toggleGenre(genre.id)}
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Actor Matches */}
      <motion.section variants={itemVariants}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          {t('profile.actorMatches')}
        </h2>
        {!dateOfBirth ? (
          <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-neutral-400">
                Add your date of birth to see actors who share your age.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1">
            <Card className="border-neutral-800/50 bg-neutral-900/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-red-500" />
                  {t('profile.sameAge')}
                </h3>
                {loadingPeople ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-lg overflow-hidden bg-neutral-800/40 animate-pulse aspect-[3/4]">
                        <div className="w-full h-full bg-neutral-800" />
                      </div>
                    ))}
                  </div>
                ) : sameAge.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No matches in popular actors.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sameAge.slice(0, 6).map((person) => {
                      const actorAge = getActorAge(person.birthday);
                      const topWorks = getTopWorks(person);

                      return (
                        <Link key={person.id} to={`/person/${person.id}`} className="group block">
                          <div className="rounded-lg border border-neutral-700 bg-neutral-800/40 p-3 hover:border-red-500/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white line-clamp-1">{person.name}</p>
                                <p className="text-xs text-neutral-400 mt-0.5">
                                  {actorAge !== null ? `Age ${actorAge}` : 'Age unavailable'}
                                </p>

                                <div className="mt-2">
                                  <p className="text-[11px] uppercase tracking-wide text-neutral-500 mb-1">Top Works</p>
                                  {topWorks.length > 0 ? (
                                    <ul className="space-y-0.5">
                                      {topWorks.map((work) => (
                                        <li key={`${person.id}-${work}`} className="text-xs text-neutral-300 line-clamp-1">
                                          • {work}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-neutral-500">No top works available</p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 w-20 sm:w-24 h-24 sm:h-28 rounded-md overflow-hidden border border-neutral-700 bg-neutral-800">
                                {person.profile_path ? (
                                  <img
                                    src={getImageUrl(person.profile_path, 'w185') || ''}
                                    alt={person.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                    <User className="w-5 h-5 text-neutral-600" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        )}
      </motion.section>

      {/* Sticky Save Bar with glass morphism */}
      <StickySaveBar
        isVisible={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSaveProfile}
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