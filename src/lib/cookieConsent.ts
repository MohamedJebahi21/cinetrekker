export const COOKIE_CONSENT_STORAGE_KEY = "cinetrekker_cookie_consent";

export type CookieConsentChoice = "accepted" | "rejected";

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return stored === "accepted" || stored === "rejected" ? stored : null;
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new Event("storage"));
}

export function hasAcceptedCookieConsent(): boolean {
  return readCookieConsent() === "accepted";
}
