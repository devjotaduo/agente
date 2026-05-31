/**
 * Geração de imagem via DashScope / Alibaba Model Studio (região internacional).
 * Usa a MESMA conta/chave do LLM de texto (LLM_API_KEY).
 *
 * Os modelos de imagem atuais (família `qwen-image`, ex.: qwen-image-2.0) são
 * servidos pelo endpoint SÍNCRONO de multimodal-generation — diferente do
 * antigo `text2image/image-synthesis` (assíncrono) dos modelos `wanx*`, que não
 * existem mais nesta conta. A resposta traz a URL da imagem direto (sem polling).
 *
 * O endpoint nativo fica em `.../api/v1` (não no compatível-OpenAI
 * `.../compatible-mode/v1`); convertemos a base automaticamente.
 */

const DEFAULT_NATIVE_BASE = "https://dashscope-intl.aliyuncs.com/api/v1";
const DEFAULT_MODEL = "qwen-image-2.0";

export interface GeneratePosterOptions {
  /** Prompt visual (em inglês de preferência). */
  prompt: string;
  /** Coisas a evitar (opcional). */
  negativePrompt?: string;
  /** Chave da API DashScope (a mesma LLM_API_KEY). */
  apiKey: string;
  /** Modelo de imagem (padrão: qwen-image-2.0). */
  model?: string;
  /** Tamanho "LxA" (padrão 1024x1024). Convertido para o formato "L*A" do DashScope. */
  size?: string;
  /**
   * Base do DashScope. Se você passar a base compatível-OpenAI
   * (.../compatible-mode/v1) nós a normalizamos para .../api/v1.
   */
  baseURL?: string;
}

export interface GeneratedImage {
  /** URL temporário da imagem no OSS do DashScope (expira em ~24h). */
  url: string;
  /** Bytes da imagem baixada (para rehospedar em armazenamento próprio). */
  bytes: Uint8Array;
  /** Content-Type retornado no download (ex.: image/png). */
  contentType: string;
}

/** Normaliza a base para o endpoint nativo `/api/v1`. */
function nativeBase(baseURL?: string): string {
  if (!baseURL) return DEFAULT_NATIVE_BASE;
  const root = baseURL
    .replace(/\/compatible-mode\/v1\/?$/, "")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");
  return `${root}/api/v1`;
}

/** "1024x1024" -> "1024*1024" (formato do DashScope). */
function toDashScopeSize(size?: string): string {
  const s = (size ?? "1024x1024").toLowerCase().replace("×", "x");
  return s.includes("x") ? s.replace("x", "*") : "1024*1024";
}

export async function generatePosterImage(
  opts: GeneratePosterOptions,
): Promise<GeneratedImage> {
  const { prompt, negativePrompt, apiKey, model = DEFAULT_MODEL, size, baseURL } = opts;

  if (!apiKey) throw new Error("generatePosterImage: apiKey ausente.");
  if (!prompt?.trim()) throw new Error("generatePosterImage: prompt vazio.");

  const base = nativeBase(baseURL);

  // Geração síncrona (multimodal-generation): a resposta já traz a URL da imagem.
  const res = await fetch(`${base}/services/aigc/multimodal-generation/generation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [{ role: "user", content: [{ text: prompt.slice(0, 1200) }] }],
      },
      parameters: {
        size: toDashScopeSize(size),
        n: 1,
        ...(negativePrompt ? { negative_prompt: negativePrompt.slice(0, 500) } : {}),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`DashScope (imagem) falhou (${res.status}): ${await safeText(res)}`);
  }

  const json: any = await res.json();
  if (json?.code) {
    throw new Error(`DashScope (imagem): ${json.code} — ${json.message ?? ""}`);
  }

  const imageUrl = extractImageUrl(json);
  if (!imageUrl) {
    throw new Error(`DashScope não retornou imagem: ${JSON.stringify(json).slice(0, 300)}`);
  }

  // Baixa os bytes para rehospedar em armazenamento próprio (URL estável).
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Falha ao baixar a imagem gerada (${imgRes.status}).`);
  }
  const contentType = imgRes.headers.get("content-type") ?? "image/png";
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  return { url: imageUrl, bytes, contentType };
}

/** Extrai a URL da imagem da resposta multimodal do DashScope. */
function extractImageUrl(json: any): string | undefined {
  const content = json?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const item = content.find((c: any) => c?.image || c?.image_url);
    const url = item?.image ?? item?.image_url;
    if (typeof url === "string") return url;
  }
  // Fallback p/ outros formatos (ex.: text2image results[].url).
  const results = json?.output?.results;
  if (Array.isArray(results)) {
    const r = results.find((x: any) => x?.url);
    if (r?.url) return r.url;
  }
  return undefined;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "<sem corpo>";
  }
}
