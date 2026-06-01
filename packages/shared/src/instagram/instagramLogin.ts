/**
 * "Instagram API com login do Instagram" (Business Login for Instagram).
 *
 * Diferente do fluxo via Facebook Login, aqui a conta Profissional do Instagram
 * conecta DIRETO — sem precisar de uma Página do Facebook. Usa o host
 * `graph.instagram.com` e credenciais do produto "Instagram" do app da Meta
 * (Instagram App ID / Secret, distintos do App ID do Facebook).
 *
 * Requisitos: conta Instagram Profissional (Empresa/Criador). O redirect_uri
 * precisa estar cadastrado no app e (em produção) ser HTTPS.
 */

const AUTH_BASE = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH = "https://graph.instagram.com";

/** Escopos da API de publicação por login do Instagram. */
export const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
];

export interface InstagramLoginConfig {
  /** Instagram App ID (produto "Instagram" do app da Meta). */
  appId: string;
  /** Instagram App Secret. */
  appSecret: string;
  /** Deve bater EXATAMENTE com o cadastrado no app. */
  redirectUri: string;
}

/** Monta a URL de autorização do Instagram. */
export function buildInstagramLoginAuthUrl(
  cfg: Pick<InstagramLoginConfig, "appId" | "redirectUri">,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: INSTAGRAM_LOGIN_SCOPES.join(","),
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export interface InstagramLoginAccount {
  /** ID da conta Instagram (usado para publicar). */
  igUserId: string;
  username: string;
  /** Token de longa duração (60 dias) do Instagram. */
  token: string;
  /** Segundos até expirar (0 se desconhecido). */
  expiresIn: number;
}

/**
 * Troca o `code` do callback por: token de curta duração + user_id, depois por
 * token de longa duração (60 dias), e busca o @username.
 */
export async function connectInstagramLogin(
  cfg: InstagramLoginConfig,
  code: string,
): Promise<InstagramLoginAccount> {
  // 1) code -> token de curta duração (+ user_id)
  const form = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    // O Instagram costuma exigir code sem o sufixo "#_" que às vezes vem na URL.
    code: code.replace(/#_$/, ""),
  });
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const tokenJson: any = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || tokenJson?.error_type || tokenJson?.error) {
    const msg = tokenJson?.error_message ?? tokenJson?.error?.message ?? `HTTP ${tokenRes.status}`;
    throw new Error(`Instagram Login (token): ${msg}`);
  }
  // Formato atual: { data: [{ access_token, user_id, permissions }] }. Antigo: { access_token, user_id }.
  const first = Array.isArray(tokenJson?.data) ? tokenJson.data[0] : tokenJson;
  const shortToken: string | undefined = first?.access_token;
  const userId: string | undefined = first?.user_id ? String(first.user_id) : undefined;
  if (!shortToken || !userId) {
    throw new Error("Instagram Login: resposta sem access_token/user_id.");
  }

  // 2) curto -> longo (60 dias)
  const llRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
      cfg.appSecret,
    )}&access_token=${encodeURIComponent(shortToken)}`,
  );
  const llJson: any = await llRes.json().catch(() => null);
  if (!llRes.ok || llJson?.error) {
    const msg = llJson?.error?.message ?? `HTTP ${llRes.status}`;
    throw new Error(`Instagram Login (long-lived): ${msg}`);
  }
  const longToken: string = llJson?.access_token ?? shortToken;
  const expiresIn: number = Number(llJson?.expires_in ?? 0);

  // 3) @username
  const meRes = await fetch(
    `${GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(longToken)}`,
  );
  const meJson: any = await meRes.json().catch(() => null);
  const username: string = meJson?.username ?? "";

  return { igUserId: meJson?.user_id ? String(meJson.user_id) : userId, username, token: longToken, expiresIn };
}
