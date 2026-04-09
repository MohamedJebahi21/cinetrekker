import { Link, Navigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Film } from "lucide-react";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const TitleStatus = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const label = "Not Found";
  const normalizedLegacyPath = useMemo(() => {
    const match = location.pathname.match(/^\/(\d+)\/(movie|tv)\/?$/);
    if (!match) return null;

    const [, id, mediaType] = match;
    return `/${mediaType}/${id}`;
  }, [location.pathname]);

  if (normalizedLegacyPath) {
    return <Navigate to={normalizedLegacyPath} replace />;
  }

  return (
    <>
      <SEO
        title={`${label} - CineTrekker`}
        description="The page you requested could not be found."
      />

      <div className="flex min-h-screen items-center justify-center">
        <div className="page-container py-24 pb-24 text-center md:pb-0">
          <div className="mb-6 inline-flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 shadow-glow">
            <Film className="h-12 w-12 text-primary" />
          </div>
          <h1 className="heading-cinematic mb-4 text-6xl font-bold text-primary">
            404
          </h1>
          <p className="mb-4 text-lg text-muted-foreground">
            {t("status.message", "This scene was cut from the final edit.")}
          </p>
          <p className="mb-8 text-sm text-muted-foreground/70">
            {t("status.help", "Try returning home, browsing Discover, or using search.")}
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">{t("notFound.returnHome", "Return to Home")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/discover">{t("nav.discover", "Discover")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/search">{t("notFound.search", "Search")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TitleStatus;
