/**
 * OAuth oficial "Login com Facebook" para conectar o Instagram sem colar token
 * na mão. Fluxo: o usuário autoriza o app na Meta -> recebemos um `code` ->
 * trocamos por um token de usuário de longa duração (60 dias) -> descobrimos a
 * Página com Instagram vinculado e usamos o token de PÁGINA (que não expira)
 * para publicar.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG_BASE = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

/** Permissões necessárias para listar páginas e publicar no Instagram. */
export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export interface OAuthConfig {
  appId: string;
  appSecret: string;
  /** Deve bater EXATAMENTE com o registrado no app da Meta. */
  redirectUri: string;
}

/** Monta a URL do diálogo de autorização da Meta. */
export function buildInstagramAuthUrl(cfg: Pick<OAuthConfig, "appId" | "redirectUri">, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    state,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
  });
  return `${DIALOG_BASE}?${params.toString()}`;
}

export interface IgAccount {
  igUserId: string;
  username: string;
  /** Token de Página — usado para publicar; derivado de token longo, não expira. */
  pageAccessToken: string;
  pageId: string;
  pageName: string;
}

/**
 * Troca o `code` do callback por um token de usuário de longa duração (60 dias).
 * Retorna o token e quantos segundos faltam para expirar.
 */
export async function exchangeCodeForLongLivedToken(
  cfg: OAuthConfig,
  code: string,
): Promise<{ token: string; expiresIn: number }> {
  // 1) code -> token de curta duração
  const u1 = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    client_secret: cfg.appSecret,
    code,
  });
  const short = await graphGet(`${GRAPH_BASE}/oauth/access_token?${u1.toString()}`);
  if (!short?.access_token) throw new Error("Não foi possível obter o token inicial.");

  // 2) curto -> longo (60 dias)
  const u2 = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    fb_exchange_token: short.access_token,
  });
  const long = await graphGet(`${GRAPH_BASE}/oauth/access_token?${u2.toString()}`);
  if (!long?.access_token) throw new Error("Não foi possível obter o token de longa duração.");

  return { token: long.access_token, expiresIn: Number(long.expires_in ?? 0) };
}

/**
 * Encontra a primeira Página do usuário que tem uma conta Instagram
 * Business/Creator vinculada, e retorna o token de Página + dados do IG.
 * Retorna null se nenhuma página tiver Instagram vinculado.
 */
export async function findInstagramBusinessAccount(userToken: string): Promise<IgAccount | null> {
  const u = new URLSearchParams({
    fields: "name,access_token,instagram_business_account",
    access_token: userToken,
  });
  const pages = await graphGet(`${GRAPH_BASE}/me/accounts?${u.toString()}`);
  const list: any[] = pages?.data ?? [];

  for (const page of list) {
    const igId = page?.instagram_business_account?.id;
    const pageToken = page?.access_token;
    if (igId && pageToken) {
      const acc = await graphGet(
        `${GRAPH_BASE}/${igId}?fields=username&access_token=${encodeURIComponent(pageToken)}`,
      );
      return {
        igUserId: igId,
        username: acc?.username ?? "",
        pageAccessToken: pageToken,
        pageId: page.id,
        pageName: page.name ?? "",
      };
    }
  }
  return null;
}

async function graphGet(url: string): Promise<any> {
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Meta OAuth: ${msg}`);
  }
  return json;
}
