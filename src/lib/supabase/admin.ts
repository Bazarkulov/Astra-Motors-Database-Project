import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "./env";

/** Use only in trusted server code. This client bypasses Row Level Security. */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  return createSupabaseClient(url, getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
