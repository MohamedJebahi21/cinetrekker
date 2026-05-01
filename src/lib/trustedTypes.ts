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

let _policy: TrustedTypePolicy | null = null;

function init(): void {
  if (typeof window === "undefined" || !window.trustedTypes) return;

  // Create the named `cinetrekker` policy and retain the reference.
  try {
    _policy = window.trustedTypes.createPolicy("cinetrekker", {
      createHTML: (v) => v,
      createScript: (v) => v,
      createScriptURL: (v) => v,
    });
  } catch {
    // Already created – nothing to do.
  }

  // Also attempt a permissive `default` policy so that third-party code
  // (e.g. Vercel analytics, CAPTCHA widgets) that passes plain strings to
  // trusted-type sinks continues to work without errors. Extensions or the
  // runtime may have already created a `default` policy (possibly without all
  // three handlers), so swallow duplicate-creation errors here.
  try {
    window.trustedTypes.createPolicy("default", {
      createHTML: (v) => v,
      createScript: (v) => v,
      createScriptURL: (v) => v,
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
