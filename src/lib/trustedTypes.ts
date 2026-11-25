/**
 * Trusted Types utilities for CineTrekker.
 *
 * Creates the named `cinetrekker` policy once (module singleton) so every
 * module that writes to a Trusted-Types-protected DOM sink (script.src,
 * script.text, innerHTML, etc.) can import a helper instead of accessing
 * `window.trustedTypes` directly.
 *
 * A permissive `default` policy is also attempted so that third-party
 * libraries (CAPTCHA widgets, analytics) can write to sinks without errors.
 * Browser extensions or the runtime may have already created a `default`
 * policy before our code runs – the duplicate error is silently swallowed.
 */

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_SCRIPT_ORIGINS = new Set([
  "https://vercel.live",
  "https://va.vercel-scripts.com",
  "https://challenges.cloudflare.com",
  "https://cloud.umami.is",
]);

function validateScriptUrl(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (
      parsed.origin === window.location.origin ||
      ALLOWED_SCRIPT_ORIGINS.has(parsed.origin)
    ) {
      return parsed.toString();
    }
  } catch {
    // Invalid URL falls through to rejection
  }
  throw new TypeError(`Blocked untrusted script URL: ${url}`);
}

let _policy: TrustedTypePolicy | null = null;

function init(): void {
  if (typeof window === "undefined" || !window.trustedTypes) return;

  // Create the named `cinetrekker` policy and retain the reference.
  try {
    _policy = window.trustedTypes.createPolicy("cinetrekker", {
      createHTML: (v) => DOMPurify.sanitize(v, { RETURN_TRUSTED_TYPE: false }) as string,
      createScript: (v) => v,
      createScriptURL: (v) => validateScriptUrl(v),
    });
  } catch {
    // Already created – nothing to do.
  }

  // Enforce sanitization/allowlisting on the `default` policy so third-party
  // or accidental DOM sink writes cannot bypass Trusted Types with raw strings.
  try {
    window.trustedTypes.createPolicy("default", {
      createHTML: (v) => DOMPurify.sanitize(v, { RETURN_TRUSTED_TYPE: false }) as string,
      createScript: () => {
        throw new TypeError("Blocked untrusted inline script via default Trusted Types policy");
      },
      createScriptURL: (v) => validateScriptUrl(v),
    });
  } catch {
    // Already created – nothing to do.
  }
}

init();

/**
 * Returns a TrustedScriptURL wrapping `url` when Trusted Types is active,
 * or the original string when it is not. Cast the return value to `string`
 * at the call site (e.g. `script.src = toTrustedScriptURL(url) as string`)
 * to satisfy TypeScript's static types for DOM sink properties.
 */
export function toTrustedScriptURL(url: string): TrustedScriptURL | string {
  return _policy ? _policy.createScriptURL(url) : url;
}

/**
 * Returns a TrustedScript wrapping `code` when Trusted Types is active,
 * or the original string when it is not.
 */
export function toTrustedScript(code: string): TrustedScript | string {
  return _policy ? _policy.createScript(code) : code;
}

/**
 * Returns a TrustedHTML wrapping `html` when Trusted Types is active,
 * or the original string when it is not.
 */
export function toTrustedHTML(html: string): TrustedHTML | string {
  return _policy ? _policy.createHTML(html) : html;
}
