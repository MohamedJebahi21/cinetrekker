import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BarChart3, CheckCircle2, CircleX, EyeOff, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";

function isDoNotTrackEnabled() {
  return typeof navigator !== "undefined" && ["1", "yes"].includes(navigator.doNotTrack?.toLowerCase() ?? "");
}

export default function Measurement() {
  const { t } = useTranslation();
  const { hasAcceptedConsent } = useCookieConsent();
  const doNotTrack = useMemo(isDoNotTrackEnabled, []);
  const measurementEnabled = hasAcceptedConsent && !doNotTrack;

  const methods = [
    t("measurement.methodActivation", "Activation: aggregate milestones such as starting an account, saving a first title, or completing onboarding."),
    t("measurement.methodAdoption", "Feature adoption: coarse actions such as opening a section or reviewing history, without title, profile, or search details."),
    t("measurement.methodReliability", "Reliability and performance: coarse error categories and Core Web Vitals buckets used to identify product health issues."),
    t("measurement.methodNotifications", "Notification effectiveness: coarse inbox actions, never notification text, target titles, or account identifiers."),
  ];

  return (
    <div className="ct-page-shell min-h-screen">
      <SEO
        title={t("measurement.seoTitle", "Measurement methodology")}
        description={t("measurement.seoDescription", "How CineTrekker handles consent-gated, privacy-preserving aggregate product measurement.")}
        canonical="https://cinetrekker.vercel.app/measurement"
      />
      <main className="page-container pt-20 pb-24 md:pb-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="ct-panel-strong p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary"><BarChart3 className="h-6 w-6" /></div>
              <div>
                <p className="ct-kicker mb-1">{t("measurement.eyebrow", "Privacy-preserving measurement")}</p>
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t("measurement.title", "How CineTrekker measures product health")}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{t("measurement.intro", "This page explains the limited product signals CineTrekker may use to improve the service. It does not describe or expose your personal viewing history.")}</p>
              </div>
            </div>
          </header>

          <Card className="border-primary/20 bg-primary/[0.045]">
            <CardContent className="flex gap-4 py-5">
              {measurementEnabled ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
              <div>
                <h2 className="font-semibold text-foreground">{t("measurement.diagnosticsTitle", "Your local measurement status")}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {measurementEnabled
                    ? t("measurement.diagnosticsEnabled", "Optional measurement is currently enabled on this device because consent is accepted and Do Not Track is not active.")
                    : doNotTrack
                      ? t("measurement.diagnosticsDnt", "Optional measurement is disabled on this device because Do Not Track is active.")
                      : t("measurement.diagnosticsConsent", "Optional measurement is disabled on this device until you accept non-essential measurement.")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck className="h-5 w-5 text-primary" />{t("measurement.collectTitle", "What may be measured")}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {methods.map((method) => <li key={method} className="flex gap-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />{method}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card">
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-semibold text-foreground"><CircleX className="h-5 w-5 text-primary" />{t("measurement.exclusionsTitle", "What this measurement does not include")}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("measurement.exclusionsCopy", "The contract excludes title names and IDs, search text, ratings, free-form messages, email addresses, user IDs, and profile details. Operational incident reporting likewise accepts only allowlisted coarse categories.")}</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="min-h-11 rounded-xl"><Link to="/cookies">{t("measurement.reviewCookies", "Review cookie choices")}</Link></Button>
            <Button asChild variant="ghost" className="min-h-11 rounded-xl"><Link to="/trust">{t("measurement.backToTrust", "Back to Trust Center")}</Link></Button>
          </div>
        </div>
      </main>
    </div>
  );
}
