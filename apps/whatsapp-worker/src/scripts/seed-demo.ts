import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/**
 * Cria um cliente + agente de demonstração para testar a conexão do WhatsApp.
 * Idempotente: recria se já existir.
 *   pnpm --filter @jotaduo/whatsapp-worker exec tsx src/scripts/seed-demo.ts
 */
const url = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

const EMAIL = "demo@cliente.com";
const PASSWORD = "demo12345";

async function main() {
  // remove se já existir
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", EMAIL).maybeSingle();
  if (existing?.id) {
    await supabase.auth.admin.deleteUser(existing.id).catch(() => {});
    console.log("Cliente demo anterior removido.");
  }

  const { data: created, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("createUser falhou");
  const ownerId = created.user.id;

  // template SAC (se houver)
  const { data: tpl } = await supabase
    .from("templates")
    .select("id, default_system_prompt, default_agent_name")
    .eq("slug", "sac")
    .maybeSingle();

  const { data: agent, error: agErr } = await supabase
    .from("agents")
    .insert({
      owner_id: ownerId,
      template_id: tpl?.id ?? null,
      display_name: tpl?.default_agent_name ?? "Sofia",
      system_prompt: tpl?.default_system_prompt ?? "Você é uma atendente simpática.",
    })
    .select("id")
    .single();
  if (agErr || !agent) throw agErr ?? new Error("insert agent falhou");

  await supabase.from("whatsapp_connections").insert({ agent_id: agent.id, status: "disconnected" });

  console.log("\n✅ Agente de demonstração criado.");
  console.log("   Login do cliente:");
  console.log(`   e-mail: ${EMAIL}`);
  console.log(`   senha : ${PASSWORD}`);
  console.log(`   agente: ${tpl?.default_agent_name ?? "Sofia"} (${agent.id})`);
}

main().catch((e) => {
  console.error("Erro:", e?.message ?? e);
  process.exit(1);
});
