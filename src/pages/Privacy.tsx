import { useTranslation } from 'react-i18next';
import SEO from '@/components/SEO';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Privacy() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <SEO 
        title="Privacy Policy — CineTrekker" 
        description="CineTrekker privacy policy and data handling practices"
        canonical="https://cinetrekker.vercel.app/privacy"
      />
      <div className="page-container pt-20 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t('privacy.title')}</h1>
          <p className="text-muted-foreground">{t('privacy.lastUpdated', { date: currentDate })}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('privacy.dataCollected')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{t('privacy.dataCollectedDesc')}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t('privacy.dataList.email')}</li>
              <li>{t('privacy.dataList.watchlist')}</li>
              <li>{t('privacy.dataList.ratings')}</li>
              <li>{t('privacy.dataList.preferences')}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('privacy.dataUsage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('privacy.dataUsageDesc')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('privacy.dataSharing')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('privacy.dataSharingDesc')}</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{t('privacy.contact')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('privacy.contactDesc')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
