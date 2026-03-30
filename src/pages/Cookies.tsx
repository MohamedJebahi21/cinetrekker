import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Cookie, Database, Settings2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Cookies() {
  const { t, i18n } = useTranslation();
  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="ct-page-shell min-h-screen">
      <div className="page-container pt-20 pb-24 md:pb-10">
      <SEO
        title={t("cookies.seoTitle", "Cookie Policy - CineTrekker")}
        description={t(
          "cookies.seoDescription",
          "How CineTrekker uses cookies and local storage to keep the app functional and personalized.",
        )}
        canonical="https://cinetrekker.vercel.app/cookies"
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="ct-panel-strong p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="section-title mb-0">{t("cookies.title", "Cookie Policy")}</h1>
              <p className="text-sm text-muted-foreground">{t("common.updated", "Updated")} {currentDate}</p>
              <p className="max-w-2xl text-muted-foreground">{t("cookies.intro", "This policy explains how CineTrekker uses cookies and local storage technologies to keep the app secure and personalized.")}</p>
            </div>
          </div>
        </header>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Database className="h-5 w-5 text-primary" />{t("cookies.whatWeStore", "What We Store")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>{t("cookies.store1", "Authentication and session state to keep you signed in.")}</li>
              <li>{t("cookies.store2", "UI and accessibility preferences such as theme, language, and font size.")}</li>
              <li>{t("cookies.store3", "Feature flags and local settings used for app performance and stability.")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><ShieldCheck className="h-5 w-5 text-primary" />{t("cookies.whyWeUseIt", "Why We Use It")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">{t("cookies.whyWeUseItDesc", "These technologies help remember your preferences, maintain account security, and provide a consistent experience between visits.")}</CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Settings2 className="h-5 w-5 text-primary" />{t("cookies.managing", "Managing Cookies and Local Storage")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">{t("cookies.managingDesc", "You can clear cookies and local storage from your browser settings at any time. Doing so may sign you out and reset saved preferences.")}</CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

