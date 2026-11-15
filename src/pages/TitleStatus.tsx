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
        robots="noindex,follow"
      />

      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="page-container py-24 pb-24 text-center md:pb-0">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/60 text-primary">
            <Film className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="mb-3 inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            404 Error
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("status.heading", "Page not found")}
          </h1>
          <p className="mx-auto mb-2 max-w-md text-base text-muted-foreground">
            {t("status.message", "The page you are looking for doesn't exist or has been moved.")}
          </p>
          <p className="mx-auto mb-8 max-w-md text-xs text-muted-foreground/70">
            {t("status.help", "Try returning home, browsing Discover, or using search.")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="default" className="min-h-10 rounded-xl px-5 font-semibold">
              <Link to="/">{t("notFound.returnHome", "Return home")}</Link>
            </Button>
            <Button asChild size="default" variant="outline" className="min-h-10 rounded-xl border-border/60 bg-card/40 px-5 font-semibold">
              <Link to="/discover">{t("nav.discover", "Discover")}</Link>
            </Button>
            <Button asChild size="default" variant="outline" className="min-h-10 rounded-xl border-border/60 bg-card/40 px-5 font-semibold">
              <Link to="/search">{t("notFound.search", "Search")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TitleStatus;
