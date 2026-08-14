import { getClientIP } from "./requestSecurity.js";
import { getServerEnv } from "./env.js";
import { reportSecurityEvent } from "./securityMonitor.js";

const DEFAULT_HONEYPOT_FIELD = "website";

function normalizeText(value, maxLength = 1024) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getCaptchaConfig() {
  const turnstileSecret = getServerEnv("TURNSTILE_SECRET_KEY");
  const recaptchaSecret = getServerEnv("RECAPTCHA_SECRET_KEY");

  if (turnstileSecret) {
    return {
      provider: "turnstile",
      secret: turnstileSecret,
      verifyUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    };
  }

  if (recaptchaSecret) {
    return {
      provider: "recaptcha",
      secret: recaptchaSecret,
      verifyUrl: "https://www.google.com/recaptcha/api/siteverify",
    };
  }

  return null;
}

export function getBotProtectionClientConfig() {
  const siteKey =
    getServerEnv("VITE_TURNSTILE_SITE_KEY") || getServerEnv("VITE_RECAPTCHA_SITE_KEY");

  return {
    provider: getServerEnv("VITE_TURNSTILE_SITE_KEY")
      ? "turnstile"
      : getServerEnv("VITE_RECAPTCHA_SITE_KEY")
        ? "recaptcha"
        : null,
    siteKey: siteKey || "",
    honeypotFieldName: DEFAULT_HONEYPOT_FIELD,
  };
}

export async function verifyBotProtection(req, body, scope = "feedback") {
  const honeypot = normalizeText(body?.[DEFAULT_HONEYPOT_FIELD], 256);
  if (honeypot) {
    await reportSecurityEvent({
      event: "feedback_honeypot_triggered",
      severity: "warning",
      scope,
      message: "Honeypot field was filled.",
      req,
      shouldAlert: false,
    });
    return { ok: false, status: 400, error: "Bot protection check failed." };
  }

  const captchaConfig = getCaptchaConfig();
  if (!captchaConfig) {
    await reportSecurityEvent({
      event: "feedback_captcha_not_configured",
      severity: "error",
      scope,
      message: "Feedback bot protection is not configured.",
      req,
      shouldAlert: true,
    });
    return {
      ok: false,
      status: 503,
      error: "Feedback bot protection is temporarily unavailable.",
    };
  }

  const token = normalizeText(
    body?.captchaToken || body?.turnstileToken || body?.recaptchaToken,
    4096,
  );

  if (!token) {
    return {
      ok: false,
      status: 400,
      error: "Captcha verification is required.",
    };
  }

  if (typeof fetch !== "function") {
    return {
      ok: false,
      status: 503,
      error: "Captcha verification is temporarily unavailable.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.set("secret", captchaConfig.secret);
    formData.set("response", token);
    formData.set("remoteip", getClientIP(req));

    const response = await fetch(captchaConfig.verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.success !== true) {
      await reportSecurityEvent({
        event: "feedback_captcha_failed",
        severity: "warning",
        scope,
        message: "Captcha verification failed.",
        req,
        details: {
          provider: captchaConfig.provider,
          errors: payload?.["error-codes"] || [],
        },
        shouldAlert: false,
      });
      return {
        ok: false,
        status: 400,
        error: "Captcha verification failed.",
      };
    }

    return { ok: true, provider: captchaConfig.provider };
  } catch (error) {
    await reportSecurityEvent({
      event: "feedback_captcha_error",
      severity: "error",
      scope,
      message: "Captcha verification request failed.",
      req,
      details: error,
      shouldAlert: true,
    });
    return {
      ok: false,
      status: 503,
      error: "Captcha verification is temporarily unavailable.",
    };
  }
}

export const botProtectionConstants = {
  honeypotFieldName: DEFAULT_HONEYPOT_FIELD,
};
