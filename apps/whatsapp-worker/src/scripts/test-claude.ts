import "dotenv/config";
import { generateReply } from "@jotaduo/shared/agent";

/** Testa o núcleo de resposta (LLM configurável) com uma voz de exemplo. */
async function main() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY ausente no .env");
  const baseURL =
    process.env.LLM_BASE_URL ?? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

  const reply = await generateReply({
    agent: {
      id: "test",
      displayName: "Júlia",
      systemPrompt:
        "Você é uma atendente formal e cordial de uma loja de roupas chamada Bella Moda. Responda de forma educada e objetiva.",
      model: process.env.LLM_MODEL || "qwen-plus",
    },
    history: [],
    userMessage: "Oi, vocês entregam em todo o Brasil?",
    apiKey,
    baseURL,
  });

  console.log("\n--- Resposta do agente (Júlia) ---");
  console.log(reply);
  console.log("----------------------------------\n");
}

main().catch((e) => {
  console.error("Erro:", e?.message ?? e);
  process.exit(1);
});
