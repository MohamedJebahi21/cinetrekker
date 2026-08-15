import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import {
  Shield,
  Database,
  Lock,
  Share2,
  Mail,
  Cookie,
  KeyRound,
  Clock3,
  UserCheck,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeT } from "@/lib/i18n";
import { Link } from "react-router-dom";

export default function Privacy() {
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
        title={safeT(t, "privacy.seoTitle", "Privacy Policy")}
        description={safeT(
          t,
          "privacy.seoDescription",
          "CineTrekker privacy policy and data handling practices",
        )}
        canonical="https://cinetrekker.vercel.app/privacy"
      />
      <div className="mx-auto max-w-4xl py-10 space-y-6">
        <header className="ct-panel-strong p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="section-title mb-0">{t("privacy.title", "Privacy Policy")}</h1>
              <p className="text-sm text-muted-foreground">{t("privacy.lastUpdated", { date: currentDate })}</p>
              <p className="max-w-2xl text-muted-foreground">{t("privacy.intro", "This page explains what data CineTrekker processes, how it is used, and your control options.")}</p>
            </div>
          </div>
        </header>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Database className="h-5 w-5 text-primary" />{t("privacy.dataCollected", "Data We Collect")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>{t("privacy.dataList.email", "Account details required for sign-in, such as email address.")}</li>
              <li>{t("privacy.dataList.watchlist", "Library data like watchlist entries, watched status, and ratings.")}</li>
              <li>{t("privacy.dataList.preferences", "Preference data such as language, theme, and accessibility settings.")}</li>
              <li>{safeT(t, "privacy.dataList.activity", "Operational events such as follow actions, notification reads, and security checks for abuse prevention.")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Lock className="h-5 w-5 text-primary" />{t("privacy.dataUsage", "How We Use Data")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{t("privacy.dataUsageDesc", "We use your data to deliver core app functions, sync your account state, personalize your experience, and improve reliability.")}</p>
            <p>{safeT(t, "privacy.dataUsageDesc2", "We also process security metadata to protect forms, detect abuse, and keep service endpoints stable.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><KeyRound className="h-5 w-5 text-primary" />{safeT(t, "privacy.googleSignIn", "Google Sign-In")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{safeT(t, "privacy.googleSignInDesc", "When you choose Google Sign-In, Google provides your email address, basic profile information, and a unique account identifier. CineTrekker uses this identity data only to authenticate your account, create or link your CineTrekker profile, and keep your account available across devices.")}</p>
            <p>{safeT(t, "privacy.googleSignInNoExtraAccess", "CineTrekker does not request access to Gmail, Google Drive, contacts, calendars, or other Google services. We do not sell Google identity data or use it for advertising.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Cookie className="h-5 w-5 text-primary" />{safeT(t, "privacy.cookiesAndStorage", "Cookies and Local Storage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{safeT(t, "privacy.cookiesDesc", "CineTrekker uses cookies and local storage for authentication sessions, language/theme preferences, accessibility settings, consent state, and performance optimization.")}</p>
            <p>{safeT(t, "privacy.cookiesDesc2", "You can review cookie details on the Cookie Policy page and change optional tracking preferences from in-app settings.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Server className="h-5 w-5 text-primary" />{safeT(t, "privacy.providers", "Service Providers and Infrastructure")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{safeT(t, "privacy.providersDesc", "CineTrekker relies on third-party providers for core operations, including authentication/session storage, movie and TV metadata, and optional analytics. These providers process only the data needed to deliver their parts of the service.")}</p>
            <p>{safeT(t, "privacy.providersDesc2", "Examples include account infrastructure (such as Supabase), content metadata APIs (such as TMDB), and optional analytics/monitoring providers when enabled by consent and environment settings.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Share2 className="h-5 w-5 text-primary" />{t("privacy.dataSharing", "Data Sharing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{t("privacy.dataSharingDesc", "CineTrekker does not sell personal data. Limited sharing may occur with service providers required to operate app infrastructure and authentication.")}</p>
            <p>{safeT(t, "privacy.dataSharingDesc2", "Where required by law, we may disclose limited records to comply with legal obligations, prevent fraud, or enforce platform safety policies.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Clock3 className="h-5 w-5 text-primary" />{safeT(t, "privacy.retention", "Data Retention")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{safeT(t, "privacy.retentionDesc", "Account-linked list and preference data is retained while your account is active so your experience can sync across sessions and devices.")}</p>
            <p>{safeT(t, "privacy.retentionDesc2", "If you use in-app account data deletion tools, we remove app profile records and related list data from CineTrekker systems, subject to operational backups and provider retention windows.")}</p>
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><UserCheck className="h-5 w-5 text-primary" />{safeT(t, "privacy.yourRights", "Your Controls and Rights")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            {safeT(t, "privacy.rightsDesc", "You can access and change profile settings, export your app data, adjust safety and accessibility preferences, and request deletion using the in-app Settings page. Depending on your region, you may also have additional legal rights to access, correct, or erase personal data.")}
          </CardContent>
        </Card>

        <Card className="ct-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Mail className="h-5 w-5 text-primary" />{t("privacy.contact", "Contact and Requests")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>{safeT(t, "privacy.contactDesc", "For privacy-related questions or data requests, use the Feedback page or email the CineTrekker privacy contact.")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <a href="mailto:cinetrekker.contact@gmail.com" className="text-primary hover:text-primary/80">
                {safeT(t, "privacy.contactEmail", "Privacy contact")}: cinetrekker.contact@gmail.com
              </a>
              <Link to="/feedback" className="text-primary hover:text-primary/80">
                {safeT(t, "privacy.feedbackLink", "Go to Feedback")}
              </Link>
              <Link to="/cookies" className="text-primary hover:text-primary/80">
                {safeT(t, "privacy.cookiesLink", "Review Cookie Policy")}
              </Link>
              <Link to="/terms" className="text-primary hover:text-primary/80">
                {safeT(t, "privacy.termsLink", "Review Terms")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

