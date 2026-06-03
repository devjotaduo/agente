import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { buildInstagramLoginAuthUrl } from "@jotaduo/shared";
import { authorizeAgentAccess } from "@/lib/agent-access";

export const runtime = "nodejs";

/** Início do login direto do Instagram (sem Página). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = (url.searchParams.get("agentId") ?? "").trim();

  const actor = await authorizeAgentAccess(agentId);
  if (!actor) return NextResponse.redirect(new URL("/login", url.origin));
  const back = actor.isAdmin ? `/admin/posters?agent=${agentId}` : "/app/posters";
  const backErr = (msg: string) =>
    new URL(`${back}${back.includes("?") ? "&" : "?"}ig_error=${encodeURIComponent(msg)}`, url.origin);

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) return NextResponse.redirect(backErr("INSTAGRAM_APP_ID não configurado no servidor."));
  if (!agentId) return NextResponse.redirect(new URL("/", url.origin));

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
