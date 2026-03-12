import { createClient } from "@supabase/supabase-js";

let adminClient;

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const serviceRoleKey =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_SERVICE_KEY");

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
  } catch {
    return { ok: false, status: 500, error: "Authentication service unavailable." };
  }
}
