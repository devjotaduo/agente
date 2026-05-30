import { getMyAgent } from "@/lib/agents";
import { createClient } from "@/lib/supabase/server";
import { AgentVoiceForm } from "@/components/agent-voice-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
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
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, default_agent_name, default_system_prompt")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voz do agente</h1>
        <p className="text-sm text-muted">
          Defina o nome e como o agente deve responder e agir.
        </p>
      </div>
      <AgentVoiceForm agent={agent} templates={templates ?? []} />
    </div>
  );
}
