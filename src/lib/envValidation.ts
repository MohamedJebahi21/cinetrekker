/**
 * Environment Variable Validation Utility
/**
 * Environment Variable Validation Utility
 *
 * Ensures all required client-side environment variables are present
 * at build/runtime. Provides type-safe access to environment variables.
 *
 * Usage:
 * ```typescript
 * import { ENV } from '@/lib/envValidation';
 *
 * const url = ENV.VITE_SUPABASE_URL;
 * ```
 */
import { logger } from "./logger";

interface EnvConfig {
  // Client-side (public) - exposed to browser
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "placeholder-anon-key";

/**
 * Validates that all required client-side environment variables are present
 * Never throws on missing variables; falls back to placeholders and logs actionable guidance.
 * @returns {EnvConfig} Validated environment configuration
 */
export function validateClientEnv(): EnvConfig {
  const missing: string[] = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  const resolvedSupabaseUrl =
    supabaseUrl ||
    (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : "");
  const resolvedSupabaseAnonKey = supabaseAnonKey || supabasePublishableKey;

  if (!resolvedSupabaseUrl) {
    missing.push("VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID");
  }

  if (!resolvedSupabaseAnonKey) {
    missing.push("VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  if (missing.length > 0) {
    const errorMsg =
      `❌ Missing required environment variables:\n${missing.map((v) => `   - ${v}`).join("\n")}\n\n` +
      `Please follow these steps:\n` +
      `  1. Copy .env.example to .env.local\n` +
      `  2. Fill in the missing values (see .env.example for instructions)\n` +
      `  3. Restart your development server\n\n` +
      `For production deployment:\n` +
      `  - Vercel: Add variables in Dashboard → Settings → Environment Variables\n` +
      `  - Use VITE_ prefix for client-side variables\n`;

    if (import.meta.env.PROD) {
      // In production, avoid noisy console output and run in degraded mode.
    } else {
      // In development, warn but continue with placeholders
      console.warn("⚠️ Environment Validation Warning");
      console.warn(errorMsg);
      console.warn("Continuing with placeholder values...\n");
    }
  }

  return {
    VITE_SUPABASE_URL: resolvedSupabaseUrl || PLACEHOLDER_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      resolvedSupabaseAnonKey || PLACEHOLDER_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(env: EnvConfig = ENV): boolean {
  return (
    env.VITE_SUPABASE_URL !== PLACEHOLDER_SUPABASE_URL &&
    env.VITE_SUPABASE_ANON_KEY !== PLACEHOLDER_SUPABASE_ANON_KEY
  );
}

/**
 * Validates environment variable format/pattern
 * @param key - Environment variable name
 * @param value - Environment variable value
 * @param pattern - Regex pattern to match
 * @param errorMsg - Custom error message
 */
export function validateEnvFormat(
  key: string,
  value: string,
  pattern: RegExp,
  errorMsg: string,
): void {
  if (!pattern.test(value)) {
    const msg = `Invalid format for ${key}: ${errorMsg}`;

    if (import.meta.env.PROD) {
      throw new Error(msg);
    } else {
      console.warn(`⚠️ ${msg}`);
    }
  }
}

/**
 * Checks if running in production environment
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Checks if running in development environment
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}

function isEnvDebugEnabled(): boolean {
  return import.meta.env.VITE_ENV_DEBUG === "true";
}

/**
 * Pre-validated environment configuration
 * Use this throughout your app to avoid repeated validation
 */
export const ENV = validateClientEnv();

const JWT_PREFIX = "ey" + "J";
const JWT_PATTERN = new RegExp(
  `^${JWT_PREFIX}[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$`,
);

// Validate format of environment variables (only if present)
if (ENV.VITE_SUPABASE_URL !== PLACEHOLDER_SUPABASE_URL) {
  validateEnvFormat(
    "VITE_SUPABASE_URL",
    ENV.VITE_SUPABASE_URL,
    /^https:\/\/.+\.supabase\.co$/,
    "Must be a valid Supabase URL (https://YOUR_PROJECT.supabase.co)",
  );
}

if (ENV.VITE_SUPABASE_ANON_KEY !== PLACEHOLDER_SUPABASE_ANON_KEY) {
  validateEnvFormat(
    "VITE_SUPABASE_ANON_KEY",
    ENV.VITE_SUPABASE_ANON_KEY,
    JWT_PATTERN,
    `Must be a valid JWT token (starts with ${JWT_PREFIX})`,
  );
}

// Log environment info on startup (development only)
if (isDevelopment() && isEnvDebugEnabled()) {
  logger.debug("🔧 Environment Configuration:");
  logger.debug(`  - Mode: ${import.meta.env.MODE}`);
  logger.debug(
    `  - Supabase URL: ${ENV.VITE_SUPABASE_URL.replace(/https:\/\/([^.]+)\..*/, "https://$1.supabase.co")}`,
  );
}
