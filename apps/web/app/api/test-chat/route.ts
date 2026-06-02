import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReply, type ChatMessage } from "@jotaduo/shared";

export const runtime = "nodejs";
export const maxDuration = 60;

const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export async function POST(request: Request) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "LLM_API_KEY não configurada." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const agentId: string = body?.agentId;
  const userMessage: string = (body?.message ?? "").trim();
  if (!agentId || !userMessage) {
    return NextResponse.json({ error: "agentId e message são obrigatórios." }, { status: 400 });
  }

  // RLS garante que só o dono (ou admin) lê este agente.
  const { data: agent } = await supabase
    .from("agents")
    .select("id, display_name, system_prompt, model, tone, skills, business_profile")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });

  // Conversa de teste (uma por agente).
  let { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agentId)
    .eq("channel", "test")
    .maybeSingle();
  if (!conv) {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ agent_id: agentId, channel: "test" })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Falha ao criar conversa." }, { status: 500 });
    }
    conv = created;
  }

  // Histórico
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  // Persiste a mensagem do usuário
  await supabase.from("messages").insert({ conversation_id: conv.id, role: "user", content: userMessage });

  let reply: string;
  try {
    reply = await generateReply({
      agent: {
        id: agent.id,
        displayName: agent.display_name,
        systemPrompt: agent.system_prompt,
        model: agent.model,
        tone: agent.tone,
        skills: agent.skills,
        businessProfile: agent.business_profile,
      },
      history: (history ?? []) as ChatMessage[],
      userMessage,
      apiKey,
      baseURL: LLM_BASE_URL,
      model: process.env.LLM_MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar o modelo.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase.from("messages").insert({ conversation_id: conv.id, role: "assistant", content: reply });

  return NextResponse.json({ reply });
}
