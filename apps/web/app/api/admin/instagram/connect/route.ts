import { NextResponse } from "next/server";
import { fetchInstagramAccount } from "@jotaduo/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeAgentAccess } from "@/lib/agent-access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1) Payload.
  const body = await request.json().catch(() => null);
  const agentId: string = (body?.agentId ?? "").trim();
  const igUserId: string = (body?.igUserId ?? "").trim();
  const accessToken: string = (body?.accessToken ?? "").trim();
  const tokenExpiresAt: string | null = body?.tokenExpiresAt || null;

  if (!agentId || !igUserId || !accessToken) {
    return NextResponse.json(
      { error: "agentId, igUserId e accessToken são obrigatórios." },
      { status: 400 },
    );
  }

  // 2) Autorização: admin ou dono do agente.
  const actor = await authorizeAgentAccess(agentId);
  if (!actor) return NextResponse.json({ error: "Sem acesso a este agente." }, { status: 403 });

  const admin = createAdminClient();

  // 3) Valida o token chamando a Graph API (também obtém o @username).
  let username: string;
  try {
    const acc = await fetchInstagramAccount(igUserId, accessToken);
    username = acc.username;
  } catch (err: any) {
    // Persiste o erro de conexão para o painel mostrar.
    await admin.from("instagram_connections").upsert({
      agent_id: agentId,
      ig_user_id: igUserId,
      status: "error",
      last_error: err?.message ?? "Token inválido.",
    });
    return NextResponse.json({ error: err?.message ?? "Falha ao validar o Instagram." }, { status: 400 });
  }

  // 4) Guarda o token (tabela só-service_role) e o estado de conexão.
  const { error: secretErr } = await admin
    .from("instagram_secrets")
    .upsert({ agent_id: agentId, access_token: accessToken });
  if (secretErr) {
    return NextResponse.json({ error: "Falha ao salvar o token." }, { status: 500 });
  }

  const { error: connErr } = await admin.from("instagram_connections").upsert({
    agent_id: agentId,
    ig_user_id: igUserId,
    username,
    status: "connected",
    token_expires_at: tokenExpiresAt,
    last_error: null,
  });
  if (connErr) {
    return NextResponse.json({ error: "Falha ao salvar a conexão." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username });
}
