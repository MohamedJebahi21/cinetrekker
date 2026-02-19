/**
 * Authentication Error Handler
 *
 * Prevents account enumeration attacks by sanitizing auth error messages.
 * All authentication failures return generic messages to users.
 * Detailed errors are logged server-side for security monitoring.
 *
 * OWASP: CWE-203 - Information Exposure Through Discrepancy
 * https://cwe.mitre.org/data/definitions/203.html
 */

export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_EXISTS = 'EMAIL_EXISTS',
  PASSWORD_WEAK = 'PASSWORD_WEAK',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

interface SanitizedAuthError {
  type: AuthErrorType;
  userMessage: string; // Generic message for user (never exposes account enumeration info)
  logMessage: string; // Detailed message for logging (server-side only)
  code?: string; // Error code for debugging (server logs only)
}

/**
 * Sanitizes Supabase auth errors to prevent account enumeration attacks
 *
 * Maps specific errors to generic user-facing messages while preserving
 * detailed information for server-side logging.
 *
 * Example - Account Enumeration Prevention:
 * - "User not found" → "Invalid email or password"
 * - "Invalid password" → "Invalid email or password"
 * - "Email already exists" → "Already registered. Sign in or use different email"
 *
 * @param error - Supabase auth error object
 * @returns Sanitized error with generic user message and detailed log message
 */
export function sanitizeAuthError(error: unknown): SanitizedAuthError {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code || '';
  const originalError = error?.message || 'Unknown error';

  // Debug log (never sent to client)
  console.debug('[Auth Error Debug]', {
    code: errorCode,
    message: originalError,
    timestamp: new Date().toISOString(),
  });

  // Sign-in specific errors - distinguish "invalid creds" from "user doesn't exist"
  if (
    errorMessage.includes('invalid login credentials') ||
    errorMessage.includes('user not found') ||
    errorMessage.includes('invalid email') ||
    errorMessage.includes('invalid password') ||
    errorCode === 'invalid_grant'
  ) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      userMessage: 'Invalid email or password. Please try again.',
      logMessage: `Authentication failed: ${originalError}`,
      code: errorCode,
    };
  }

  // Sign-up specific errors - account enumeration prevention
  if (
    errorMessage.includes('user already exists') ||
    errorMessage.includes('email already registered') ||
    errorCode === 'user_already_exists'
  ) {
    return {
      type: AuthErrorType.EMAIL_EXISTS,
      userMessage: 'This email is already registered. Please sign in or use a different email.',
      logMessage: `Sign-up failed: Email already exists`,
      code: errorCode,
    };
  }

  // Password validation errors - these are CLIENT-SIDE, ok to show detailed feedback
  if (errorMessage.includes('password')) {
    return {
      type: AuthErrorType.PASSWORD_WEAK,
      userMessage: 'Password does not meet security requirements.',
      logMessage: `Password validation failed: ${originalError}`,
      code: errorCode,
    };
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('failed to fetch') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      userMessage: 'Network error. Please check your connection and try again.',
      logMessage: `Network error: ${originalError}`,
      code: errorCode,
    };
  }

  // Email validation errors
  if (errorMessage.includes('email') && errorMessage.includes('invalid')) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      userMessage: 'Invalid email address. Please check and try again.',
      logMessage: `Email validation failed: ${originalError}`,
      code: errorCode,
    };
  }

  // Unknown errors - generic fallback (never expose internal error)
  return {
    type: AuthErrorType.UNKNOWN,
    userMessage: 'An error occurred. Please try again later or contact support.',
    logMessage: `Unknown auth error: ${originalError}`,
    code: errorCode,
  };
}

/**
 * Detects if error is an account enumeration attempt
 *
 * Used for security monitoring to detect enumeration attacks
 * @param error - Supabase auth error object
 * @returns True if error reveals account existence
 */
export function isAccountEnumerationAttempt(error: unknown): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  return (
    errorMessage.includes('user not found') ||
    errorMessage.includes('user does not exist') ||
    errorMessage.includes('no user found')
  );
}

/**
 * Logs authentication failures for security monitoring
 *
 * Should be sent to security monitoring service (Sentry, DataDog, etc.)
 * Never exposed to client
 *
 * @param email - User email (masked for privacy)
 * @param errorType - Type of authentication error
 * @param ipAddress - Client IP address (optional)
 * @param userAgent - Client user agent (optional)
 */
export function logAuthFailure(
  email: string,
  errorType: AuthErrorType,
  ipAddress?: string,
  userAgent?: string
): void {
  // Mask email for privacy (show only first 3 chars + ***)
  const maskedEmail = email?.length > 3 
    ? email.substring(0, 3) + '***' 
    : '***';

  const logData = {
    event: 'auth_failure',
    errorType,
    email: maskedEmail,
    ipAddress: ipAddress || 'unknown',
    userAgent,
    timestamp: new Date().toISOString(),
  };

  console.error('[Security] Authentication failure', logData);

  // TODO: Send to security monitoring service
  // Only in production environment
  if (typeof window !== 'undefined' && 
      window.location?.hostname === 'cinetrekker.vercel.app') {
    // Example: Send to Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureMessage('Authentication failure', {
    //     level: 'warning',
    //     contexts: { auth: logData }
    //   });
    // }
    
    // Example: Send to DataDog
    // if (window.datadog) {
    //   window.datadog.logEvent('auth_failure', logData);
    // }
  }
}

/**
 * Determines if auth error should be shown to user
 *
 * Some errors should never be shown (internal server errors, etc.)
 * @param errorType - Type of authentication error
 * @returns True if error is safe to show to user
 */
export function shouldShowUserError(errorType: AuthErrorType): boolean {
  // Never show certain errors to prevent information disclosure
  const hiddenErrors = [
    AuthErrorType.UNKNOWN, // Generic unknown error
  ];

  return !hiddenErrors.includes(errorType);
}

/**
 * Rate limiting check for auth endpoints
 *
 * Prevents brute force attacks by limiting auth attempts
 * @param email - User email attempting to authenticate
 * @param maxAttemptsPerMinute - Max attempts allowed (default: 5)
 * @returns Rate limit info
 */
interface RateLimitInfo {
  isLimited: boolean;
  attemptsRemaining: number;
  resetAt: number;
}

const authAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkAuthRateLimit(
  email: string,
  maxAttemptsPerMinute: number = 5
): RateLimitInfo {
  const now = Date.now();
  const windowDuration = 60 * 1000; // 1 minute

  let entry = authAttempts.get(email);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowDuration };
    authAttempts.set(email, entry);
  }

  entry.count++;

  return {
    isLimited: entry.count > maxAttemptsPerMinute,
    attemptsRemaining: Math.max(0, maxAttemptsPerMinute - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Clear auth rate limit for email (call after successful auth)
 * @param email - User email to clear limit for
 */
export function clearAuthRateLimit(email: string): void {
  authAttempts.delete(email);
}
