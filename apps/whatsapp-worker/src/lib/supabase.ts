import { createClient } from "@supabase/supabase-js";
import type { Database } from "@jotaduo/shared/types";

const url = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error("Worker: faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env");
}

/** Client com service_role — BYPASSA RLS. Só existe no ambiente do worker. */
export const supabase = createClient<Database>(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
