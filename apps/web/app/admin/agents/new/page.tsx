import { createClient } from "@/lib/supabase/server";
import { AgentWizard } from "@/components/agent-wizard";

export default async function NewAgentPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, slug, name, description, default_agent_name, default_system_prompt")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo agente</h1>
        <p className="text-sm text-muted">
          Siga os passos para configurar o agente e o login do cliente. Você pode navegar
          livremente entre eles.
        </p>
      </div>
      <AgentWizard templates={templates ?? []} />
    </div>
  );
}
