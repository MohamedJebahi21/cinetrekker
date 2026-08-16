import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";

import { UnifiedNav } from "@/components/UnifiedNav";
import { CineQuestHub } from "@/components/quests/CineQuestHub";
import { SEO } from "@/components/SEO";

export default function Quests() {
  const { t } = useTranslation();

  return (
    <>
      <SEO title={t("quests.pageTitle", "Monthly Cine-Quests — CineTrekker")} description={t("quests.pageDescription", "Complete monthly watch challenges and unlock cinematic badges on CineTrekker.")} />
      <UnifiedNav />
      <main className="page-container min-h-screen pb-28 pt-24 md:pb-16">
        <div className="mx-auto max-w-6xl">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ArrowLeft className="h-4 w-4" />
            {t("common.goHome", "Go home")}
          </Link>
          <div className="mb-8 flex items-end gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary"><Trophy className="h-7 w-7" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("quests.eyebrow", "Monthly quests")}</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground md:text-5xl">{t("quests.pageHeading", "Cinematic missions")}</h1>
            </div>
          </div>
          <CineQuestHub />
        </div>
      </main>
    </>
  );
}
