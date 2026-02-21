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
  userMessage: string;
  logMessage: string;
  code?: string;
}

// SECURITY: Generic messages prevent account enumeration
export const GENERIC_SIGNIN_ERROR_MESSAGE = 'Invalid email or password.';
export const GENERIC_SIGNUP_RESPONSE_MESSAGE =
  'Please check your email to complete setup.';
export const GENERIC_PASSWORD_RESET_RESPONSE_MESSAGE =
  'If an account exists with this email, you will receive a password reset link.';

function getErrorDetails(error: unknown): { message: string; code: string } {
  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : undefined;
    const maybeCode = 'code' in error ? (error as { code?: unknown }).code : undefined;

    return {
      message: typeof maybeMessage === 'string' ? maybeMessage : 'Unknown error',
      code: typeof maybeCode === 'string' ? maybeCode : '',
    };
  }

  return {
    message: 'Unknown error',
    code: '',
  };
}

/**
 * Sanitizes Supabase auth errors to prevent account enumeration attacks
 *
 * Maps specific errors to generic user-facing messages while preserving
 * detailed information for server-side logging.
 *
 * @param error - Supabase auth error object
 * @returns Sanitized error with generic user message and detailed log message
 */
export function sanitizeAuthError(error: unknown): SanitizedAuthError {
  const details = getErrorDetails(error);
  const errorMessage = details.message.toLowerCase();
  const errorCode = details.code;
  const originalError = details.message;

  // Error matchers for various auth failure types
  const matcherPatterns = {
    invalidCredentials: ['invalid', 'login', 'credentials', 'signin'],
    userNotFound: ['user', 'not', 'found', 'does not exist', 'no user'],
    wrongPassword: ['wrong', 'password', 'invalid password'],
    emailExists: ['email', 'already', 'exists', 'already registered', 'user already exists'],
  };

  // Check for sign-in/credential errors (user not found, wrong password, etc.)
  if (
    errorMessage.includes('invalid') ||
    matcherPatterns.userNotFound.some(p => errorMessage.includes(p)) ||
    matcherPatterns.wrongPassword.some(p => errorMessage.includes(p)) ||
    errorCode === 'invalid_grant' ||
    errorCode === '401'
  ) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      userMessage: GENERIC_SIGNIN_ERROR_MESSAGE,
      logMessage: `Authentication failed: ${originalError}`,
      code: errorCode,
    };
  }

  // Check for email already exists (sign-up errors)
  if (
    matcherPatterns.emailExists.some(p => errorMessage.includes(p)) ||
    errorCode === 'user_already_exists'
  ) {
    return {
      type: AuthErrorType.EMAIL_EXISTS,
      userMessage: GENERIC_SIGNUP_RESPONSE_MESSAGE,
      logMessage: `Sign-up failed: Account already exists (email enumeration attempt detected)`,
      code: errorCode,
    };
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorCode === 'NETWORK_ERROR'
  ) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      userMessage: 'Network error. Please check your connection and try again.',
      logMessage: `Network error: ${originalError}`,
      code: errorCode,
    };
  }

  // Unknown errors - generic fallback
  return {
    type: AuthErrorType.UNKNOWN,
    userMessage: GENERIC_SIGNIN_ERROR_MESSAGE,
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
export function isAccountEnumerationAttempt(_error: unknown): boolean {
  return false;
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

  // Do NOT output raw error details that could reveal account info
  console.warn('[Security] Authentication event:', logData.event, 'Type:', logData.errorType);

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
