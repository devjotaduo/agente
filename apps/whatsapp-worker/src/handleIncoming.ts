import { generateReply } from "@jotaduo/shared/agent";
import type { AgentBusinessProfile, ChatMessage, Tables } from "@jotaduo/shared/types";
import { supabase } from "./lib/supabase.js";

const LLM_API_KEY = process.env.LLM_API_KEY!;
const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const LLM_MODEL = process.env.LLM_MODEL;

type Agent = Pick<
  Tables<"agents">,
  "id" | "display_name" | "system_prompt" | "model" | "tone" | "skills" | "business_profile"
>;

/**
 * Processa uma mensagem recebida no WhatsApp:
 * resolve a conversa (channel='whatsapp', external_id=jid), carrega histórico,
 * gera a resposta com Claude (mesmo núcleo do chat de teste) e persiste tudo.
 * Retorna o texto a enviar (ou null em caso de erro).
 */
export async function handleIncoming(agent: Agent, jid: string, text: string): Promise<string | null> {
  // Conversa por (agente, whatsapp, jid)
  let { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("channel", "whatsapp")
    .eq("external_id", jid)
    .maybeSingle();

  if (!conv) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({ agent_id: agent.id, channel: "whatsapp", external_id: jid })
      .select("id")
      .single();
    conv = created;
  }
  if (!conv) return null;

  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  await supabase.from("messages").insert({ conversation_id: conv.id, role: "user", content: text });

  try {
    const reply = await generateReply({
      agent: {
        id: agent.id,
        displayName: agent.display_name,
        systemPrompt: agent.system_prompt,
        model: agent.model,
        tone: agent.tone,
        skills: agent.skills,
        businessProfile: agent.business_profile as AgentBusinessProfile,
      },
      history: (history ?? []) as ChatMessage[],
      userMessage: text,
      apiKey: LLM_API_KEY,
      baseURL: LLM_BASE_URL,
      model: LLM_MODEL,
    });

    await supabase
      .from("messages")
      .insert({ conversation_id: conv.id, role: "assistant", content: reply });

    return reply;
  } catch (err) {
    console.error(`[worker] erro ao gerar resposta (agent ${agent.id}):`, err);
    return null;
  }
}
