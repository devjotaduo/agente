import { NextResponse } from "next/server";
import { publishPhotoToInstagram } from "@jotaduo/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeAgentAccess } from "@/lib/agent-access";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1) Payload. Permite sobrescrever a legenda no momento de publicar.
  const body = await request.json().catch(() => null);
  const posterId: string = (body?.posterId ?? "").trim();
  const captionOverride: string | undefined =
    typeof body?.caption === "string" ? body.caption : undefined;
  if (!posterId) {
    return NextResponse.json({ error: "posterId é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 2) Carrega o pôster.
  const { data: poster } = await admin
    .from("posters")
    .select("id, agent_id, image_url, caption, status")
    .eq("id", posterId)
    .maybeSingle();
  if (!poster) return NextResponse.json({ error: "Pôster não encontrado." }, { status: 404 });

  // 3) Autorização: admin ou dono do agente.
  const actor = await authorizeAgentAccess(poster.agent_id);
  if (!actor) return NextResponse.json({ error: "Sem acesso a este pôster." }, { status: 403 });
  if (!poster.image_url) {
    return NextResponse.json({ error: "Pôster ainda não tem imagem pronta." }, { status: 400 });
  }
  if (poster.status === "published") {
    return NextResponse.json({ error: "Este pôster já foi publicado." }, { status: 400 });
  }

  // 4) Conexão + token do Instagram.
  const { data: conn } = await admin
    .from("instagram_connections")
    .select("ig_user_id, status, auth_type")
    .eq("agent_id", poster.agent_id)
    .maybeSingle();
  if (!conn?.ig_user_id || conn.status !== "connected") {
    return NextResponse.json(
      { error: "Instagram não conectado para este agente." },
      { status: 400 },
    );
  }
  const { data: secret } = await admin
    .from("instagram_secrets")
    .select("access_token")
    .eq("agent_id", poster.agent_id)
    .maybeSingle();
  if (!secret?.access_token) {
    return NextResponse.json({ error: "Token do Instagram ausente." }, { status: 400 });
  }

  const caption = (captionOverride ?? poster.caption ?? "").toString();

  await admin.from("posters").update({ status: "publishing", error: null }).eq("id", posterId);

  try {
    const graphBase =
      conn.auth_type === "instagram_login"
        ? "https://graph.instagram.com/v21.0"
        : "https://graph.facebook.com/v21.0";

    const result = await publishPhotoToInstagram({
      igUserId: conn.ig_user_id,
      accessToken: secret.access_token,
      imageUrl: poster.image_url,
      caption,
      graphBase,
    });

    const { data: published } = await admin
      .from("posters")
      .update({
        status: "published",
        caption,
        ig_media_id: result.mediaId,
        ig_permalink: result.permalink,
        published_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", posterId)
      .select("id, status, ig_permalink, ig_media_id")
      .single();

    return NextResponse.json({ ok: true, poster: published });
  } catch (err: any) {
    const message = err?.message ?? "Falha ao publicar no Instagram.";
    await admin.from("posters").update({ status: "failed", error: message }).eq("id", posterId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
