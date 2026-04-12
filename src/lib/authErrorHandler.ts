export const GENERIC_AUTH_ERROR =
  "Authentication failed. Please check your credentials.";
export const GENERIC_SIGNUP_SUCCESS =
  "Registration successful! Please check your email (including spam) for a confirmation link to activate your account.";

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
  const candidate =
    error && typeof error === "object"
      ? (error as {
          code?: string | number;
          status?: string | number;
          message?: string;
        })
      : null;
  const logContext = error instanceof Error ? error.message : String(error);
  const errorCode =
    candidate?.code?.toString() || candidate?.status?.toString();
  const errorMessage = candidate?.message?.toLowerCase() || "";

  if (logContext.includes("Supabase environment is not configured")) {
    return {
      userMessage:
        "Authentication is unavailable: missing Supabase configuration. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the app.",
      shouldLog: false,
      logContext,
    };
  }

  // Handle common Supabase errors
  if (errorMessage.includes("invalid login credentials")) {
    return {
      userMessage: "Invalid email or password. Please try again.",
      shouldLog: false,
      logContext,
    };
  }

  if (errorMessage.includes("user already registered")) {
    return {
      userMessage: "An account with this email already exists.",
      shouldLog: false,
      logContext,
    };
  }

  if (errorMessage.includes("rate limit") || errorCode === "429") {
    return {
      userMessage:
        "Too many attempts. Please wait a moment before trying again.",
      shouldLog: true,
      logContext,
    };
  }

  if (errorMessage.includes("email_address_invalid") || errorMessage.includes("invalid email")) {
    return {
      userMessage: "This email address or domain is not supported. Please try a different email (e.g., Gmail).",
      shouldLog: false,
      logContext,
    };
  }

  if (errorMessage.includes("email not confirmed") || errorMessage.includes("confirmation_sent")) {
    return {
      userMessage: "Please check your email and click the confirmation link before signing in.",
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

export function processSignupResult(): {
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
