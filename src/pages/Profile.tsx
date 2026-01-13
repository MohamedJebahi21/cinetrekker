import { useTranslation } from 'react-i18next';
import { User, Film, Tv, Bookmark, Globe, Heart, PlayCircle } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowedShows, useWatchedEpisodes } from '@/hooks/useFollowedShows';
import { languages } from '@/i18n';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { watched, watchlist } = useUserLists();
  const { user } = useAuth();
  const { followedShows } = useFollowedShows();
  const { watchedEpisodes } = useWatchedEpisodes();

  const moviesWatched = watched.filter(w => w.mediaType === 'movie').length;
  const showsWatched = watched.filter(w => w.mediaType === 'tv').length;
  const totalWatchlist = watchlist.length;

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
  };

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
    <div className="page-container max-w-4xl">
      <h1 className="section-title">{t('profile.title')}</h1>

      {/* User Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center">
          <User className="w-10 h-10 text-primary-foreground" />
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
              <Link to="/auth">
                <Button variant="link" className="p-0 h-auto text-primary">
                  {t('auth.signInRequired')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

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

      {/* Settings */}
      <section>
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
    </div>
  );
}
