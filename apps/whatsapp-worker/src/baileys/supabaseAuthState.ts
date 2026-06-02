import { createRequire } from "node:module";
import {
  initAuthCreds,
  BufferJSON,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import { supabase } from "../lib/supabase.js";

// `proto` não é detectado como named export ESM do baileys (pacote CJS);
// obtemos via require (module.exports.proto existe).
const { proto } = createRequire(import.meta.url)("baileys") as typeof import("baileys");

/**
 * AuthState do Baileys persistido na tabela `whatsapp_sessions` do Supabase
 * (em vez de arquivos em disco). Isso permite que o worker reinicie/escale com
 * disco efêmero sem perder a sessão — não pede QR novo a cada restart.
 *
 * Cada credencial/chave vira uma linha (agent_id, key, value jsonb). Buffers são
 * serializados via BufferJSON (replacer/reviver do Baileys).
 */
export async function useSupabaseAuthState(agentId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const readData = async (key: string): Promise<unknown> => {
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("value")
      .eq("agent_id", agentId)
      .eq("key", key)
      .maybeSingle();
    if (!data?.value) return null;
    // value já está em formato BufferJSON; reidrata Buffers.
    return JSON.parse(JSON.stringify(data.value), BufferJSON.reviver);
  };

  const writeData = async (key: string, value: unknown): Promise<void> => {
    const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
    await supabase
      .from("whatsapp_sessions")
      .upsert({ agent_id: agentId, key, value: serialized }, { onConflict: "agent_id,key" });
  };

  const removeData = async (key: string): Promise<void> => {
    await supabase.from("whatsapp_sessions").delete().eq("agent_id", agentId).eq("key", key);
  };

  const creds: AuthenticationCreds = ((await readData("creds")) as AuthenticationCreds) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
              }
              if (value) result[id] = value as SignalDataTypeMap[typeof type];
            }),
          );
          return result;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            const cat = data[category as keyof typeof data]!;
            for (const id in cat) {
              const value = cat[id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData("creds", creds);
    },
  };
}

/** Apaga toda a sessão de um agente (usado ao desconectar/logout). */
export async function clearSupabaseAuthState(agentId: string): Promise<void> {
  await supabase.from("whatsapp_sessions").delete().eq("agent_id", agentId);
}
