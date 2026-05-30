import { getMyAgent } from "@/lib/agents";
import { createClient } from "@/lib/supabase/server";
import { TestChat } from "@/components/test-chat";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function TestPage() {
  const agent = await getMyAgent();
  if (!agent) {
    return (
      <Card>
        <CardTitle>Nenhum agente</CardTitle>
        <CardDescription className="mt-1">Fale com o suporte da jotaduo.</CardDescription>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("channel", "test")
    .maybeSingle();

  let initialMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (conv) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    initialMessages = (msgs ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Testar {agent.display_name}</h1>
        <p className="text-sm text-muted">
          Converse aqui para validar a voz antes de conectar ao WhatsApp.
        </p>
      </div>
      <TestChat agentId={agent.id} agentName={agent.display_name} initialMessages={initialMessages} />
    </div>
  );
}
