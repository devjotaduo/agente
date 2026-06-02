import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/**
 * Teste automatizado do isolamento multi-tenant (RLS).
 * Cria 2 clientes + 1 agente para cada e valida que:
 *  - cada cliente só lê o próprio agente;
 *  - um cliente NÃO lê o agente do outro;
 *  - um cliente NÃO consegue inserir agente (só admin).
 *
 * Uso:
 *   SUPABASE_ANON_KEY=<anon> pnpm --filter @jotaduo/whatsapp-worker exec tsx src/scripts/test-rls.ts
 * (URL e service_role vêm do .env do worker.)
 */
const url = process.env.SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anon = process.env.SUPABASE_ANON_KEY!;

if (!url || !serviceRole || !anon) {
  throw new Error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY.");
}

const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

const A = { email: "clientea@teste.com", password: "test123456" };
const B = { email: "clienteb@teste.com", password: "test123456" };

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

async function ensureUser(email: string, password: string): Promise<string> {
  // remove se já existir (idempotente)
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing?.id) await admin.auth.admin.deleteUser(existing.id).catch(() => {});
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser falhou");
  return data.user.id;
}

async function createAgentFor(ownerId: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("agents")
    .insert({ owner_id: ownerId, display_name: name, system_prompt: "teste" })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert agent falhou");
  await admin.from("whatsapp_connections").insert({ agent_id: data.id, status: "disconnected" });
  return data.id;
}

async function asUser(email: string, password: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

async function main() {
  console.log("Preparando dados de teste…");
  const idA = await ensureUser(A.email, A.password);
  const idB = await ensureUser(B.email, B.password);
  const agentA = await createAgentFor(idA, "Agente A");
  const agentB = await createAgentFor(idB, "Agente B");

  console.log("\nTestes RLS:");
  const ca = await asUser(A.email, A.password);
  const cb = await asUser(B.email, B.password);

  // A vê só o próprio
  const { data: aAgents } = await ca.from("agents").select("id, owner_id");
  check("Cliente A vê exatamente 1 agente", aAgents?.length === 1);
  check("Agente visto por A é o de A", aAgents?.[0]?.id === agentA);

  // B vê só o próprio
  const { data: bAgents } = await cb.from("agents").select("id, owner_id");
  check("Cliente B vê exatamente 1 agente", bAgents?.length === 1);
  check("Agente visto por B é o de B", bAgents?.[0]?.id === agentB);

  // A não acessa o agente de B por id
  const { data: aSeesB } = await ca.from("agents").select("id").eq("id", agentB);
  check("Cliente A NÃO lê o agente de B", (aSeesB?.length ?? 0) === 0);

  // A não consegue inserir agente (só admin)
  const { error: insErr } = await ca
    .from("agents")
    .insert({ owner_id: idA, display_name: "Hack", system_prompt: "x" });
  check("Cliente A NÃO consegue inserir agente (RLS bloqueia)", !!insErr);

  // A não lê whatsapp_sessions (nenhuma policy)
  const { data: sess } = await ca.from("whatsapp_sessions").select("*");
  check("Cliente A NÃO lê whatsapp_sessions", (sess?.length ?? 0) === 0);

  // limpeza
  console.log("\nLimpando…");
  await admin.auth.admin.deleteUser(idA).catch(() => {});
  await admin.auth.admin.deleteUser(idB).catch(() => {});

  console.log(`\n${failures === 0 ? "🎉 TODOS OS TESTES PASSARAM" : `⚠️ ${failures} teste(s) falharam`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no teste:", e.message ?? e);
  process.exit(1);
});
