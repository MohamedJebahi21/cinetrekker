# Security Documentation

This document outlines the security measures implemented in this application.

## Authentication Security

### 1. Strong Password Policy (Client-Side)

**File:** `src/lib/passwordValidation.ts`

Since Supabase's Leaked Password Protection is a paid feature, we implement robust client-side validation:

- **Minimum length:** 8 characters
- **Complexity requirements:**
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (!@#$%^&*...)
- **Common password blocklist:** 100+ most commonly used passwords are blocked
- **Sequential character detection:** Prevents patterns like "123", "abc"
- **Repeated character detection:** Prevents patterns like "aaa"
- **Real-time strength indicator:** Shows weak/fair/good/strong feedback

### 2. Email Verification Required

**Configuration:** Supabase Auth `auto_confirm_email` set to `false`

- New users must verify their email before accessing protected routes
- Verification email sent automatically on signup
 - No email verification is required for access

### 3. Protected Routes

**File:** `src/components/ProtectedRoute.tsx`

Routes that require authentication:
- `/profile` - User profile
- `/watchlist` - User's watchlist
- `/watched` - User's watched media
- `/recommendations` - Personalized recommendations
- `/calendar` - Episode calendar

Features:
- Automatic redirect to `/login` for unauthenticated users
- Return URL preserved for post-login redirect

### 4. OAuth Preferred (Google Sign-In)

**File:** `src/pages/Auth.tsx`

Google OAuth is prominently displayed as the preferred authentication method because:
- Google already implements leaked password protection
- Google handles 2FA and advanced security features
- Users benefit from Google's security infrastructure
- Reduces risk of password reuse

### 5. Anonymous Sign-ups Disabled

Anonymous users are disabled in Supabase configuration to prevent abuse.

## Database Security (Row Level Security)

All tables have RLS enabled with restrictive policies ensuring users can only access their own data:

### Tables and Policies

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | Own data only | Own data only | Own data only | N/A |
| `followed_shows` | Own data only | Own data only | Own data only | Own data only |
| `user_watched` | Own data only | Own data only | Own data only | Own data only |
| `user_watchlist` | Own data only | Own data only | N/A | Own data only |
| `watched_episodes` | Own data only | Own data only | Own data only | Own data only |

All policies use `auth.uid() = user_id` for verification.

## API Security

### TMDB Proxy Edge Function

**File:** `supabase/functions/tmdb-proxy/index.ts`

- **CORS restrictions:** Only allows requests from known origins
- **Origin validation:** Checks against a configured allowlist of trusted hosts
- **No exposed API keys:** TMDB key stored in Supabase secrets

## Input Validation

### Client-Side Validation

**File:** `src/lib/validation.ts`

All user inputs are validated using Zod schemas:
- `userNoteSchema` - Max 5000 characters
- `showNameSchema` - Required, max 500 characters
- `displayNameSchema` - Max 100 characters
- `episodeNameSchema` - Max 500 characters
- `ratingSchema` - Integer 0-10
- `mediaTypeSchema` - Enum: 'movie' | 'tv'
- `statusSchema` - Enum: 'watching' | 'completed' | 'dropped' | 'plan_to_watch'

## Known Limitations

### Leaked Password Protection (Paid Feature)

Supabase's native Leaked Password Protection (HaveIBeenPwned integration) requires a paid plan. As a mitigation:
- Strong client-side password validation implemented
- Common password blocklist blocks 100+ weak passwords
- Users encouraged to use Google OAuth instead

### To Enable (When Available)

In Supabase Dashboard → Authentication → Settings → Security:
1. Enable "Leaked Password Protection"
2. This checks passwords against HaveIBeenPwned database

## XSS Protection & Content Sanitization

### Defense-in-Depth XSS Prevention

**Files:** `src/lib/sanitize.ts`, `src/pages/Profile.tsx`

React automatically escapes all string content by default, preventing most XSS attacks. Additionally:

1. **DOMPurify Integration**
   - Package: `isomorphic-dompurify`
   - Provides defense-in-depth sanitization for user-generated content
   - Strips malicious HTML while preserving safe formatting

2. **Sanitization Utilities**
   - `sanitizeHTML()` - Allows safe HTML tags (b, i, em, strong, u, p, br)
   - `stripHTML()` - Removes all HTML tags (for text-only fields like bios)
   - `sanitizeURL()` - Prevents javascript: and data: URI attacks
   - `sanitizeEmail()` - Validates and sanitizes email addresses
   - `sanitizeDisplayName()` - Sanitizes user display names
   - `sanitizeSearchQuery()` - Prevents injection in search queries
   - `sanitizeJSON()` - Recursively sanitizes parsed JSON objects

3. **User-Generated Content Handling**
   - User bios: `stripHTML()` removes all HTML
   - User notes: Limited to 5000 characters via Zod schema
   - Search queries: Limited to 200 characters via custom validation
   - Display names: Limited to 100 characters, HTML stripped

4. **TMDB Data Handling**
   - Movie titles, descriptions: Rendered as plain text (auto-escaped by React)
   - No user-facing content from TMDB is parsed as HTML
   - All TMDB API responses are validated against TypeScript types

### Content Security Policy (CSP)

**Files:** `vite.config.ts`, `/vercel.json`

Comprehensive CSP prevents inline script execution and limits resource loading:

```
default-src 'self'
script-src 'self' 'wasm-unsafe-eval' https://vercel.live https://va.vercel-scripts.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' data: https://fonts.gstatic.com
img-src 'self' data: blob: https: https://image.tmdb.org https://www.themoviedb.org
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.themoviedb.org https://vercel.live
frame-src 'self' https://www.youtube.com https://player.vimeo.com https://vercel.live
object-src 'none'
base-uri 'self'
form-action 'self'
upgrade-insecure-requests
block-all-mixed-content
```

## Infrastructure Hardening

### Production Security Headers (Vercel)

**File:** `/vercel.json`

All responses include security headers enforcing industry best practices:

| Header | Value | Purpose |
|--------|-------|---------|
| **X-Content-Type-Options** | `nosniff` | Prevents MIME type sniffing attacks |
| **X-Frame-Options** | `DENY` | Blocks framing (prevents clickjacking) |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year (365 days) |
| **X-XSS-Protection** | `1; mode=block` | Legacy XSS filter (modern browsers use CSP) |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Limits referrer data to trusted origins |
| **Permissions-Policy** | `geolocation=(), camera=(), microphone=(), ...` | Disables unnecessary device permissions |

### Development Server Headers

**File:** `vite.config.ts`

Development server applies the same security headers as production to catch issues early:
- Same CSP policy as vercel.json
- All production headers enabled
- HTTP middleware enforces headers on every response

### API Endpoint Hardening

**File:** `/vercel.json` (API routes section)

API endpoints receive additional hardening:
- `Cache-Control: no-store, no-cache, must-revalidate` - Prevents caching sensitive data
- Same security headers as general routes
- Stricter CORS validation in Supabase Edge Functions

### Static Asset Caching

**File:** `/vercel.json` (static routes section)

Cache-friendly static assets (images, fonts, CSS):
- `Cache-Control: public, max-age=31536000, immutable`
- Browser caches for 1 year after first load
- Only cache verified static files

## Rate Limiting

### Client-Side Rate Limiting

**File:** `src/lib/reviewRateLimiter.ts`

Prevents abuse and improves UX by throttling user actions:

| Action | Rate Limit | Purpose |
|--------|-----------|---------|
| Review Submission | 5 per minute | Prevents spam reviews |
| Profile Updates | 10 per minute | Prevents profile flooding |
| Search Queries | 30 per minute | Prevents query spam |

**Implementation:**
- Token bucket algorithm with configurable intervals
- Client-side only (server has additional protection)
- Prevents rapid-fire requests from frustrating users
- Syncs across browser tabs via `storageListener`

### Server-Side Rate Limiting (Recommended)

For production, implement server-side rate limiting:
- Supabase Edge Functions with Deno rate_limit middleware
- API Gateway throttling on Vercel
- IP-based rate limiting for anonymous users

## Environment Variable Security

### Client-Side Variables (Public)

**File:** `src/lib/envValidation.ts`

Client-side environment variables (prefixed with `VITE_`):
- `VITE_SUPABASE_URL` - Public Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anonymous key (read-only via RLS)

These are intentionally public and visible in the browser. They do not grant privileged access.

### Server-Side Variables (Private)

Stored in Vercel Environment Variables (never exposed to browser):
- `OPENAI_API_KEY` - For backend AI recommendations
- `TMDB_API_KEY` - For backend TMDB queries
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations (Vercel Edge Functions only)

### Validation Pipeline

1. **Build Time:** Environment variables validated by `envValidation.ts`
2. **Module Load:** Client app validates required vars on startup
3. **Runtime:** Missing vars throw helpful error messages with setup instructions
4. **Production:** Vercel Dashboard enforces required env vars before deployment

## Changelog

- **2026-02-19:** Infrastructure hardening iteration 2
  - Created `/vercel.json` with comprehensive security headers
  - Enhanced CSP policy in vite.config.ts with block-all-mixed-content
  - Added HSTS (Strict-Transport-Security) header with preload flag
  - Installed DOMPurify for defense-in-depth XSS protection
  - Created `src/lib/sanitize.ts` with 10+ sanitization utilities
  - Documented infrastructure hardening in this file
  - Added Permissions-Policy for device restrictions
  - Structured API and static asset caching strategies
