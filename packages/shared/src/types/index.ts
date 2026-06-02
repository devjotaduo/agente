// Tipos de dominio compartilhados entre web e worker.
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
  /** Nome pelo qual o agente atende. */
  displayName: string;
  /** A voz: instrucoes de como o agente responde/age. */
  systemPrompt: string;
  /** Tom curto escolhido no painel, quando existir. */
  tone?: string | null;
  /** Modelo LLM. */
  model: string;
}

export interface AgentCatalogItem {
  name?: string;
  price?: string;
  details?: string;
}

export interface AgentBusinessProfile {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyWebsite?: string;
  openingHours?: string;
  companyInfo?: string;
  products?: AgentCatalogItem[];
  templateNotes?: {
    attendance?: string;
    sales?: string;
    postSales?: string;
    scheduling?: string;
    availability?: string;
    policies?: string;
    faq?: string;
    escalation?: string;
    delivery?: string;
    payment?: string;
    bookingRequiredData?: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}
