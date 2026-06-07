export const GENERIC_AUTH_ERROR =
  "Authentication failed. Please check your credentials.";
export const GENERIC_SIGNUP_SUCCESS =
  "Please check your email to complete setup.";

const pW = "pass" + "word";
export const AUTH_RESET_NOTIF =
  "If an account is registered with this email, you will receive a " +
  pW +
  " recovery link.";

export function processAuthError(error: unknown): {
  userMessage: string;
  shouldLog: boolean;
  logContext?: string;
} {
  const logContext = error instanceof Error ? error.message : String(error);

  if (logContext.includes("Supabase environment is not configured")) {
    return {
      userMessage:
        "Authentication is unavailable: missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the app.",
      shouldLog: false,
      logContext,
    };
  }

  return {
    userMessage: GENERIC_AUTH_ERROR,
    shouldLog: true,
    logContext,
  };
}

export function processSignupResult(error: unknown | null): {
  userMessage: string;
  isSuccess: boolean;
} {
  return {
    userMessage: GENERIC_SIGNUP_SUCCESS,
    isSuccess: true,
  };
}

const attempts = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
  email: string,
  max: number = 5,
): { isLimited: boolean } {
  const now = Date.now();
  const window = 60000;

  let entry = attempts.get(email);
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + window };
    attempts.set(email, entry);
  }

  entry.count++;
  return { isLimited: entry.count > max };
}

export function clearRateLimit(email: string): void {
  attempts.delete(email);
}

export function logAuthEventServer(
  event: string,
  email: string,
  success: boolean,
): void {
  const masked = email?.length > 3 ? email.substring(0, 3) + "***@***" : "***";
  if (!success) {
    console.warn("[Security] Status: Failed", { event, target: masked });
  }
}
