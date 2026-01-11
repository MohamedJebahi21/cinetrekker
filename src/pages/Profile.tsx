import { useTranslation } from 'react-i18next';
import { User, Film, Tv, Bookmark, Globe } from 'lucide-react';
import { useUserLists } from '@/contexts/UserListsContext';
import { languages } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { watched, watchlist } = useUserLists();

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
          <h2 className="text-xl font-semibold">{t('common.appName')} {t('nav.profile')}</h2>
          <p className="text-muted-foreground">{t('home.hero.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('profile.stats')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
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
