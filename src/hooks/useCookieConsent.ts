import { useEffect, useState } from "react";
import {
  hasAcceptedCookieConsent,
  readCookieConsent,
  type CookieConsentChoice,
  writeCookieConsent,
} from "@/lib/cookieConsent";

export function useCookieConsent() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>(() =>
    readCookieConsent(),
  );

  useEffect(() => {
    setChoice(readCookieConsent());

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "cinetrekker_cookie_consent") {
        return;
      }

      setChoice(readCookieConsent());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    choice,
    hasAcceptedConsent: choice === "accepted" || hasAcceptedCookieConsent(),
    acceptAll: () => {
      writeCookieConsent("accepted");
      setChoice("accepted");
    },
    rejectNonEssential: () => {
      writeCookieConsent("rejected");
      setChoice("rejected");
    },
  };
}
