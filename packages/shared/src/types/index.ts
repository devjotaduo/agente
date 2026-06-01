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
  /** Modelo do LLM (ex.: "qwen-plus"). */
  model: string;
  /** Tom de voz (ex.: "amigável", "formal"). Opcional. */
  tone?: string;
  /** Habilidades/competências do agente. Opcional. */
  skills?: string[];
  /** Dados opcionais da empresa e detalhes do template para contextualizar respostas. */
  businessProfile?: AgentBusinessProfile | null;
}

export interface AgentCatalogItem {
  name?: string;
  price?: string;
  details?: string;
}

export interface AgentBusinessProfile {
  companyName?: string;
  companyAddress?: string;
  companyInfo?: string;
  products?: AgentCatalogItem[];
  templateNotes?: {
    attendance?: string;
    sales?: string;
    postSales?: string;
    scheduling?: string;
    availability?: string;
    policies?: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}
