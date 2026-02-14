import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Track actor match missing-data logging across renders (and StrictMode double-mount)
let actorMatchesMissingLogged = false;
import { useQuery } from '@tanstack/react-query';
import { User, Film, Tv, Bookmark, Globe, Heart, PlayCircle, CalendarDays, Camera, Sparkles, Search } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowedShows, useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { languages } from '@/i18n';
import { Link } from 'react-router-dom';
import { getImageUrl, getPersonDetails, getPopularPeople } from '@/services/tmdb';
import { profileService, type UserProfile } from '@/services/profile';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';

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
  const [settings, setSettings] = useState({
    publicProfile: false,
    showWatchlist: true,
    showStats: true,
    allowRecommendations: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const missingActorDataLogged = useRef(false);

  // Load profile from Supabase (with localStorage fallback)
  useEffect(() => {
    let subscription: { unsubscribe: () => Promise<void> | void } | null = null;
    let isMounted = true;

    const loadProfile = async () => {
      if (!isMounted) return;
      
      setIsLoadingProfile(true);
      
      try {
        if (user?.id) {
          console.log('📥 Loading profile from Supabase for user:', user.id);
          
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
                photo?: string; 
                dob?: string;
                displayName?: string;
                bio?: string;
                favoriteGenres?: number[];
                settings?: typeof settings;
              };
              setProfilePhoto(parsed.photo || null);
              setDateOfBirth(parsed.dob || '');
              setDisplayName(parsed.displayName || '');
              setBio(parsed.bio || '');
              setFavoriteGenres(parsed.favoriteGenres || []);
              setSettings(parsed.settings || settings);
            }
          }

          // Subscribe to real-time updates (only if component is still mounted)
          if (isMounted) {
            subscription = profileService.subscribeToProfile(user.id, (updatedProfile) => {
              if (!isMounted) return;
              
              console.log('🔄 Profile updated in real-time:', updatedProfile);
              setProfilePhoto(updatedProfile.profile_photo || null);
              setDateOfBirth(updatedProfile.date_of_birth || '');
              setDisplayName(updatedProfile.display_name || '');
              setBio(updatedProfile.bio || '');
              setFavoriteGenres(updatedProfile.favorite_genres || []);
              setSettings({
                publicProfile: updatedProfile.is_public,
                showWatchlist: updatedProfile.show_watchlist,
                showStats: updatedProfile.show_stats,
                allowRecommendations: updatedProfile.allow_recommendations,
              });
            });
          }
        } else {
          // Guest user - load from localStorage only
          console.log('👤 Guest user detected, loading from localStorage');
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
            settings?: typeof settings;
          };
          setProfilePhoto(parsed.photo || null);
          setDateOfBirth(parsed.dob || '');
          setDisplayName(parsed.displayName || '');
          setBio(parsed.bio || '');
          setFavoriteGenres(parsed.favoriteGenres || []);
          setSettings(parsed.settings || settings);
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
              settings?: typeof settings;
            };
            setProfilePhoto(parsed.photo || null);
            setDateOfBirth(parsed.dob || '');
            setDisplayName(parsed.displayName || '');
            setBio(parsed.bio || '');
            setFavoriteGenres(parsed.favoriteGenres || []);
            setSettings(parsed.settings || settings);
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
      setHasUnsavedChanges(true);
    }
  }, [profilePhoto, dateOfBirth, displayName, bio, favoriteGenres, settings, initialLoadComplete]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage (offline support)
      localStorage.setItem(profileKey, JSON.stringify({ 
        photo: profilePhoto, 
        dob: dateOfBirth,
        displayName,
        bio,
        favoriteGenres,
        settings
      }));

      // Save to Supabase if user is authenticated
      if (user?.id) {
        await profileService.saveProfile(user.id, {
          display_name: displayName || null,
          bio: bio || null,
          date_of_birth: dateOfBirth || null,
          profile_photo: profilePhoto || null,
          favorite_genres: favoriteGenres,
          is_public: settings.publicProfile,
          show_watchlist: settings.showWatchlist,
          show_stats: settings.showStats,
          allow_recommendations: settings.allowRecommendations,
        });
      }

      setHasUnsavedChanges(false);
      
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

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const genres = [
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

  const { data: popularPeopleDetails = [], isLoading: loadingPeople } = useQuery({
    queryKey: ['people-birthday-match', dateOfBirth, i18n.language],
    queryFn: async () => {
      if (!dateOfBirth) return [];
      try {
        console.log('🔍 Fetching popular people for birthday match...');
        // Fetch more pages to get a larger pool of actors to search from
        const pages = await Promise.all([
          getPopularPeople(1, i18n.language),
          getPopularPeople(2, i18n.language),
          getPopularPeople(3, i18n.language),
        ]);
        const people = pages.flatMap(p => p.results).slice(0, 60);
        console.log(`📋 Fetched ${people.length} people from 3 pages`);
        
        const details = await Promise.all(
          people.map(p => getPersonDetails(p.id, i18n.language).catch((err) => {
            console.warn(`Failed to fetch details for ${p.name}:`, err);
            return null;
          }))
        );
        console.log(`✅ Got details for ${details.filter(Boolean).length} people`);
        
        const filtered = details.filter(Boolean) as Awaited<ReturnType<typeof getPersonDetails>>[];
        // Only keep people who have birthday data
        const withBirthday = filtered.filter(person => person?.birthday);
        console.log(`🎂 ${withBirthday.length} people have birthday data`, withBirthday.map(p => ({name: p.name, birthday: p.birthday})));
        return withBirthday;
      } catch (error) {
        console.error('❌ Error fetching popular people:', error);
        return [];
      }
    },
    enabled: Boolean(dateOfBirth),
  });

  const { sameBirthday, sameAge } = useMemo(() => {
    if (!parsedDob || !popularPeopleDetails || popularPeopleDetails.length === 0) {
      if (!missingActorDataLogged.current && !actorMatchesMissingLogged) {
        console.log('⚠️ Actor Matches: missing data', { hasDate: !!parsedDob, hasPeople: popularPeopleDetails?.length > 0 });
        missingActorDataLogged.current = true;
        actorMatchesMissingLogged = true;
      }
      return { sameBirthday: [], sameAge: [] };
    }
    missingActorDataLogged.current = false;
    actorMatchesMissingLogged = false;
    const month = parsedDob.getMonth();
    const day = parsedDob.getDate();
    console.log(`👤 User birthday: ${month + 1}/${day}, Age: ${userAge}`);

    const matchesBirthday = popularPeopleDetails
      .filter(person => {
        if (!person?.birthday) return false;
        try {
          // Parse birthday string (format: YYYY-MM-DD)
          const parts = person.birthday.split('-');
          if (parts.length !== 3) return false;
          const birthdayMonth = parseInt(parts[1], 10) - 1; // Convert to 0-indexed
          const birthdayDay = parseInt(parts[2], 10);
          if (isNaN(birthdayMonth) || isNaN(birthdayDay)) return false;
          const match = birthdayMonth === month && birthdayDay === day;
          if (match) console.log(`🎯 Birthday match: ${person.name} (${parts[1]}/${parts[2]})`);
          return match;
        } catch {
          return false;
        }
      });
    console.log(`🎂 Found ${matchesBirthday.length} birthday matches`);

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
          const match = age === userAge;
          if (match) console.log(`🎯 Age match: ${person.name} (age ${age})`);
          return match;
        } catch {
          return false;
        }
      });
    console.log(`🎂 Found ${matchesAge.length} age matches`);

    return { sameBirthday: matchesBirthday, sameAge: matchesAge };
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
    <div className="page-container pt-20 max-w-4xl">
      <h1 className="section-title">{t('profile.title')}</h1>

      {isLoadingProfile && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoadingProfile && (
      <>
      {/* Profile Completion Progress */}
      {profileCompletion < 100 && (
        <Card className="glass-card mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('profile.profileCompletion', 'Profile Completion')}</span>
              <span className="text-sm text-muted-foreground">{Math.round(profileCompletion)}%</span>
            </div>
            <Progress value={profileCompletion} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* User Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden">
          {profilePhoto ? (
            <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-primary-foreground" />
          )}
        </div>
        <div>
          {user ? (
            <>
              <h2 className="text-xl font-semibold">{user.email?.split('@')[0]}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{t('common.appName')} {t('nav.profile')}</h2>
              <Link to="/login">
                <Button variant="link" className="p-0 h-auto text-primary">
                  {t('auth.signInRequired')}
                </Button>
              </Link>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="profile-photo-input"
              onChange={handlePhotoChange}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => document.getElementById('profile-photo-input')?.click()}
              type="button"
            >
              <Camera className="w-4 h-4" />
              {profilePhoto ? 'Change Photo' : 'Add Photo'}
            </Button>
            {profilePhoto && (
              <Button variant="ghost" size="sm" onClick={handlePhotoRemove}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.profileDetails', 'Profile Details')}</h2>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {t('profile.dateOfBirth', 'Date of Birth')}
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={handleDobChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={dobError ? 'border-destructive' : ''}
                />
                {dobError && <p className="text-xs text-destructive">{dobError}</p>}
                {userAge !== null && !dobError && (
                  <p className="text-xs text-muted-foreground">{t('profile.currentAge', 'Current age')}: {userAge}</p>
                )}
              </div>
            </div>
            
            {/* Save Button */}
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* About Section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.about', 'About')}</h2>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <Label htmlFor="bio">{t('profile.bio', 'Bio')}</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile.bioPlaceholder', 'Tell us about your cinematic journey...')}
              className="w-full mt-2 p-3 rounded-md border border-border bg-background min-h-[100px] resize-y"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bio.length}/500 {t('profile.characters', 'characters')}
            </p>
            
            {/* Save Button */}
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Favorite Genres */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.favoriteGenres', 'Favorite Genres')}</h2>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {genres.map(genre => (
                <Badge
                  key={genre.id}
                  variant={favoriteGenres.includes(genre.id) ? 'default' : 'outline'}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => toggleGenre(genre.id)}
                >
                  {genre.name}
                </Badge>
              ))}
            </div>
            
            {/* Save Button */}
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.stats')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Privacy Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.privacySettings', 'Privacy Settings')}</h2>
        <Card className="glass-card">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="publicProfile" className="cursor-pointer">
                  {t('profile.publicProfile', 'Public Profile')}
                </Label>
                <p className="text-xs text-muted-foreground">
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
              <div>
                <Label htmlFor="showWatchlist" className="cursor-pointer">
                  {t('profile.showWatchlist', 'Show Watchlist')}
                </Label>
                <p className="text-xs text-muted-foreground">
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
              <div>
                <Label htmlFor="showStats" className="cursor-pointer">
                  {t('profile.showStats', 'Show Statistics')}
                </Label>
                <p className="text-xs text-muted-foreground">
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
            
            {/* Save Button */}
            <div className="mt-6 flex justify-end gap-2">
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving || !hasUnsavedChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.settings')}</h2>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span>{t('profile.language')}</span>
              </div>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]">
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
      </section>

      {/* Actor Matches */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Actor Matches
        </h2>
        {!dateOfBirth ? (
          <Card className="glass-card">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Add your date of birth to see actors who share your birthday or age.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Same Birthday</h3>
                {loadingPeople ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-lg overflow-hidden bg-muted/40 animate-pulse">
                        <div className="w-full h-32 bg-muted" />
                        <div className="h-8 bg-muted mt-2 mx-2 mb-2 rounded" />
                      </div>
                    ))}
                  </div>
                ) : sameBirthday.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No matches found in popular actors.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sameBirthday.slice(0, 6).map((person) => (
                      <Link key={person.id} to={`/person/${person.id}`} className="group">
                        <div className="rounded-lg overflow-hidden bg-muted/40">
                          {person.profile_path ? (
                            <img
                              src={getImageUrl(person.profile_path, 'w185') || ''}
                              alt={person.name}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center bg-muted">
                              <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs mt-2 line-clamp-2">{person.name}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Same Age</h3>
                {loadingPeople ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-lg overflow-hidden bg-muted/40 animate-pulse">
                        <div className="w-full h-32 bg-muted" />
                        <div className="h-8 bg-muted mt-2 mx-2 mb-2 rounded" />
                      </div>
                    ))}
                  </div>
                ) : sameAge.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No matches found in popular actors.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sameAge.slice(0, 6).map((person) => (
                      <Link key={person.id} to={`/person/${person.id}`} className="group">
                        <div className="rounded-lg overflow-hidden bg-muted/40">
                          {person.profile_path ? (
                            <img
                              src={getImageUrl(person.profile_path, 'w185') || ''}
                              alt={person.name}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-32 flex items-center justify-center bg-muted">
                              <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs mt-2 line-clamp-2">{person.name}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
      </>
      )}
    </div>
    </>
  );
}
