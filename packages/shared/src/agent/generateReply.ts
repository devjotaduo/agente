import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, ChatMessage } from "../types/index";
import { buildSystemPrompt } from "./buildSystemPrompt";

export interface GenerateReplyOptions {
  agent: AgentConfig;
  /** Histórico da conversa (sem a mensagem nova). Mais antigo -> mais recente. */
  history: ChatMessage[];
  /** Mensagem nova do usuário. */
  userMessage: string;
  /** Chave da API Anthropic (server-only). */
  apiKey: string;
  /** Limita quantas mensagens do histórico entram no contexto (controla custo). */
  maxHistory?: number;
  /** max_tokens da resposta. */
  maxTokens?: number;
  /** Cliente Anthropic reutilizável (opcional; senão criamos um). */
  client?: Anthropic;
}

const DEFAULT_MAX_HISTORY = 20;
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Núcleo único de geração de resposta do agente — compartilhado pelo chat de
 * teste (web) e pelo worker do WhatsApp. Aplica a "voz" (system prompt),
 * usa prompt caching no system (estável) e limita a janela de histórico.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const {
    agent,
    history,
    userMessage,
    apiKey,
    maxHistory = DEFAULT_MAX_HISTORY,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = opts;

  const client = opts.client ?? new Anthropic({ apiKey });
  const system = buildSystemPrompt(agent);

  const trimmedHistory = history.slice(-maxHistory);
  const messages: Anthropic.MessageParam[] = [
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: agent.model || "claude-haiku-4-5",
    max_tokens: maxTokens,
    // Prompt caching no system: a "voz" é estável entre turnos -> corta custo de input.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  return text || "Desculpe, não consegui gerar uma resposta agora.";
}
