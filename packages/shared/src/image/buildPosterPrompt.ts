import OpenAI from "openai";
import type { AgentConfig } from "../types/index";

export interface BuildPosterPromptOptions {
  /** Agente "dono" do post (dá identidade/voz ao texto da legenda). */
  agent: Pick<AgentConfig, "displayName" | "tone" | "systemPrompt">;
  /** Pedido do admin em linguagem natural (ex.: "promoção de pizza na sexta"). */
  briefing: string;
  /** Chave da API do provedor LLM (server-only). */
  apiKey: string;
  /** Base URL compatível com OpenAI (ex.: DashScope). */
  baseURL: string;
  /** Modelo de texto (ex.: "qwen-plus"). */
  model: string;
  client?: OpenAI;
}

export interface PosterCreative {
  /** Prompt visual (em inglês — os modelos de imagem respondem melhor) para o gerador. */
  imagePrompt: string;
  /** Legenda do post em PT-BR, já com hashtags. */
  caption: string;
}

const SYSTEM = `Você é um diretor de arte e redator publicitário. A partir de um briefing,
você cria UM post para o feed do Instagram (imagem quadrada 1:1).

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato:
{
  "imagePrompt": "<descrição visual detalhada EM INGLÊS para um modelo texto-para-imagem>",
  "caption": "<legenda em português do Brasil, com 1-2 emojis quando fizer sentido e 3-6 hashtags relevantes no final>"
}

Regras para "imagePrompt":
- Escreva em inglês, descritivo e concreto (cena, estilo, cores, iluminação, composição).
- Peça um pôster/anúncio com aparência profissional, alta qualidade, "vertical centered composition, social media poster".
- NÃO peça para renderizar texto/letras dentro da imagem (modelos erram texto). Foque no visual.
- Sem marcas registradas, logos de terceiros, rostos de pessoas reais ou conteúdo sensível.

Regras para "caption":
- Português do Brasil, tom condizente com a marca, chamada para ação clara.
- Não use aspas duplas dentro do texto.`;

/**
 * Transforma o briefing do admin em (a) um prompt visual para o gerador de
 * imagem e (b) a legenda do post — usando o mesmo LLM do resto do produto.
 * Faz fallback seguro caso o modelo não devolva JSON válido.
 */
export async function buildPosterCreative(
  opts: BuildPosterPromptOptions,
): Promise<PosterCreative> {
  const { agent, briefing, apiKey, baseURL, model } = opts;
  const client = opts.client ?? new OpenAI({ apiKey, baseURL });

  const contexto = [
    `Marca/agente: ${agent.displayName || "—"}.`,
    agent.tone ? `Tom de voz: ${agent.tone}.` : "",
    agent.systemPrompt ? `Sobre a marca: ${agent.systemPrompt.slice(0, 600)}` : "",
    "",
    `Briefing do post: ${briefing}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client.chat.completions.create({
    model,
    max_tokens: 700,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: contexto },
    ],
  });

  const raw = res.choices[0]?.message?.content?.trim() ?? "";
  const parsed = safeParseCreative(raw);
  if (parsed) return parsed;

  // Fallback: usa o briefing como prompt e uma legenda simples.
  return {
    imagePrompt: `High quality professional social media poster, vertical centered composition, vibrant colors, clean modern design. Theme: ${briefing}`,
    caption: briefing,
  };
}

/** Extrai o primeiro objeto JSON da resposta (tolera cercas de markdown / texto ao redor). */
function safeParseCreative(raw: string): PosterCreative | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    const imagePrompt = typeof obj.imagePrompt === "string" ? obj.imagePrompt.trim() : "";
    const caption = typeof obj.caption === "string" ? obj.caption.trim() : "";
    if (!imagePrompt) return null;
    return { imagePrompt, caption };
  } catch {
    return null;
  }
}
