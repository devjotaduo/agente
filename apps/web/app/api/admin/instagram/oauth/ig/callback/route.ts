import { NextResponse } from "next/server";
import { connectInstagramLogin } from "@jotaduo/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Callback do login direto do Instagram: troca o code e salva a conexão. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const metaError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const dot = state.indexOf(".");
  const nonce = dot > 0 ? state.slice(0, dot) : "";
  const agentId = dot > 0 ? state.slice(dot + 1) : "";
  const back = (qs: string) => new URL(`/admin/agents/${agentId}${qs}`, url.origin);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.redirect(new URL("/app", url.origin));

  if (metaError) return NextResponse.redirect(back(`?ig_error=${encodeURIComponent(metaError)}`));

  const cookieNonce = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("ig_login_state="))
    ?.split("=")[1];
  if (!code || !agentId || !nonce || nonce !== cookieNonce) {
    return NextResponse.redirect(back(`?ig_error=${encodeURIComponent("Sessão de conexão inválida. Tente novamente.")}`));
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(back(`?ig_error=${encodeURIComponent("INSTAGRAM_APP_ID/SECRET não configurados.")}`));
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = `${origin}/api/admin/instagram/oauth/ig/callback`;
  const admin = createAdminClient();

  try {
    const acc = await connectInstagramLogin({ appId, appSecret, redirectUri }, code);

    const expiresAt =
      acc.expiresIn > 0 ? new Date(Date.now() + acc.expiresIn * 1000).toISOString() : null;

    const { error: secretErr } = await admin
      .from("instagram_secrets")
      .upsert({ agent_id: agentId, access_token: acc.token });
    if (secretErr) throw new Error("Falha ao salvar o token.");

    await admin.from("instagram_connections").upsert({
      agent_id: agentId,
      ig_user_id: acc.igUserId,
      username: acc.username,
      status: "connected",
      auth_type: "instagram_login",
      token_expires_at: expiresAt,
      last_error: null,
    });

    const res = NextResponse.redirect(back(`?ig=connected`));
    res.cookies.set("ig_login_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err: any) {
    const message = err?.message ?? "Falha ao conectar o Instagram.";
    await admin.from("instagram_connections").upsert({
      agent_id: agentId,
      status: "error",
      auth_type: "instagram_login",
      last_error: message,
    });
    return NextResponse.redirect(back(`?ig_error=${encodeURIComponent(message)}`));
  }
}
