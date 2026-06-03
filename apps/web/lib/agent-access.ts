import { createClient } from "@/lib/supabase/server";

/**
 * Verifica se o usuário logado pode gerenciar o agente informado:
 * é admin OU é o dono (owner_id) do agente. Retorna o userId se autorizado,
 * ou null caso contrário. Usado pelas rotas de posts/Instagram (admin + cliente).
 */
export async function authorizeAgentAccess(
  agentId: string,
): Promise<{ userId: string; isAdmin: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role === "admin") return { userId: user.id, isAdmin: true };

  if (!agentId) return null;
  const { data: owned } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  return owned ? { userId: user.id, isAdmin: false } : null;
}
