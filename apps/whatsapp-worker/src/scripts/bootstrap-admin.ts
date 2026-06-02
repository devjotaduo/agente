import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

/**
 * Cria (ou promove) o usuário admin inicial.
 * Uso:
 *   ADMIN_EMAIL=voce@jotaduo.com ADMIN_PASSWORD=suaSenhaForte pnpm bootstrap:admin
 * (Lê SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env do worker.)
 */
async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!url || !serviceRole) throw new Error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env");
  if (!email || !password) throw new Error("Passe ADMIN_EMAIL e ADMIN_PASSWORD nas variáveis de ambiente.");

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Cria o usuário (o trigger cria o profile como 'client').
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId: string | undefined = created?.user?.id;

  if (error) {
    if (error.message.includes("already")) {
      // Já existe: localiza o id pelo profile.
      const { data: prof } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = prof?.id;
      if (!userId) throw new Error(`Usuário ${email} já existe mas não foi encontrado em profiles.`);
      console.log(`Usuário já existia; promovendo a admin.`);
    } else {
      throw error;
    }
  }

  if (!userId) throw new Error("Não foi possível obter o id do usuário.");

  // Promove a admin.
  const { error: upErr } = await supabase.from("profiles").update({ role: "admin" }).eq("id", userId);
  if (upErr) throw upErr;

  console.log(`✅ Admin pronto: ${email}`);
}

main().catch((e) => {
  console.error("Erro:", e.message ?? e);
  process.exit(1);
});
