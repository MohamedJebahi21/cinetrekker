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

## Security Recommendations

1. **Use Google OAuth** - Preferred for end users
2. **Keep dependencies updated** - Run `npm audit` regularly
3. **Monitor auth logs** - Check for suspicious login patterns
4. **Enable 2FA** - When Supabase supports it for your plan

## Changelog

- **2024-01-21:** Initial security hardening
  - Added strong password validation
  - Implemented protected routes with email verification
  - Added Google OAuth
  - Disabled auto-confirm email
  - Disabled anonymous signups
  - Documented RLS policies
