import OpenAI from "openai";
import type { AgentConfig, ChatMessage } from "../types/index";
import { buildSystemPrompt } from "./buildSystemPrompt";

export interface GenerateReplyOptions {
  agent: AgentConfig;
  /** Histórico da conversa (sem a mensagem nova). Mais antigo -> mais recente. */
  history: ChatMessage[];
  /** Mensagem nova do usuário. */
  userMessage: string;
  /** Chave da API do provedor LLM (server-only). */
  apiKey: string;
  /** Base URL do provedor (compatível com OpenAI). Ex.: DashScope/Qwen, Groq, Gemini. */
  baseURL: string;
  /** Sobrescreve o modelo do agente (senão usa agent.model). */
  model?: string;
  /** Limita quantas mensagens do histórico entram no contexto (controla custo). */
  maxHistory?: number;
  /** Máximo de tokens da resposta. */
  maxTokens?: number;
  /** Cliente OpenAI reutilizável (opcional; senão criamos um). */
  client?: OpenAI;
}

const DEFAULT_MAX_HISTORY = 20;
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Núcleo único de geração de resposta do agente — compartilhado pelo chat de
 * teste (web) e pelo worker do WhatsApp. Aplica a "voz" (system prompt) e fala
 * com qualquer provedor compatível com a API da OpenAI (Qwen/DashScope, Groq,
 * Gemini, etc.) via baseURL configurável.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const {
    agent,
    history,
    userMessage,
    apiKey,
    baseURL,
    maxHistory = DEFAULT_MAX_HISTORY,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = opts;

  const client = opts.client ?? new OpenAI({ apiKey, baseURL });
  const system = buildSystemPrompt(agent);
  const model = opts.model || agent.model;

  const trimmedHistory = history.slice(-maxHistory);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages,
  });

  const text = response.choices[0]?.message?.content?.trim();
  return text || "Desculpe, não consegui gerar uma resposta agora.";
}
