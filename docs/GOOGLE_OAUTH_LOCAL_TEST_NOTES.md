# Google OAuth Local Test Notes

The local signup page at `http://localhost:4180/signup` bootstrapped successfully on 15 August 2026. The **Continue with Google** control was visible, keyboard-accessible, and part of the shared authentication form. The client-side OAuth launch implementation uses Supabase’s `signInWithOAuth` with the callback target `${window.location.origin}/auth/callback`.

The callback page currently checks only for a query-string error and otherwise relies on `supabase.auth.getSession()`. It does not explicitly exchange an OAuth authorization `code`, preserve a return path, or distinguish callback error categories. These are likely client-side reliability gaps to address before assessing remote Google or Supabase settings.

## Confirmed launch result

Launching Google sign-in before the local fix reached Supabase correctly but returned HTTP 400 with `Unsupported provider: provider is not enabled`. This confirms that the immediate blocker is remote Supabase Google-provider configuration, not a missing client button or malformed local redirect target.

The client is now being hardened to use `skipBrowserRedirect`, allowing this provider error to be surfaced as an in-app message rather than replacing the application with Supabase’s raw JSON response. The callback now explicitly handles PKCE authorization codes and consumes a validated in-app return path after success.

## Retest preparation

The first post-change browser run still reached the raw Supabase provider-disabled response. The local server was restarted to eliminate stale hot-module state before repeating the launch verification.

## Restarted test outcome

After restarting the Vite server, the browser still reached the Supabase provider-disabled error page. The running Vite source was verified to include `skipBrowserRedirect: true`, so the immediate page replacement is an expected consequence of navigating to Supabase’s authorize endpoint while the remote provider is disabled, rather than a stale local bundle.

A client-side preflight may be used to surface that error in-app, but it cannot make Google authentication succeed. Enabling Google in Supabase remains the required functional fix.

## Browser preflight result

A no-credential browser fetch to Supabase’s authorize endpoint with `skip_http_redirect=true` succeeded at the transport layer and exposed the disabled-provider response to the local application: HTTP 400 with `Unsupported provider: provider is not enabled`. This makes an in-app preflight viable: CineTrekker can show a friendly configuration message rather than navigate to Supabase’s raw error page while the provider remains disabled.

## Final local launch result

After adding the browser preflight, selecting **Continue with Google** remained on the local signup screen rather than navigating to the raw Supabase JSON page. The disabled-provider failure is now handled in CineTrekker’s client flow, leaving email/password sign-in available as the fallback. The functional Google login remains unavailable until the provider is enabled remotely.

## Authorized remote configuration progress

Supabase Authentication URL Configuration was updated successfully to allow `http://localhost:8080/**`. The existing production wildcard `https://cinetrekker.vercel.app/**` already permits the deployed callback route.

In Google Cloud project `norse-ego-457420-e3` (My First Project), the Google Auth Platform consent configuration was created for **CineTrekker** with an external audience and the project-owner support/contact email. A Web application OAuth client named **Cinetrekker** is being created with the sole authorized redirect URI `https://nvssyuxghwlubxklvgrn.supabase.co/auth/v1/callback`. The browser remained on the creation state at the time of this note, so the generated Client ID and Client Secret have not yet been retrieved or entered into Supabase.

## Completion status

The Supabase Google provider was enabled successfully after the Google Cloud Web application OAuth client was configured with the project callback URL. The Supabase provider list now reports **Google Enabled**.

End-to-end verification succeeded twice. First, the production Google OAuth flow completed and returned to the deployed CineTrekker home page with an authenticated session. Second, the local application was run on port 8080 and completed the exact callback flow to `http://localhost:8080/auth/callback`; the callback safely cleared the URL fragment, redirected to the local home page, and rendered authenticated-only controls and account data. No OAuth credentials, authorization tokens, or secret values are retained in these notes.
