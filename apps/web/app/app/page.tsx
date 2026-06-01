import { getMyAgent, getConnection } from "@/lib/agents";
import { createClient } from "@/lib/supabase/server";
import { AgentSteps } from "@/components/agent-steps";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function ClientHome() {
  const agent = await getMyAgent();

  if (!agent) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/5 text-2xl">
          🤖
        </div>
        <CardTitle>Seu agente está a caminho</CardTitle>
        <CardDescription className="mt-1">
          Ainda não há um agente configurado na sua conta. Fale com a equipe da jotaduo para ativar.
        </CardDescription>
      </Card>
    );
  }

  const supabase = await createClient();
  const [conn, { data: templates }, { data: testConv }] = await Promise.all([
    getConnection(agent.id),
    supabase
      .from("templates")
      .select("id, slug, name, description, default_agent_name, default_system_prompt")
      .eq("is_active", true)
      .order("name"),
    supabase.from("conversations").select("id").eq("agent_id", agent.id).eq("channel", "test").maybeSingle(),
  ]);

  let initialTestMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (testConv) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", testConv.id)
      .order("created_at", { ascending: true });
    initialTestMessages = (msgs ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{agent.display_name}</h1>
        <p className="text-sm text-muted">Configure, teste e conecte seu agente seguindo os passos.</p>
      </div>
      <AgentSteps
        templates={templates ?? []}
        agent={agent}
        connection={
          conn
            ? {
                status: conn.status,
                qr_code: conn.qr_code,
                phone_number: conn.phone_number,
                last_error: conn.last_error,
              }
            : undefined
        }
        initialTestMessages={initialTestMessages}
      />
    </div>
  );
}
