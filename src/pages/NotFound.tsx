import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Film } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO 
        title="Page Not Found — CineTrekker" 
        description="The page you're looking for doesn't exist"
      />

      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="page-container text-center py-24">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-6 shadow-glow">
            <Film className="w-12 h-12 text-primary" />
          </div>
          <h1 className="mb-4 text-6xl font-bold text-primary heading-cinematic">404</h1>
          <p className="mb-4 text-lg text-muted-foreground">{t('notFound.message', "We couldn't find that page.")}</p>
          <p className="mb-8 text-sm text-muted-foreground/70">{t('notFound.help', "Try returning home or using the search to find what you're looking for.")}</p>

          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">{t('notFound.returnHome', 'Return to Home')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/search">{t('notFound.search', 'Search')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
