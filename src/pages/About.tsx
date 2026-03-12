import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Info, Sparkles, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function About() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-container pt-20 pb-24 md:pb-10">
      <SEO
        title={t("about.seoTitle", "About - CineTrekker")}
        description={t(
          "about.seoDescription",
          "Learn what CineTrekker is, who it is for, and how recommendations and tracking work.",
        )}
        canonical="https://cinetrekker.vercel.app/about"
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="rounded-2xl border border-[color:hsl(var(--border))] bg-[var(--bg-card)] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                {t("about.title", "About CineTrekker")}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {t("common.updated", "Updated")} {currentDate}
              </p>
              <p className="max-w-2xl text-[var(--text-secondary)]">
                {t(
                  "about.intro",
                  "CineTrekker is a movie and TV companion for discovering what to watch, organizing your lists, and tracking your progress over time.",
                )}
              </p>
            </div>
          </div>
        </header>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Sparkles className="h-5 w-5 text-primary" />
              {t("about.whatYouCanDo", "What You Can Do")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>{t("about.feature1", "Search and explore trending, popular, upcoming, and top-rated titles.")}</li>
              <li>{t("about.feature2", "Create watchlists, mark items as watched, and rate what you finish.")}</li>
              <li>{t("about.feature3", "Review your watch history and personal viewing insights.")}</li>
              <li>{t("about.feature4", "Adjust theme, accessibility, and content safety preferences.")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Database className="h-5 w-5 text-primary" />
              {t("about.dataSources", "Data Sources and Accounts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">
            {t(
              "about.dataSourcesDesc",
              "Movie and TV metadata, artwork, and related information are provided by TMDB. If you create an account, your lists and preferences are saved so your experience is available across sessions and devices.",
            )}
          </CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("about.productGoal", "Product Goal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">
            {t(
              "about.productGoalDesc",
              "CineTrekker is built to make movie and TV discovery simple, structured, and personal while keeping controls clear and respectful of user preferences.",
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

