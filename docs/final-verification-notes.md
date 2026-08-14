# Final Local Verification Notes

Date: 2026-08-14
Scope: localhost only (`http://127.0.0.1:4173`)

## Authentication

- Local Supabase client was tested with an untracked `.env.local` containing only the session-provided publishable Supabase URL/key. The file is ignored by Git and is not part of the application patch.
- A harmless invalid sign-in with **Remember Me off** returned the expected user-safe message, `Invalid email or password. Please try again.` The preference was stored as `session`; no auth token was left in either localStorage or sessionStorage.
- A harmless invalid sign-in with **Remember Me on** returned the same user-safe message. The preference was stored as `persistent`; no auth token was left in either storage.
- The logout cleanup implementation was reviewed in source and includes Supabase sign-out, profile cache cleanup, both storage areas, and the sign-out event.

## OAuth

- Clicking **Continue with Google** from localhost correctly generated a Supabase OAuth authorize URL with `redirect_to=http://127.0.0.1:4173/auth/callback`.
- The configured Supabase project returned HTTP 400: `Unsupported provider: provider is not enabled`.
- No Google account login, personal information entry, or account mutation was performed.
- This is an environment/project configuration blocker rather than a local redirect-code failure. Before launch, enable Google OAuth in the target Supabase project and register the local and production redirect URLs.

## Feature gate

- AI Recommendations remains intentionally marked as an upcoming feature in the local source and was not enabled or implemented.
## AI feature state

- The isolated default-environment test invoked `api/recommend.js` with a POST request and received HTTP 501 with `AI recommendations are an upcoming feature.` The OpenAI path is therefore disabled unless the explicit `AI_RECOMMENDATIONS_ENABLED=true` server flag is configured.
