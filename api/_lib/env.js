const SERVER_ENV_ALIASES = {
  APP_BASE_URL: ["APP_BASE_URL"],
  CRON_SECRET: ["CRON_SECRET"],
  OPENAI_API_KEY: ["OPENAI_API_KEY"],
  RECAPTCHA_SECRET_KEY: ["RECAPTCHA_SECRET_KEY"],
  SECURITY_ALERT_WEBHOOK_URL: ["SECURITY_ALERT_WEBHOOK_URL"],
  SUPABASE_ANON_KEY: [
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ],
  SUPABASE_SERVICE_ROLE_KEY: [
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_KEY",
  ],
  SUPABASE_URL: ["SUPABASE_URL", "VITE_SUPABASE_URL"],
  TMDB_API_KEY: ["TMDB_API_KEY", "VITE_TMDB_API_KEY"],
  TURNSTILE_SECRET_KEY: ["TURNSTILE_SECRET_KEY"],
};

function readRawEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function getAliasNames(name) {
  return SERVER_ENV_ALIASES[name] || [name];
}

export function resolveServerEnv(name) {
  const aliases = getAliasNames(name);

  for (const alias of aliases) {
    const value = readRawEnv(alias);
    if (value) {
      return { value, source: alias, aliases };
    }
  }

  return { value: "", source: null, aliases };
}

export function getServerEnv(name, defaultValue = "") {
  const resolved = resolveServerEnv(name);
  return resolved.value || defaultValue;
}

export function getRequiredServerEnv(name) {
  const resolved = resolveServerEnv(name);
  if (!resolved.value) {
    throw new Error(
      `Missing required environment variable: ${resolved.aliases.join(" or ")}`,
    );
  }
  return resolved.value;
}

export function getMissingServerEnv(names) {
  return names.flatMap((name) => {
    const resolved = resolveServerEnv(name);
    return resolved.value ? [] : [resolved.aliases.join(" or ")];
  });
}

export function isServerProduction() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}
