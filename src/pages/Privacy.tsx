import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Shield, Database, Lock, Share2, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-container pt-20 pb-24 md:pb-10">
      <SEO
        title={t("privacy.seoTitle", "Privacy Policy - CineTrekker")}
        description={t("privacy.seoDescription", "CineTrekker privacy policy and data handling practices")}
        canonical="https://cinetrekker.vercel.app/privacy"
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="rounded-2xl border border-[color:hsl(var(--border))] bg-[var(--bg-card)] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">{t("privacy.title", "Privacy Policy")}</h1>
              <p className="text-sm text-[var(--text-secondary)]">{t("privacy.lastUpdated", { date: currentDate })}</p>
              <p className="max-w-2xl text-[var(--text-secondary)]">{t("privacy.intro", "This page explains what data CineTrekker processes, how it is used, and your control options.")}</p>
            </div>
          </div>
        </header>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><Database className="h-5 w-5 text-primary" />{t("privacy.dataCollected", "Data We Collect")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>{t("privacy.dataList.email", "Account details required for sign-in, such as email address.")}</li>
              <li>{t("privacy.dataList.watchlist", "Library data like watchlist entries, watched status, and ratings.")}</li>
              <li>{t("privacy.dataList.preferences", "Preference data such as language, theme, and accessibility settings.")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><Lock className="h-5 w-5 text-primary" />{t("privacy.dataUsage", "How We Use Data")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("privacy.dataUsageDesc", "We use your data to deliver core app functions, sync your account state, personalize your experience, and improve reliability.")}</CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><Share2 className="h-5 w-5 text-primary" />{t("privacy.dataSharing", "Data Sharing")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("privacy.dataSharingDesc", "CineTrekker does not sell personal data. Limited sharing may occur with service providers required to operate app infrastructure and authentication.")}</CardContent>
        </Card>

        <Card className="border-[color:hsl(var(--border))] bg-[var(--bg-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]"><Mail className="h-5 w-5 text-primary" />{t("privacy.contact", "Contact and Requests")}</CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--text-secondary)] leading-relaxed">{t("privacy.contactDesc", "For privacy-related requests, contact the CineTrekker team via the Feedback page.")}</CardContent>
        </Card>
      </div>
    </div>
  );
}

