import http from "node:http";
import { sendText } from "./baileys/connectionManager.js";

/**
 * Ponte WhatsApp <-> QwenPaw.
 *
 * Modo OPT-IN (env `WHATSAPP_BRIDGE=qwenpaw`): em vez de responder com o núcleo
 * local (generateReply/OpenRouter), o worker encaminha a mensagem recebida ao
 * QwenPaw (cérebro: agente + skills + memória). A resposta volta de forma
 * ASSÍNCRONA: o canal `whatsapp` do QwenPaw faz POST em `/send` aqui.
 *
 * Roteamento de socket (multi-tenant): o worker tem 1 socket por agente jotaduo.
 * Para a resposta voltar pelo MESMO número, codificamos `<workerAgentId>##<jid>`
 * no campo `from` enviado ao QwenPaw; ele devolve isso em `to`, e nós separamos
 * de volta para escolher o socket. Round-trip transparente pelo QwenPaw.
 */

const QWENPAW_URL = process.env.QWENPAW_URL ?? "http://127.0.0.1:8088";
const QWENPAW_AGENT_ID = process.env.QWENPAW_AGENT_ID ?? "default";
const BRIDGE_PORT = Number(process.env.QWENPAW_BRIDGE_PORT ?? 8099);
const SEP = "##";

export function isBridgeEnabled(): boolean {
  return (process.env.WHATSAPP_BRIDGE ?? "").toLowerCase() === "qwenpaw";
}

/** Encaminha uma mensagem recebida ao QwenPaw. A resposta volta async via /send. */
export async function forwardToQwenpaw(
  workerAgentId: string,
  jid: string,
  text: string,
): Promise<void> {
  const from = `${workerAgentId}${SEP}${jid}`;
  try {
    const res = await fetch(`${QWENPAW_URL}/api/whatsapp/inbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: QWENPAW_AGENT_ID, from, text }),
    });
    if (!res.ok) {
      console.error(`[bridge] QwenPaw inbound falhou (${res.status}): ${await res.text().catch(() => "")}`);
    }
  } catch (e) {
    console.error("[bridge] erro ao chamar o QwenPaw:", e);
  }
}

/** Servidor HTTP que o QwenPaw chama para ENVIAR no WhatsApp (POST /send). */
export function startBridgeServer(): void {
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/send") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { to, text } = JSON.parse(body || "{}") as { to?: string; text?: string };
          if (!to || !text) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "campos 'to' e 'text' são obrigatórios" }));
            return;
          }
          const idx = to.indexOf(SEP);
          if (idx < 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "'to' deve ser '<agentId>##<jid>'" }));
            return;
          }
          const workerAgentId = to.slice(0, idx);
          const jid = to.slice(idx + SEP.length);
          const ok = await sendText(workerAgentId, jid, text);
          res.writeHead(ok ? 200 : 502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(BRIDGE_PORT, "127.0.0.1", () => {
    console.log(
      `[bridge] ouvindo em http://127.0.0.1:${BRIDGE_PORT}/send (-> WhatsApp); QwenPaw=${QWENPAW_URL} agent=${QWENPAW_AGENT_ID}`,
    );
  });
}
