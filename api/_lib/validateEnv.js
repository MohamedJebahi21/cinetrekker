import {
  getMissingServerEnv,
  getServerEnv,
  isServerProduction,
} from "./env.js";
import { createServerLogger } from "./logger.js";

const logger = createServerLogger("env");

export function validateEnv(required) {
  if (!Array.isArray(required) || required.length === 0) {
    throw new Error(
      "validateEnv requires an array of environment variable names",
    );
  }

  const missing = getMissingServerEnv(required);

  if (missing.length === 0) {
    return;
  }

  if (!isServerProduction()) {
    logger.warn(
      `Missing environment variables in development: ${missing.join(", ")}.`,
    );
    logger.warn("Add them to .env.local or your Vercel environment settings.");
    return;
  }

  const errorMessage =
    `Missing required environment variables: ${missing.join(", ")}\n\n` +
    "Configure these in Vercel Dashboard:\n" +
    "  1. Go to: https://vercel.com/dashboard -> Your Project -> Settings\n" +
    "  2. Navigate to: Environment Variables\n" +
    "  3. Add each missing variable with its value\n" +
    "  4. Redeploy your application\n\n" +
    "See .env.example for variable descriptions and how to obtain API keys.";

  throw new Error(errorMessage);
}

export function validateEnvFormat(rules) {
  const errors = [];

  for (const [key, rule] of Object.entries(rules)) {
    const value = getServerEnv(key);

    if (!value) {
      errors.push(`${key}: Missing`);
      continue;
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${key}: ${rule.message || "Invalid format"}`);
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${key}: Must be at least ${rule.minLength} characters`);
    }
  }

  if (errors.length > 0) {
    logger.error("Environment variable validation errors:");
    errors.forEach((err) => logger.error(`  - ${err}`));

    if (isServerProduction()) {
      throw new Error(`Environment validation failed: ${errors.join("; ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isProduction() {
  return isServerProduction();
}

export function getEnv(key, defaultValue = "", required = false) {
  const value = getServerEnv(key);

  if (!value) {
    if (required && isServerProduction()) {
      throw new Error(`Required environment variable missing: ${key}`);
    }
    return defaultValue;
  }

  return value;
}
