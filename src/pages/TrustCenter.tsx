import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Accessibility,
  BarChart3,
  Cookie,
  FileText,
  HeartHandshake,
  LifeBuoy,
  Languages,
  ShieldCheck,
  Signal,
  UserRoundCheck,
} from "lucide-react";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";

type TrustLink = {
  icon: typeof ShieldCheck;
  titleKey: string;
  titleDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  href: string;
  linkKey: string;
  linkDefault: string;
};

export default function TrustCenter() {
  const { t } = useTranslation();

  const trustLinks: TrustLink[] = [
    {
      icon: ShieldCheck,
      titleKey: "trustCenter.privacyTitle",
      titleDefault: "Privacy and account controls",
      descriptionKey: "trustCenter.privacyDescription",
      descriptionDefault: "Review the data we process, your control options, and how to reach us with a privacy request.",
      href: "/privacy",
      linkKey: "trustCenter.reviewPrivacy",
      linkDefault: "Review privacy",
    },
    {
      icon: Cookie,
      titleKey: "trustCenter.cookiesTitle",
      titleDefault: "Cookies and optional measurement",
      descriptionKey: "trustCenter.cookiesDescription",
      descriptionDefault: "Learn how essential storage supports the app and how optional measurement choices are handled.",
      href: "/cookies",
      linkKey: "trustCenter.reviewCookies",
      linkDefault: "Review cookies",
    },
    {
      icon: Accessibility,
      titleKey: "trustCenter.accessibilityTitle",
      titleDefault: "Accessibility preferences",
      descriptionKey: "trustCenter.accessibilityDescription",
      descriptionDefault: "Use the accessibility settings to tailor motion, contrast, text, and interaction preferences.",
      href: "/accessibility",
      linkKey: "trustCenter.openAccessibility",
      linkDefault: "Open accessibility settings",
    },
    {
      icon: Signal,
      titleKey: "trustCenter.statusTitle",
      titleDefault: "Service status",
      descriptionKey: "trustCenter.statusDescription",
      descriptionDefault: "Check a privacy-safe view of the current service readiness and recovery guidance.",
      href: "/status",
      linkKey: "trustCenter.viewStatus",
      linkDefault: "View service status",
    },
    {
      icon: UserRoundCheck,
      titleKey: "trustCenter.termsTitle",
      titleDefault: "Terms and community expectations",
      descriptionKey: "trustCenter.termsDescription",
      descriptionDefault: "Read the service terms and the expectations that help keep CineTrekker useful and respectful.",
      href: "/terms",
      linkKey: "trustCenter.reviewTerms",
      linkDefault: "Review terms",
    },
    {
      icon: LifeBuoy,
      titleKey: "trustCenter.supportTitle",
      titleDefault: "Support and feedback",
      descriptionKey: "trustCenter.supportDescription",
      descriptionDefault: "Report a problem, share feedback, or contact the team through the supported channel.",
      href: "/feedback",
      linkKey: "trustCenter.openFeedback",
      linkDefault: "Open feedback",
    },
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("trustCenter.seoTitle", "Trust Center")}
        description={t(
          "trustCenter.seoDescription",
          "CineTrekker privacy, account controls, accessibility, service status, and support information.",
        )}
        canonical="https://cinetrekker.vercel.app/trust"
      />
      <main className="page-container pt-20 pb-24 md:pb-12">
        <div className="mx-auto max-w-5xl space-y-7">
          <header className="ct-panel-strong overflow-hidden p-6 md:p-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <HeartHandshake className="h-3.5 w-3.5" />
                {t("trustCenter.eyebrow", "Trust and transparency")}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t("trustCenter.title", "Built for a personal, controlled viewing space")}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                {t(
                  "trustCenter.intro",
                  "This center brings together the practical information you need to understand your controls, optional measurement, service availability, and support paths.",
                )}
              </p>
            </div>
          </header>

          <Card className="border-primary/20 bg-primary/[0.045]">
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">
                  {t("trustCenter.measurementTitle", "How product measurement is handled")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    "trustCenter.measurementDescription",
                    "Optional measurement is controlled by your consent settings. Product health reporting is designed to use coarse, non-identifying operational signals rather than your titles, searches, ratings, or profile details.",
                  )}
                </p>
                <Link to="/measurement" className="mt-3 inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {t("trustCenter.measurementAction", "Review measurement methodology")}
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start">
              <Languages className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">
                  {t("trustCenter.contentLanguageTitle", "Interface language and provider metadata")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    "trustCenter.contentLanguageDescription",
                    "CineTrekker’s interface is translated in every supported language. Movie and TV titles, descriptions, credits, and release details come from content providers and may remain in their original or provider-available language.",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <section aria-label={t("trustCenter.resourcesLabel", "Trust resources")} className="grid gap-4 md:grid-cols-2">
            {trustLinks.map(({ icon: Icon, titleKey, titleDefault, descriptionKey, descriptionDefault, href, linkKey, linkDefault }) => (
              <Card key={href} className="group border-border/60 bg-card transition-colors hover:border-primary/30">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-foreground">{t(titleKey, titleDefault)}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t(descriptionKey, descriptionDefault)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={href}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <FileText className="h-4 w-4" />
                    {t(linkKey, linkDefault)}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
