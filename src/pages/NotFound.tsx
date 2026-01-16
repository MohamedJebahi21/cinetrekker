import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-container flex flex-col items-center justify-center py-20">
      <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
      <p className="mb-6 text-xl text-muted-foreground">{t('common.error')}</p>
      <Link 
        to="/" 
        className="text-primary underline hover:text-primary/90 transition-colors"
      >
        {t('nav.home')}
      </Link>
    </div>
  );
};

export default NotFound;
