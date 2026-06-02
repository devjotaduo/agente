import "dotenv/config";
import { supabase } from "./lib/supabase.js";
import {
  connectAgent,
  disconnectAgent,
  forceReconnect,
  isConnected,
} from "./baileys/connectionManager.js";

// Resiliência: o Baileys pode lançar erros síncronos dentro de handlers do
// WebSocket (ex.: falha de descriptografia de um frame). Sem isto, um erro de
// um único socket derruba o worker inteiro. Logamos e seguimos.
process.on("uncaughtException", (err) => {
  console.error("[worker] uncaughtException:", err?.message ?? err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandledRejection:", reason);
});

function requireEnv() {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LLM_API_KEY"].filter(
    (k) => !process.env[k],
  );
  if (missing.length) {
    console.error(`[worker] Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
    process.exit(1);
  }
}

/**
 * Reconcilia o estado desejado (tabela whatsapp_connections) com os sockets ativos:
 * - precisa conectar (resume na inicialização ou pedido novo) e não está conectado -> connectAgent
 * - foi desconectado pelo painel e ainda está conectado -> disconnectAgent
 */
async function reconcile() {
  const { data: conns, error } = await supabase
    .from("whatsapp_connections")
    .select("agent_id, status, connect_requested");
  if (error) {
    console.error("[worker] erro ao ler conexões:", error.message);
    return;
  }

  for (const c of conns ?? []) {
    // `connect_requested` é um comando de BORDA do painel (incl. "Atualizar QR
    // code"): consome a flag e força um QR novo, mesmo que já exista um socket
    // pendurado/aguardando QR. Consumir a flag evita repetir a cada poll.
    if (c.connect_requested && c.status !== "connected") {
      await supabase
        .from("whatsapp_connections")
        .update({ connect_requested: false })
        .eq("agent_id", c.agent_id);
      console.log(`[worker] (re)gerando QR do agente ${c.agent_id}…`);
      forceReconnect(c.agent_id).catch((e) => console.error("[worker] forceReconnect:", e));
      continue;
    }

    const shouldConnect =
      c.status === "connected" || c.status === "connecting" || c.status === "qr_pending";
    const shouldDisconnect = c.status === "logged_out" || c.status === "disconnected";

    if (shouldConnect && !isConnected(c.agent_id)) {
      console.log(`[worker] conectando agente ${c.agent_id}…`);
      connectAgent(c.agent_id).catch((e) => console.error("[worker] connectAgent:", e));
    } else if (shouldDisconnect && isConnected(c.agent_id)) {
      console.log(`[worker] desconectando agente ${c.agent_id}…`);
      disconnectAgent(c.agent_id).catch((e) => console.error("[worker] disconnectAgent:", e));
    }
  }
}

async function main() {
  requireEnv();
  console.log("[worker] iniciando…");

  // Reconciliação inicial (resume sessões já conectadas).
  await reconcile();

  // Realtime: reage na hora a mudanças de connect_requested/status.
  supabase
    .channel("wa-connections-worker")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "whatsapp_connections" },
      () => {
        reconcile().catch((e) => console.error("[worker] reconcile (realtime):", e));
      },
    )
    .subscribe((status) => {
      console.log(`[worker] realtime: ${status}`);
    });

  // Polling de fallback (caso o realtime perca algum evento).
  setInterval(() => {
    reconcile().catch((e) => console.error("[worker] reconcile (polling):", e));
  }, 5000);

  console.log("[worker] pronto. Aguardando conexões…");
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
