"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AgentBusinessProfile } from "@jotaduo/shared";

export interface UpdateAgentInput {
  id: string;
  display_name: string;
  system_prompt: string;
  model?: string;
  tone?: string;
  skills?: string[];
  business_profile?: AgentBusinessProfile;
}

/** Atualiza voz/nome/tom/skills do agente. RLS garante que só dono ou admin consegue. */
export async function updateAgent(input: UpdateAgentInput): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agents")
    .update({
      display_name: input.display_name.trim(),
      system_prompt: input.system_prompt,
      ...(input.model ? { model: input.model } : {}),
      ...(input.tone !== undefined ? { tone: input.tone.trim() } : {}),
      ...(input.skills !== undefined ? { skills: input.skills } : {}),
      ...(input.business_profile !== undefined ? { business_profile: input.business_profile } : {}),
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
