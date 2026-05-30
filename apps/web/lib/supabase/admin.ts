import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase com a SERVICE ROLE key — BYPASSA RLS.
 * USO ESTRITAMENTE SERVER-SIDE (route handlers / server actions de admin).
 * Nunca importar em código client. A chave nunca tem prefixo NEXT_PUBLIC.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase admin client: faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
