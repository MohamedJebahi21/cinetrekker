import { logger } from "./logger";

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "placeholder-anon-key";
const DEV_TMDB_PROXY_PATH = "/functions/v1/tmdb-proxy";
const PROD_TMDB_PROXY_PATH = "/api/tmdb-proxy";

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
      `Missing required environment variables:\n${missing.map((value) => `   - ${value}`).join("\n")}\n\n` +
      "Please follow these steps:\n" +
      "  1. Copy .env.example to .env.local\n" +
      "  2. Fill in the missing values (see .env.example for instructions)\n" +
      "  3. Restart your development server\n\n" +
      "For production deployment:\n" +
      "  - Vercel: Add variables in Dashboard -> Settings -> Environment Variables\n" +
      "  - Use VITE_ prefix for client-side variables\n";

    if (!import.meta.env.PROD) {
      logger.warn("Environment validation warning.");
      logger.warn(errorMsg);
      logger.warn("Continuing with placeholder values.");
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
    }

    logger.warn(msg);
  }
}

export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

export function isDevelopment(): boolean {
  return import.meta.env.DEV === true;
}

export function getTmdbProxyUrl(): string {
  return isDevelopment() ? DEV_TMDB_PROXY_PATH : PROD_TMDB_PROXY_PATH;
}

function isEnvDebugEnabled(): boolean {
  return import.meta.env.VITE_ENV_DEBUG === "true";
}

export const ENV = validateClientEnv();

const JWT_PREFIX = "eyJ";
const JWT_PATTERN = new RegExp(
  `^${JWT_PREFIX}[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$`,
);

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

if (isDevelopment() && isEnvDebugEnabled()) {
  logger.debug("Environment Configuration:");
  logger.debug(`  - Mode: ${import.meta.env.MODE}`);
  logger.debug(
    `  - Supabase URL: ${ENV.VITE_SUPABASE_URL.replace(/https:\/\/([^.]+)\..*/, "https://$1.supabase.co")}`,
  );
}
