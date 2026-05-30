import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jotaduo/shared";

export type Agent = Tables<"agents">;
export type WhatsappConnection = Tables<"whatsapp_connections">;

/**
 * Retorna o agente do cliente logado (RLS garante que só o dele é retornado).
 * No MVP cada cliente tem no máximo um agente.
 */
export async function getMyAgent(): Promise<Agent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Retorna (criando sob demanda não — só lê) o estado de conexão do WhatsApp do agente. */
export async function getConnection(agentId: string): Promise<WhatsappConnection | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  return data ?? null;
}
