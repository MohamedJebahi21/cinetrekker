const groups = {
  clientSupabase: ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
  serverSupabase: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  tmdb: ["TMDB_API_KEY"],
  rateLimiting: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  cron: ["CRON_SECRET"],
  baseUrl: ["APP_BASE_URL"],
};

const optionalGroups = {
  feedbackEmail: ["RESEND_API_KEY", "FEEDBACK_TO_EMAIL"],
  turnstile: ["VITE_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"],
  recaptcha: ["VITE_RECAPTCHA_SITE_KEY", "RECAPTCHA_SECRET_KEY"],
  browserMonitoring: ["VITE_SENTRY_DSN"],
  securityAlerts: ["SECURITY_ALERT_WEBHOOK_URL"],
};

const configured = (name) => typeof process.env[name] === "string" && process.env[name].trim().length > 0;
const missing = (names) => names.filter((name) => !configured(name));

const required = Object.fromEntries(
  Object.entries(groups).map(([group, names]) => [group, missing(names)]),
);
const optional = Object.fromEntries(
  Object.entries(optionalGroups).map(([group, names]) => [group, missing(names)]),
);
const hasRequiredGaps = Object.values(required).some((names) => names.length > 0);

console.log(
  JSON.stringify(
    {
      required,
      optional,
      status: hasRequiredGaps ? "blocked" : "ready_for_runtime_validation",
      note: "Only environment variable names are reported; values are never printed.",
    },
    null,
    2,
  ),
);

process.exitCode = hasRequiredGaps ? 1 : 0;
