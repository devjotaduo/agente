import { createRequire } from "node:module";
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "baileys";
import QRCode from "qrcode";
import pino from "pino";
import type { TablesUpdate } from "@jotaduo/shared/types";
import { supabase } from "../lib/supabase.js";
import { useSupabaseAuthState, clearSupabaseAuthState } from "./supabaseAuthState.js";
import { handleIncoming } from "../handleIncoming.js";

// `baileys` é CJS; o default export (makeWASocket) não resolve via import ESM.
const makeWASocket = createRequire(import.meta.url)("baileys")
  .makeWASocket as typeof import("baileys").default;

const logger = pino({ level: process.env.WA_LOG_LEVEL ?? "warn" });

// Um socket por agente.
const sockets = new Map<string, WASocket>();
// Agentes em processo de conexão (guarda síncrona contra corrida do reconcile).
const connecting = new Set<string>();
// Agentes que pedimos para desconectar (não reconectar automaticamente).
const intentionalClose = new Set<string>();
// Tentativas de reconexão por agente (limita ciclo de QR não lido).
const reconnectAttempts = new Map<string, number>();
const MAX_RECONNECTS = 8;

function extractText(msg: import("baileys").proto.IWebMessageInfo): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    null
  );
}

async function setConn(agentId: string, patch: TablesUpdate<"whatsapp_connections">) {
  await supabase.from("whatsapp_connections").update(patch).eq("agent_id", agentId);
}

/** A conexão ainda é desejada? (painel pode ter pedido para desconectar.) */
async function isConnectionDesired(agentId: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("status, connect_requested")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!data) return false;
  return (
    data.connect_requested ||
    data.status === "connected" ||
    data.status === "connecting" ||
    data.status === "qr_pending"
  );
}

export async function connectAgent(agentId: string): Promise<void> {
  // Guarda contra corrida: reconcile pode disparar várias vezes durante os awaits.
  if (sockets.has(agentId) || connecting.has(agentId)) return;
  connecting.add(agentId);
  intentionalClose.delete(agentId);

  try {
    const { state, saveCreds } = await useSupabaseAuthState(agentId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ["jotaduo", "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
    });
    sockets.set(agentId, sock);
    connecting.delete(agentId);

    // Watchdog: se o handshake travar (ex.: erro de descriptografia deixa o
    // socket pendurado sem emitir QR nem abrir), derruba e limpa a sessão
    // (provavelmente corrupta) para o reconcile retentar do zero.
    const watchdog = setTimeout(() => {
      if (sockets.get(agentId) === sock) {
        sockets.delete(agentId);
        reconnectAttempts.delete(agentId);
        console.log(`[worker] agente ${agentId}: handshake travado (watchdog). Limpando sessão.`);
        clearSupabaseAuthState(agentId).catch(() => {});
        setConn(agentId, { status: "qr_pending", qr_code: null }).catch(() => {});
        try {
          sock.end(undefined);
        } catch {
          // ignora
        }
      }
    }, 30000);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        clearTimeout(watchdog);
        const dataUrl = await QRCode.toDataURL(qr);
        await setConn(agentId, { status: "qr_pending", qr_code: dataUrl, last_error: null });
      }

      if (connection === "open") {
        clearTimeout(watchdog);
        reconnectAttempts.delete(agentId);
        const phone = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
        await setConn(agentId, {
          status: "connected",
          qr_code: null,
          phone_number: phone,
          connect_requested: false,
          last_connected_at: new Date().toISOString(),
          last_error: null,
        });
        console.log(`[worker] agente ${agentId} conectado (${phone}).`);
      }

      if (connection === "close") {
        clearTimeout(watchdog);
        // Só remove se ainda for ESTE socket: um forceReconnect pode já ter
        // registrado um socket novo sob a mesma chave.
        if (sockets.get(agentId) === sock) sockets.delete(agentId);

        // Fechamento intencional (refresh/disconnect): nunca limpa sessão nem
        // reconecta em paralelo, independente do código de status.
        if (intentionalClose.has(agentId)) {
          intentionalClose.delete(agentId);
          return;
        }

        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
          ?.output?.statusCode;

        // Deslogado: limpa a sessão.
        if (statusCode === DisconnectReason.loggedOut) {
          await clearSupabaseAuthState(agentId);
          await setConn(agentId, {
            status: "logged_out",
            qr_code: null,
            phone_number: null,
            connect_requested: false,
          });
          console.log(`[worker] agente ${agentId} deslogado.`);
          return;
        }

        // Conexão substituída por outra sessão: NÃO reconectar (evita loop de conflito).
        if (statusCode === DisconnectReason.connectionReplaced) {
          await setConn(agentId, {
            status: "error",
            qr_code: null,
            last_error: "Conexão substituída por outra sessão do WhatsApp.",
          });
          console.log(`[worker] agente ${agentId}: conexão substituída (440). Sem reconexão.`);
          return;
        }

        // Sessão inválida/corrupta: limpa e recomeça com QR novo.
        if (
          statusCode === DisconnectReason.badSession ||
          statusCode === DisconnectReason.multideviceMismatch
        ) {
          await clearSupabaseAuthState(agentId);
          reconnectAttempts.delete(agentId);
          console.log(`[worker] agente ${agentId}: sessão inválida (${statusCode}). Limpando.`);
          if (await isConnectionDesired(agentId)) {
            await setConn(agentId, { status: "qr_pending", qr_code: null, last_error: null });
            setTimeout(() => connectAgent(agentId).catch((e) => console.error(e)), 1500);
          } else {
            await setConn(agentId, { status: "disconnected", qr_code: null });
          }
          return;
        }

        // Conexão não é mais desejada (painel desconectou): para.
        if (!(await isConnectionDesired(agentId))) {
          reconnectAttempts.delete(agentId);
          console.log(`[worker] agente ${agentId}: conexão não é mais desejada. Sem reconexão.`);
          return;
        }

        // Limita o ciclo de QR não lido / quedas (incl. 515 pós-pareamento reconecta).
        const attempts = (reconnectAttempts.get(agentId) ?? 0) + 1;
        reconnectAttempts.set(agentId, attempts);
        if (attempts > MAX_RECONNECTS) {
          reconnectAttempts.delete(agentId);
          await setConn(agentId, {
            status: "disconnected",
            qr_code: null,
            connect_requested: false,
            last_error: "Não foi possível conectar (QR não lido a tempo). Tente novamente.",
          });
          console.log(`[worker] agente ${agentId}: desistindo após ${MAX_RECONNECTS} tentativas.`);
          return;
        }

        console.log(
          `[worker] agente ${agentId} caiu (code ${statusCode}). Reconectando (${attempts}/${MAX_RECONNECTS})…`,
        );
        await setConn(agentId, { status: "connecting" });
        setTimeout(() => connectAgent(agentId).catch((e) => console.error(e)), 2000);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) continue; // ignora grupos/status

        const text = extractText(msg);
        if (!text) continue;

        // Carrega o agente atualizado (voz/tom/skills podem ter mudado).
        const { data: agent } = await supabase
          .from("agents")
          .select("id, display_name, system_prompt, model, tone, skills, business_profile, is_active")
          .eq("id", agentId)
          .maybeSingle();
        if (!agent || !agent.is_active) continue;

        await sock.sendPresenceUpdate("composing", jid).catch(() => {});
        const reply = await handleIncoming(agent, jid, text);
        await sock.sendPresenceUpdate("paused", jid).catch(() => {});
        if (reply) {
          await sock.sendMessage(jid, { text: reply });
        }
      }
    });
  } catch (e) {
    connecting.delete(agentId);
    sockets.delete(agentId);
    console.error(`[worker] connectAgent erro (${agentId}):`, e);
    await setConn(agentId, { status: "error", last_error: String(e) }).catch(() => {});
  }
}

/**
 * Força um QR novo: derruba o socket atual (se houver) e reconecta do zero.
 * Usado quando o painel pede "Atualizar QR code" — diferente do auto-rotate do
 * Baileys, garante um pareamento limpo mesmo se o socket atual travou.
 */
export async function forceReconnect(agentId: string): Promise<void> {
  const sock = sockets.get(agentId);
  if (sock) {
    // intentionalClose faz o handler de 'close' ignorar esta queda (sem reconectar
    // em paralelo). O reconnect é agendado abaixo, após o socket encerrar.
    intentionalClose.add(agentId);
    try {
      sock.end(undefined);
    } catch {
      // ignora
    }
    sockets.delete(agentId);
  }
  connecting.delete(agentId);
  reconnectAttempts.delete(agentId);
  await setConn(agentId, { status: "qr_pending", qr_code: null, last_error: null });
  setTimeout(() => connectAgent(agentId).catch((e) => console.error("[worker] forceReconnect:", e)), 800);
}

export async function disconnectAgent(agentId: string): Promise<void> {
  const sock = sockets.get(agentId);
  intentionalClose.add(agentId);
  try {
    await sock?.logout();
  } catch {
    // ignora
  }
  sockets.delete(agentId);
  connecting.delete(agentId);
  reconnectAttempts.delete(agentId);
  await clearSupabaseAuthState(agentId);
  await setConn(agentId, {
    status: "logged_out",
    qr_code: null,
    phone_number: null,
    connect_requested: false,
  });
}

export function isConnected(agentId: string): boolean {
  return sockets.has(agentId) || connecting.has(agentId);
}
