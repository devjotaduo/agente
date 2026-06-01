import "dotenv/config";

// Worker WhatsApp — implementação completa na Fase 4 (Baileys + Supabase Realtime).
// Por enquanto apenas valida o ambiente para o scaffolding (Fase 0).
function main() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`[worker] Variáveis ausentes (ok na Fase 0): ${missing.join(", ")}`);
  }
  console.log("[worker] Scaffolding OK. Lógica do WhatsApp será adicionada na Fase 4.");
}

main();
