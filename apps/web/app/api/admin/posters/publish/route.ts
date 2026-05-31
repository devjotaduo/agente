import { NextResponse } from "next/server";
import { publishPhotoToInstagram } from "@jotaduo/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1) Admin guard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Apenas admin." }, { status: 403 });

  // 2) Payload. Permite sobrescrever a legenda no momento de publicar.
  const body = await request.json().catch(() => null);
  const posterId: string = (body?.posterId ?? "").trim();
  const captionOverride: string | undefined =
    typeof body?.caption === "string" ? body.caption : undefined;
  if (!posterId) {
    return NextResponse.json({ error: "posterId é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3) Carrega o pôster.
  const { data: poster } = await admin
    .from("posters")
    .select("id, agent_id, image_url, caption, status")
    .eq("id", posterId)
    .maybeSingle();
  if (!poster) return NextResponse.json({ error: "Pôster não encontrado." }, { status: 404 });
  if (!poster.image_url) {
    return NextResponse.json({ error: "Pôster ainda não tem imagem pronta." }, { status: 400 });
  }
  if (poster.status === "published") {
    return NextResponse.json({ error: "Este pôster já foi publicado." }, { status: 400 });
  }

  // 4) Conexão + token do Instagram.
  const { data: conn } = await admin
    .from("instagram_connections")
    .select("ig_user_id, status")
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
    const result = await publishPhotoToInstagram({
      igUserId: conn.ig_user_id,
      accessToken: secret.access_token,
      imageUrl: poster.image_url,
      caption,
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
