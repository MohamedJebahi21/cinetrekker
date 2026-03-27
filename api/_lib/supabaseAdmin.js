import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env.js";
import { createServerLogger } from "./logger.js";
import { reportSecurityEvent } from "./securityMonitor.js";

let adminClient;
const logger = createServerLogger("supabase-admin");
let authUserResolver = async (accessToken) => {
  const supabase = getSupabaseAdminClient();
  return supabase.auth.getUser(accessToken);
};

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = getServerEnv("SUPABASE_URL");
  const serviceRoleKey = getServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

export async function authenticateRequest(req) {
  const authHeader = req?.headers?.authorization;
  const tokenMatch =
    typeof authHeader === "string"
      ? authHeader.match(/^Bearer\s+(.+)$/i)
      : null;

  const accessToken = tokenMatch?.[1]?.trim();
  if (!accessToken) {
    await reportSecurityEvent({
      event: "auth_missing_bearer_token",
      severity: "warning",
      scope: "auth",
      message: "Request missing bearer token.",
      req,
      shouldAlert: false,
    });
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  try {
    const { data, error } = await authUserResolver(accessToken);

    if (error || !data?.user?.id) {
      await reportSecurityEvent({
        event: "auth_invalid_token",
        severity: "warning",
        scope: "auth",
        message: "Invalid or expired bearer token rejected.",
        req,
        details: error ? { message: error.message } : undefined,
        shouldAlert: false,
      });
      return { ok: false, status: 401, error: "Invalid or expired token." };
    }

    return { ok: true, userId: data.user.id };
  } catch (error) {
    logger.error("Failed to authenticate request.", error);
    await reportSecurityEvent({
      event: "auth_service_unavailable",
      severity: "error",
      scope: "auth",
      message: "Authentication service unavailable.",
      req,
      details: error,
      shouldAlert: true,
    });
    return {
      ok: false,
      status: 500,
      error: "Authentication service unavailable.",
    };
  }
}

export function setAuthUserResolverForTests(resolver) {
  authUserResolver = resolver;
}

export function resetAuthUserResolverForTests() {
  authUserResolver = async (accessToken) => {
    const supabase = getSupabaseAdminClient();
    return supabase.auth.getUser(accessToken);
  };
}
