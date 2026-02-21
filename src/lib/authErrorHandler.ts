/**
 * Authentication Error Handler
 *
 * SECURITY: Account Enumeration Prevention
 * 
 * This module implements defense against account enumeration attacks by:
 * 1. Never revealing whether an email address is registered
 * 2. Never distinguishing between credential mismatch types
 * 3. Treating account-already-registered as success for signup
 * 4. Using identical user-facing messages for all auth failures
 * 5. Removing all conditional logic based on error type
 *
 * References:
 * - OWASP CWE-203: Information Exposure Through Discrepancy
 * - OWASP CWE-204: Observable Timing Discrepancy
 * - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
 */

// Single, unified error messages - no variation based on error type
export const GENERIC_AUTH_ERROR = 'Invalid email or password.';
export const GENERIC_SIGNUP_SUCCESS = 'Please check your email to complete setup.';
export const GENERIC_PASSWORD_RESET = 
  'If an account is registered with this email, you will receive a password reset link.';

/**
 * Universal auth error processor
 * 
 * Takes ANY error from any auth operation and returns the SAME message
 * to the user. Never reveals account registration through error messaging.
 * 
 * @param error - Any error from Supabase auth
 * @returns Object with user-safe message and server log info
 */
export function processAuthError(error: unknown): {
  userMessage: string;
  shouldLog: boolean;
  logContext?: string;
} {
  // Always return generic message regardless of error content
  // No checking, no branching on error type
  
  // Only log on server (for security monitoring, not shown to user)
  const shouldLog = true;
  
  const logContext = error instanceof Error 
    ? error.message 
    : String(error);

  return {
    userMessage: GENERIC_AUTH_ERROR,
    shouldLog,
    logContext,
  };
}

/**
 * Determines if an auth error indicates account already registered
 * Used ONLY to decide whether to show "Check email" vs error
 * 
 * This check is internal-only, result is NEVER shown to user
 */
function isAccountAlreadyRegisteredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const errorStr = JSON.stringify(error).toLowerCase();
  
  // Only check for account registration - don't reveal this in user message
  return errorStr.includes('already') || 
         errorStr.includes('duplicate') ||
         errorStr.includes('user_already');
}

/**
 * Signup handler that masks account-already-registered as success
 * 
 * If account is registered, we return success message (not error)
 * If account is new, signup proceeds normally
 * User CANNOT tell the difference
 */
export function processSignupResult(error: unknown | null): {
  userMessage: string;
  isSuccess: boolean;
} {
  // If no error, signup succeeded
  if (!error) {
    return {
      userMessage: GENERIC_SIGNUP_SUCCESS,
      isSuccess: true,
    };
  }

  // Check if error indicates account already registered
  const accountRegistered = isAccountAlreadyRegisteredError(error);
  
  // CRITICAL: Both paths return the SAME message
  // User cannot determine if account is registered or new
  return {
    userMessage: GENERIC_SIGNUP_SUCCESS,
    isSuccess: true, // Treat as success regardless
  };
}

/**
 * Rate limiting helper
 * Prevents brute force while maintaining uniform error messages
 */
const attemptMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(email: string, maxPerMinute: number = 5): {
  isLimited: boolean;
} {
  const now = Date.now();
  const window = 60000; // 1 minute
  
  let entry = attemptMap.get(email);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + window };
    attemptMap.set(email, entry);
  }
  
  entry.count++;
  
  return {
    isLimited: entry.count > maxPerMinute,
  };
}

export function clearRateLimit(email: string): void {
  attemptMap.delete(email);
}

/**
 * Server-side logging (never revealed to client)
 * 
 * Use this to log security events for monitoring,
 * but NEVER output results to frontend
 */
export function logAuthEventServer(
  event: 'signin_attempt' | 'signup_attempt' | 'password_reset',
  email: string,
  success: boolean,
  errorDetail?: string
): void {
  // Mask email for privacy
  const masked = email?.length > 3 
    ? email.substring(0, 3) + '***@***'
    : '***';

  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    email: masked,
    success,
    error: errorDetail || 'none',
  };

  // Output ONLY to console/server logs
  // DO NOT include raw error details that could reveal account info
  if (!success) {
    console.warn('[Security] Auth event:', logEntry.event, 'Status: Failed');
  }
  
  // TODO: Send to security monitoring service (Sentry, DataDog)
  // Example:
  // if (typeof window === 'undefined') {
  //   sendToSecurityMonitoring(logEntry);
  // }
}
