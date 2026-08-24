import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BadgeCheck, BarChart3, Handshake, ShieldAlert, Tags } from "lucide-react";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Partnerships() {
  const { t } = useTranslation();

  const principles = [
    {
      icon: Tags,
      title: t("partnerships.labelingTitle", "Clear sponsorship labeling"),
      copy: t("partnerships.labelingCopy", "If a commercial placement is ever introduced, it will be visibly labeled. CineTrekker will not present sponsored material as an independent recommendation."),
    },
    {
      icon: ShieldAlert,
      title: t("partnerships.suitabilityTitle", "Suitability before placement"),
      copy: t("partnerships.suitabilityCopy", "Potential partners and creative would be reviewed for user fit, lawful use, and a respectful viewing-tracker experience before any commitment."),
    },
    {
      icon: Handshake,
      title: t("partnerships.placementTitle", "Calm, contextual placement"),
      copy: t("partnerships.placementCopy", "Any future placement must avoid interrupting core actions such as tracking, ratings, privacy controls, and account management."),
    },
    {
      icon: BarChart3,
      title: t("partnerships.reportingTitle", "Method-first reporting"),
      copy: t("partnerships.reportingCopy", "Any campaign reporting would describe its consent and coverage limitations, use aggregate measurement where available, and never guarantee reach, conversions, or outcomes."),
    },
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("partnerships.seoTitle", "Partnership principles")}
        description={t("partnerships.seoDescription", "CineTrekker’s transparent principles for potential future sponsorships and commercial partnerships.")}
        canonical="https://cinetrekker.vercel.app/partnerships"
      />
      <main className="page-container pt-20 pb-24 md:pb-12">
        <div className="mx-auto max-w-5xl space-y-7">
          <header className="ct-panel-strong p-6 md:p-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("partnerships.eyebrow", "Future partnership principles")}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("partnerships.title", "A transparent standard for any future sponsorship")}
              </h1>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                {t("partnerships.intro", "CineTrekker does not use this page to offer advertising or promise audience outcomes. It records the principles that would govern any future commercial conversation before a partnership is considered.")}
              </p>
            </div>
          </header>

          <Card className="border-primary/20 bg-primary/[0.045]">
            <CardContent className="flex gap-4 py-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">{t("partnerships.currentStatusTitle", "No active sponsorship program")}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("partnerships.currentStatusCopy", "No advertisements, audience guarantees, or partner commitments are enabled through CineTrekker today. Any future program requires accountable review and clear user-facing disclosure.")}
                </p>
              </div>
            </CardContent>
          </Card>

          <section aria-label={t("partnerships.principlesLabel", "Partnership principles")} className="grid gap-4 md:grid-cols-2">
            {principles.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="border-border/60 bg-card">
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("partnerships.contactCopy", "For a non-binding conversation, use the feedback channel. Commercial governance and any final terms remain subject to qualified review.")}
            </p>
            <Button asChild variant="outline" className="min-h-11 shrink-0 rounded-xl">
              <Link to="/feedback">{t("partnerships.contactAction", "Contact CineTrekker")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
