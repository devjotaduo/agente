// Tipos de domínio compartilhados entre web e worker.
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database";

export type AppRole = "admin" | "client";

export type ConnStatus =
  | "disconnected"
  | "qr_pending"
  | "connecting"
  | "connected"
  | "logged_out"
  | "error";

export type ChatRole = "user" | "assistant";

export interface AgentConfig {
  id: string;
  /** Nome pelo qual o agente atende (ex.: "Júlia"). */
  displayName: string;
  /** A "voz": instruções de como o agente responde/age. Vira o system prompt. */
  systemPrompt: string;
  /** Modelo Claude (ex.: "claude-haiku-4-5"). */
  model: string;
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}
