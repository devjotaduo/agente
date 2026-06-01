/**
 * Publicação no Instagram via Graph API (contas Business/Creator).
 *
 * Fluxo oficial em 2 passos:
 *   1) cria um "media container" com image_url + caption
 *   2) publica o container (media_publish)
 * A imagem PRECISA estar acessível por um URL público (a Graph API a busca).
 */

const GRAPH_VERSION = "v21.0";
/** graph.facebook.com -> conexão via Página; graph.instagram.com -> login direto do IG. */
const FACEBOOK_GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface PublishPhotoOptions {
  /** ID da conta Instagram Business/Creator (IG User ID). */
  igUserId: string;
  /** Token de acesso de longa duração. */
  accessToken: string;
  /** URL público da imagem (JPEG/PNG). */
  imageUrl: string;
  /** Legenda do post. */
  caption?: string;
  /**
   * Host base da Graph API, já com versão. Padrão graph.facebook.com (conexão
   * via Página). Para login direto do Instagram use https://graph.instagram.com/v21.0.
   */
  graphBase?: string;
  /** Tentativas de polling do container até ficar FINISHED (padrão 10). */
  maxStatusChecks?: number;
  pollIntervalMs?: number;
}

export interface PublishResult {
  mediaId: string;
  permalink: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function publishPhotoToInstagram(
  opts: PublishPhotoOptions,
): Promise<PublishResult> {
  const {
    igUserId,
    accessToken,
    imageUrl,
    caption = "",
    graphBase = FACEBOOK_GRAPH_BASE,
    maxStatusChecks = 10,
    pollIntervalMs = 2_000,
  } = opts;

  if (!igUserId) throw new Error("Instagram: igUserId ausente.");
  if (!accessToken) throw new Error("Instagram: accessToken ausente.");
  if (!imageUrl) throw new Error("Instagram: imageUrl ausente.");

  // 1) Cria o container.
  const createBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const createJson = await graphPost(`${graphBase}/${igUserId}/media`, createBody);
  const creationId: string | undefined = createJson?.id;
  if (!creationId) {
    throw new Error("Instagram: não retornou creation_id do container.");
  }

  // 2) Aguarda o container ficar pronto (FINISHED) antes de publicar.
  await waitContainerReady(graphBase, creationId, accessToken, maxStatusChecks, pollIntervalMs);

  // 3) Publica.
  const publishBody = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const publishJson = await graphPost(`${graphBase}/${igUserId}/media_publish`, publishBody);
  const mediaId: string | undefined = publishJson?.id;
  if (!mediaId) {
    throw new Error("Instagram: publicação não retornou o media_id.");
  }

  // 4) Busca o permalink (best-effort).
  const permalink = await getPermalink(graphBase, mediaId, accessToken).catch(() => null);

  return { mediaId, permalink };
}

/** Valida o token e retorna o username da conta (usado ao conectar no painel). */
export async function fetchInstagramAccount(
  igUserId: string,
  accessToken: string,
  graphBase: string = FACEBOOK_GRAPH_BASE,
): Promise<{ username: string }> {
  const url = `${graphBase}/${igUserId}?fields=username&access_token=${encodeURIComponent(accessToken)}`;
  const json = await graphGet(url);
  if (!json?.username) {
    throw new Error("Instagram: não foi possível ler a conta (verifique IG User ID e token).");
  }
  return { username: json.username };
}

async function waitContainerReady(
  graphBase: string,
  creationId: string,
  accessToken: string,
  maxChecks: number,
  intervalMs: number,
): Promise<void> {
  for (let i = 0; i < maxChecks; i++) {
    const url = `${graphBase}/${creationId}?fields=status_code,status&access_token=${encodeURIComponent(accessToken)}`;
    const json = await graphGet(url);
    const code: string = json?.status_code ?? "IN_PROGRESS";
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram: container falhou (${code}) — ${json?.status ?? ""}`);
    }
    await sleep(intervalMs);
  }
  // Mesmo se ainda IN_PROGRESS, tentamos publicar; a Graph API rejeita se não estiver pronto.
}

async function getPermalink(
  graphBase: string,
  mediaId: string,
  accessToken: string,
): Promise<string | null> {
  const url = `${graphBase}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`;
  const json = await graphGet(url);
  return json?.permalink ?? null;
}

async function graphPost(url: string, body: URLSearchParams): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseGraph(res);
}

async function graphGet(url: string): Promise<any> {
  const res = await fetch(url);
  return parseGraph(res);
}

async function parseGraph(res: Response): Promise<any> {
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Instagram Graph API: ${msg}`);
  }
  return json;
}
