import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function genPassword() {
  // Senha legível e forte o suficiente para entrega inicial ao cliente.
  return randomBytes(9).toString("base64url");
}

export async function POST(request: Request) {
  // 1) Garante que quem chama é admin.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Apenas admin." }, { status: 403 });
  }

  // 2) Lê e valida o payload.
  const body = await request.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();
  const agentName = (body?.agentName ?? "").trim();
  const templateId: string | null = body?.templateId || null;
  const systemPromptOverride: string | undefined = body?.systemPrompt;
  let password: string = (body?.password ?? "").trim();

  if (!email || !agentName) {
    return NextResponse.json({ error: "E-mail e nome do agente são obrigatórios." }, { status: 400 });
  }
  if (!password) password = genPassword();

  const admin = createAdminClient();

  // 3) Carrega o template (se informado) para herdar a voz.
  let systemPrompt = systemPromptOverride ?? "";
  if (templateId && !systemPromptOverride) {
    const { data: tpl } = await admin
      .from("templates")
      .select("default_system_prompt")
      .eq("id", templateId)
      .single();
    systemPrompt = tpl?.default_system_prompt ?? "";
  }

  // 4) Cria o usuário (login do cliente). O trigger cria o profile (role client).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message?.includes("already")
      ? "Já existe um usuário com esse e-mail."
      : createErr?.message ?? "Falha ao criar usuário.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const ownerId = created.user.id;

  // 5) Cria o agente e o estado de conexão do WhatsApp.
  const { data: agent, error: agentErr } = await admin
    .from("agents")
    .insert({
      owner_id: ownerId,
      template_id: templateId,
      display_name: agentName,
      system_prompt: systemPrompt,
    })
    .select("id")
    .single();

  if (agentErr || !agent) {
    // rollback do usuário para não deixar lixo
    await admin.auth.admin.deleteUser(ownerId).catch(() => {});
    return NextResponse.json({ error: "Falha ao criar o agente." }, { status: 500 });
  }

  await admin.from("whatsapp_connections").insert({ agent_id: agent.id, status: "disconnected" });

  return NextResponse.json({
    ok: true,
    agentId: agent.id,
    client: { email, password },
  });
}
