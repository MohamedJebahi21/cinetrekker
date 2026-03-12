import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Scale, UserCheck, ShieldAlert, RefreshCcw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-container pt-20 pb-24 md:pb-10">
      <SEO
        title={t("terms.seoTitle", "Terms of Service - CineTrekker")}
        description={t(
          "terms.seoDescription",
          "Terms governing use of CineTrekker, including acceptable use and account responsibilities.",
        )}
        canonical="https://cinetrekker.vercel.app/terms"
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="rounded-2xl border border-[color:hsl(var(--border))] bg-[var(--bg-card)] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t("terms.title", "Terms of Service")}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{t("common.updated", "Updated")} {currentDate}</p>
              <p className="max-w-2xl text-[var(--text-secondary)]">
                {t("terms.intro", "By using CineTrekker, you agree to these terms. If you do not agree, please do not use the service.")}
              </p>
            </div>
          </div>
        </header>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><ShieldAlert className="h-5 w-5 text-primary" />{t("terms.acceptableUse", "Acceptable Use")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("terms.acceptableUseDesc", "You agree not to misuse CineTrekker, attempt unauthorized access, interfere with platform operation, or use the service for unlawful activity.")}</CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><UserCheck className="h-5 w-5 text-primary" />{t("terms.accounts", "Accounts and Security")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("terms.accountsDesc", "You are responsible for account credentials and activity under your account. Keep your sign-in details secure and notify support if you suspect unauthorized access.")}</CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><AlertCircle className="h-5 w-5 text-primary" />{t("terms.thirdParty", "Third-Party Content and Services")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("terms.thirdPartyDesc", "CineTrekker uses third-party data providers, including TMDB, for title metadata and imagery. Availability, accuracy, and content are subject to those providers and their terms.")}</CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><RefreshCcw className="h-5 w-5 text-primary" />{t("terms.changes", "Changes to These Terms")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("terms.changesDesc", "Terms may be updated from time to time. Continued use of CineTrekker after updates means you accept the revised terms.")}</CardContent>
        </Card>
      </div>
    </div>
  );
}

