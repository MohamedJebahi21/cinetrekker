/**
 * Environment Variable Validation Utility
 * 
 * Validates required environment variables for serverless functions
 * Throws descriptive errors if any are missing in production
 * 
 * Usage:
 * ```javascript
 * const { validateEnv } = require('./_lib/validateEnv');
 * 
 * // At the top of your serverless function
 * validateEnv(['OPENAI_API_KEY', 'TMDB_API_KEY']);
 * ```
 */

/**
 * Validates that required environment variables are set
 * @param {string[]} required - Array of required environment variable names
 * @throws {Error} In production if any required variables are missing
 */
function validateEnv(required) {
  if (!Array.isArray(required) || required.length === 0) {
    throw new Error('validateEnv requires an array of environment variable names');
  }

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length === 0) {
    // All required variables present
    return;
  }

  // In development, log warning but don't throw
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `⚠️  Missing environment variables in development: ${missing.join(', ')}\n` +
      `   Add these to your .env.local file (see .env.example for reference)`
    );
    return;
  }

  // In production, throw error
  const errorMessage = 
    `❌ Missing required environment variables: ${missing.join(', ')}\n\n` +
    `Configure these in Vercel Dashboard:\n` +
    `  1. Go to: https://vercel.com/dashboard → Your Project → Settings\n` +
    `  2. Navigate to: Environment Variables\n` +
    `  3. Add each missing variable with its value\n` +
    `  4. Redeploy your application\n\n` +
    `See .env.example for variable descriptions and how to obtain API keys.`;
  
  throw new Error(errorMessage);
}

/**
 * Validates that environment variables match expected patterns
 * @param {Object} rules - Object mapping env var names to validation rules
 * @returns {Object} Validation results
 * 
 * Example:
 * ```javascript
 * validateEnvFormat({
 *   OPENAI_API_KEY: { pattern: /^sk-/, message: 'OpenAI key must start with sk-' },
 *   SUPABASE_URL: { pattern: /^https:\/\/.+\.supabase\.co$/, message: 'Invalid Supabase URL' }
 * });
 * ```
 */
function validateEnvFormat(rules) {
  const errors = [];

  for (const [key, rule] of Object.entries(rules)) {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`${key}: Missing`);
      continue;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${key}: ${rule.message || 'Invalid format'}`);
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${key}: Must be at least ${rule.minLength} characters`);
    }
  }

  if (errors.length > 0) {
    console.error('Environment variable validation errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${errors.join('; ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Checks if running in a production environment
 * @returns {boolean}
 */
function isProduction() {
  return process.env.NODE_ENV === 'production' || 
         process.env.VERCEL_ENV === 'production';
}

/**
 * Gets environment variable with fallback and optional validation
 * @param {string} key - Environment variable name
 * @param {string} [defaultValue] - Fallback value if not set
 * @param {boolean} [required=false] - Throw error if missing in production
 * @returns {string}
 */
function getEnv(key, defaultValue = '', required = false) {
  const value = process.env[key];

  if (!value) {
    if (required && isProduction()) {
      throw new Error(`Required environment variable missing: ${key}`);
    }
    return defaultValue;
  }

  return value;
}

module.exports = {
  validateEnv,
  validateEnvFormat,
  isProduction,
  getEnv,
};
