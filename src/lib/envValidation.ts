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

interface EnvConfig {
  // Client-side (public) - exposed to browser
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const requiredClientVars: (keyof EnvConfig)[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

/**
 * Validates that all required client-side environment variables are present
 * @throws {Error} In production if any required variables are missing
 * @returns {EnvConfig} Validated environment configuration
 */
export function validateClientEnv(): EnvConfig {
  const missing: string[] = [];
  
  requiredClientVars.forEach((key) => {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    const errorMsg = 
      `❌ Missing required environment variables:\n${missing.map(v => `   - ${v}`).join('\n')}\n\n` +
      `Please follow these steps:\n` +
      `  1. Copy .env.example to .env.local\n` +
      `  2. Fill in the missing values (see .env.example for instructions)\n` +
      `  3. Restart your development server\n\n` +
      `For production deployment:\n` +
      `  - Vercel: Add variables in Dashboard → Settings → Environment Variables\n` +
      `  - Use VITE_ prefix for client-side variables\n`;
    
    if (import.meta.env.PROD) {
      // In production, fail hard
      throw new Error(errorMsg);
    } else {
      // In development, warn but continue with placeholders
      console.warn('⚠️ Environment Validation Warning');
      console.warn(errorMsg);
      console.warn('Continuing with placeholder values...\n');
    }
  }

  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  };
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
  errorMsg: string
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

/**
 * Pre-validated environment configuration
 * Use this throughout your app to avoid repeated validation
 */
export const ENV = validateClientEnv();

// Validate format of environment variables (only if present)
if (ENV.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co') {
  validateEnvFormat(
    'VITE_SUPABASE_URL',
    ENV.VITE_SUPABASE_URL,
    /^https:\/\/.+\.supabase\.co$/,
    'Must be a valid Supabase URL (https://YOUR_PROJECT.supabase.co)'
  );
}

if (ENV.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key') {
  validateEnvFormat(
    'VITE_SUPABASE_ANON_KEY',
    ENV.VITE_SUPABASE_ANON_KEY,
    /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
    'Must be a valid JWT token (starts with eyJ)'
  );
}

// Log environment info on startup (development only)
if (isDevelopment()) {
  console.log('🔧 Environment Configuration:');
  console.log(`  - Mode: ${import.meta.env.MODE}`);
  console.log(`  - Supabase URL: ${ENV.VITE_SUPABASE_URL.replace(/https:\/\/([^.]+)\..*/, 'https://$1.supabase.co')}`);
  console.log(`  - Anon Key: ${ENV.VITE_SUPABASE_ANON_KEY.slice(0, 20)}...`);
}
