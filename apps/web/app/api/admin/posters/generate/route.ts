import { NextResponse } from "next/server";
import { buildPosterCreative, generatePosterImage } from "@jotaduo/shared";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120; // geração de imagem é assíncrona (polling)

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const LLM_MODEL = process.env.LLM_MODEL ?? "qwen-plus";
const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "qwen-image-2.0";

function extFromContentType(ct: string): string {
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  return "png";
}

export async function POST(request: Request) {
  // 1) Admin guard.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Apenas admin." }, { status: 403 });

  if (!LLM_API_KEY) {
    return NextResponse.json({ error: "LLM_API_KEY não configurada no servidor." }, { status: 500 });
  }

  // 2) Payload.
  const body = await request.json().catch(() => null);
  const agentId: string = (body?.agentId ?? "").trim();
  const briefing: string = (body?.briefing ?? "").trim();
  // Formato do post (apenas valores aceitos; padrão quadrado 1:1).
  const ALLOWED_SIZES = new Set(["1080x1080", "1080x1350"]);
  const size: string = ALLOWED_SIZES.has(body?.size) ? body.size : "1080x1080";
  if (!agentId || !briefing) {
    return NextResponse.json({ error: "agentId e briefing são obrigatórios." }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3) Carrega o agente (identidade/voz para a legenda).
  const { data: agent } = await admin
    .from("agents")
    .select("id, display_name, system_prompt, tone")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });

  // 4) Cria o registro do pôster (status 'generating') — o painel acompanha via realtime.
  const { data: poster, error: insErr } = await admin
    .from("posters")
    .insert({ agent_id: agentId, briefing, status: "generating", created_by: user.id })
    .select("id")
    .single();
  if (insErr || !poster) {
    return NextResponse.json({ error: "Falha ao criar o pôster." }, { status: 500 });
  }
  const posterId = poster.id;

  try {
    // 5) Briefing -> prompt visual + legenda.
    const creative = await buildPosterCreative({
      agent: {
        displayName: agent.display_name,
        systemPrompt: agent.system_prompt,
        tone: agent.tone,
      },
      briefing,
      apiKey: LLM_API_KEY,
      baseURL: LLM_BASE_URL,
      model: LLM_MODEL,
    });

    await admin
      .from("posters")
      .update({ image_prompt: creative.imagePrompt, caption: creative.caption })
      .eq("id", posterId);

    // 6) Gera a imagem (DashScope) — bytes para rehospedar no Storage.
    const img = await generatePosterImage({
      prompt: creative.imagePrompt,
      apiKey: LLM_API_KEY,
      baseURL: LLM_BASE_URL,
      model: IMAGE_MODEL,
      size,
    });

    // 7) Sobe no bucket público 'posters' (URL estável p/ o Instagram buscar).
    const ext = extFromContentType(img.contentType);
    const path = `${agentId}/${posterId}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("posters")
      .upload(path, img.bytes, { contentType: img.contentType, upsert: true });
    if (upErr) throw new Error(`Falha ao salvar a imagem: ${upErr.message}`);

    const {
      data: { publicUrl },
    } = admin.storage.from("posters").getPublicUrl(path);

    // 8) Marca como pronto.
    const { data: ready } = await admin
      .from("posters")
      .update({ status: "ready", image_path: path, image_url: publicUrl, error: null })
      .eq("id", posterId)
      .select("id, briefing, caption, image_url, status, ig_permalink, created_at")
      .single();

    return NextResponse.json({ ok: true, poster: ready });
  } catch (err: any) {
    const message = err?.message ?? "Falha ao gerar o pôster.";
    await admin.from("posters").update({ status: "failed", error: message }).eq("id", posterId);
    return NextResponse.json({ error: message, posterId }, { status: 500 });
  }
}
