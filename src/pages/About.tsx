import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Info, Sparkles, Database, ShieldCheck, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FAQSection } from "@/components/FAQSection";
import { InternalLinksSection } from "@/components/InternalLinksSection";
import {
  buildCanonicalUrl,
  toBreadcrumbJsonLd,
  toFaqJsonLd,
} from "@/lib/seo";
import { safeT } from "@/lib/i18n";

export default function About() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const faqItems = [
    {
      question: safeT(
        t,
        "about.faq1Question",
        "What makes CineTrekker different from a basic watchlist app?",
      ),
      answer: safeT(
        t,
        "about.faq1Answer",
        "CineTrekker combines movie tracker tools, richer detail pages, follow features, notifications, and structured discovery views so you can move from browsing to planning without a disconnected workflow.",
      ),
    },
    {
      question: safeT(t, "about.faq2Question", "Who is CineTrekker for?"),
      answer: safeT(
        t,
        "about.faq2Answer",
        "It is designed for casual viewers, list builders, series followers, and film fans who want a faster way to track movies and TV shows across devices.",
      ),
    },
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <div className="page-container pt-20 pb-24 md:pb-10">
      <SEO
        title={t("about.seoTitle", "About CineTrekker Movie Tracker")}
        description={t(
          "about.seoDescription",
          "Learn what CineTrekker is, how the movie tracker works, and how watchlists, recommendations, and follow features fit together.",
        )}
        canonical={buildCanonicalUrl("/about")}
        keywords={t(
          "about.keywords",
          "about movie tracker, CineTrekker app, watchlist platform, track movies",
        )}
        jsonLd={[
          toBreadcrumbJsonLd([
            { name: t("nav.home", "Home"), path: "/" },
            { name: t("about.pageTitle", "About"), path: "/about" },
          ]),
          toFaqJsonLd(faqItems),
        ]}
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="ct-panel-strong p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="section-title mb-0">
                {safeT(t, "about.title", "About CineTrekker")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("common.updated", "Updated")} {currentDate}
              </p>
              <p className="max-w-2xl text-muted-foreground">
                {safeT(
                  t,
                  "about.intro",
                  "CineTrekker is a movie tracker and TV companion for discovering what to watch, organizing your lists, and tracking your progress over time.",
                )}
              </p>
            </div>
          </div>
        </header>

        <section className="ct-panel p-6 md:p-7">
          <h2 className="text-2xl font-bold text-foreground">
            {safeT(
              t,
              "about.howItWorksTitle",
              "How the movie tracker experience works",
            )}
          </h2>
          <div className="editorial-copy mt-4 space-y-4 text-muted-foreground">
            <p>
              {safeT(
                t,
                "about.howItWorksBody1",
                "CineTrekker is built to reduce the friction between discovering a title and remembering to come back to it later. The app combines search, watchlist management, watched status, follow tools, and recommendation surfaces so your browsing session produces a useful record instead of disappearing when the tab closes.",
              )}
            </p>
            <p>
              {safeT(
                t,
                "about.howItWorksBody2",
                "That matters for both users and discovery systems. Human visitors get a cleaner flow with mobile-friendly navigation, while search engines and AI assistants get semantic content, structured data, and stable internal links that explain what each page is about. The goal is a movie tracker that feels lightweight in the browser but still communicates clearly to modern search and AI pipelines.",
              )}
            </p>
          </div>
        </section>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              {safeT(t, "about.whatYouCanDo", "What You Can Do")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>{safeT(t, "about.feature1", "Search and explore trending, popular, upcoming, and top-rated titles.")}</li>
              <li>{safeT(t, "about.feature2", "Create watchlists, mark items as watched, and rate what you finish.")}</li>
              <li>{safeT(t, "about.feature3", "Review your watch history and personal viewing insights.")}</li>
              <li>{safeT(t, "about.feature4", "Adjust theme, accessibility, and content safety preferences.")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="h-5 w-5 text-primary" />
              {safeT(t, "about.dataSources", "Data Sources and Accounts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              {safeT(
                t,
                "about.dataSourcesDesc",
                "Movie and TV metadata, artwork, and related information are provided by TMDB. If you create an account, your lists and preferences are saved so your experience is available across sessions and devices.",
              )}
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-primary/15 inline-flex items-center justify-center text-[10px] font-bold text-primary">T</span>
                <span>
                  <a
                    href="https://www.themoviedb.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    The Movie Database (TMDB)
                  </a>
                  {safeT(t, "about.tmdbCredit", " — primary source for movie and TV metadata, images, cast, crew, ratings, and trailers. This product uses the TMDB API but is not endorsed or certified by TMDB.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-primary/15 inline-flex items-center justify-center text-[10px] font-bold text-primary">O</span>
                <span>
                  <a
                    href="https://www.omdbapi.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    OMDb API
                  </a>
                  {safeT(t, "about.omdbCredit", " — supplemental ratings data including IMDb, Rotten Tomatoes, and Metacritic scores. OMDb data is © 2013–present by Brian Fritz.")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-primary/15 inline-flex items-center justify-center text-[10px] font-bold text-primary">V</span>
                <span>
                  <a
                    href="https://www.tvmaze.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    TVmaze
                  </a>
                  {safeT(t, "about.tvmazeCredit", " — TV episode air dates and schedule data. TV schedule and episode data is provided by TVmaze.com.")}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Cpu className="h-5 w-5 text-primary" />
              {safeT(t, "about.techStack", "Technology Stack")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {safeT(
              t,
              "about.techStackDesc",
              "CineTrekker runs on a React + TypeScript front end with Vite, React Query for data orchestration, Supabase for auth and account data, and secure serverless APIs for protected integrations like recommendations, feedback, notifications, and content metadata proxying.",
            )}
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {safeT(t, "about.productGoal", "Product Goal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {safeT(
              t,
              "about.productGoalDesc",
              "CineTrekker is built to make movie and TV discovery simple, structured, and personal while keeping controls clear and respectful of user preferences.",
            )}
          </CardContent>
        </Card>

        <InternalLinksSection
          title={safeT(t, "about.relatedPages", "Related pages")}
          links={[
            {
              to: "/search",
              title: safeT(t, "about.searchMoviesAndSeries", "Search movies and series"),
              description: safeT(
                t,
                "about.searchMoviesAndSeriesDesc",
                "Use the main movie tracker search to discover titles with filters and sorting.",
              ),
            },
            {
              to: "/trending",
              title: safeT(t, "about.trendingPicks", "Trending picks"),
              description: safeT(
                t,
                "about.trendingPicksDesc",
                "Browse the fastest-moving titles before adding them to your watchlist.",
              ),
            },
            {
              to: "/privacy",
              title: safeT(t, "about.privacyPolicy", "Privacy policy"),
              description: safeT(
                t,
                "about.privacyPolicyDesc",
                "Review how account and preference data is handled across sessions.",
              ),
            },
          ]}
        />

        <FAQSection title={safeT(t, "about.faqTitle", "About CineTrekker FAQs")} items={faqItems} />
      </div>
      </div>
    </div>
  );
}

