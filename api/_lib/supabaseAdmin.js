import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./env.js";
import { createServerLogger } from "./logger.js";

let adminClient;
const logger = createServerLogger("supabase-admin");

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
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data?.user?.id) {
      return { ok: false, status: 401, error: "Invalid or expired token." };
    }

    return { ok: true, userId: data.user.id };
  } catch (error) {
    logger.error("Failed to authenticate request.", error);
    return {
      ok: false,
      status: 500,
      error: "Authentication service unavailable.",
    };
  }
}
