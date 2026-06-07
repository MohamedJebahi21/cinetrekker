import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function Logout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await signOut();
      if (!cancelled) {
        navigate("/login", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, signOut]);

  return (
    <>
      <SEO
        title="Logout - CineTrekker"
        description="Signing you out of CineTrekker."
        canonical="https://cinetrekker.vercel.app/logout"
      />
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center pt-20 pb-24 md:pb-0">
        <Skeleton className="mb-4 h-5 w-40" />
        <p className="text-sm text-muted-foreground">
          {t("auth.signingOut", "Signing you out...")}
        </p>
      </div>
    </>
  );
}
