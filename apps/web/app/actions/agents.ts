"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateAgentInput {
  id: string;
  display_name: string;
  system_prompt: string;
  model?: string;
}

/** Atualiza voz/nome/modelo do agente. RLS garante que só dono ou admin consegue. */
export async function updateAgent(input: UpdateAgentInput): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({
      display_name: input.display_name.trim(),
      system_prompt: input.system_prompt,
      ...(input.model ? { model: input.model } : {}),
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath(`/admin/agents/${input.id}`);
  return { ok: true };
}

/** Solicita conexão do WhatsApp (o worker assume a partir daqui). */
export async function requestWhatsappConnect(
  agentId: string,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_connections")
    .update({ connect_requested: true, status: "qr_pending", last_error: null, qr_code: null })
    .eq("agent_id", agentId);
  if (error) return { error: error.message };
  revalidatePath("/app/whatsapp");
  return { ok: true };
}

/** Solicita desconexão do WhatsApp. */
export async function requestWhatsappDisconnect(
  agentId: string,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_connections")
    .update({ connect_requested: false, status: "logged_out", qr_code: null })
    .eq("agent_id", agentId);
  if (error) return { error: error.message };
  revalidatePath("/app/whatsapp");
  return { ok: true };
}
