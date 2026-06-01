import { getMyAgent } from "@/lib/agents";
import { createClient } from "@/lib/supabase/server";
import { AgentSteps } from "@/components/agent-steps";
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
    .select("id, slug, name, description, default_agent_name, default_system_prompt")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuração do agente</h1>
        <p className="text-sm text-muted">
          Ajuste dados da empresa, catálogo, voz, skills e testes em um único fluxo.
        </p>
      </div>
      <AgentSteps agent={agent} templates={templates ?? []} />
    </div>
  );
}
