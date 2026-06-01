import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildInstagramLoginAuthUrl } from "@jotaduo/shared";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Início do login direto do Instagram (sem Página). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = (url.searchParams.get("agentId") ?? "").trim();
  const back = `/admin/agents/${agentId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", url.origin));
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.redirect(new URL("/app", url.origin));

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.redirect(
      new URL(`${back}?ig_error=${encodeURIComponent("INSTAGRAM_APP_ID não configurado no servidor.")}`, url.origin),
    );
  }
  if (!agentId) return NextResponse.redirect(new URL("/admin", url.origin));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = `${origin}/api/admin/instagram/oauth/ig/callback`;

  const nonce = randomUUID();
  const state = `${nonce}.${agentId}`;
  const authUrl = buildInstagramLoginAuthUrl({ appId, redirectUri }, state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("ig_login_state", nonce, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
