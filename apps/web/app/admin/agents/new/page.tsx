import { createClient } from "@/lib/supabase/server";
import { NewAgentForm } from "@/components/new-agent-form";

export default async function NewAgentPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, slug, name, description, default_agent_name, default_system_prompt")
    .eq("is_active", true)
    .order("name");

  return (
<<<<<<< HEAD
    <div className="mx-auto max-w-6xl space-y-6">
=======
    <div className="mx-auto max-w-2xl space-y-6">
>>>>>>> parent of cb6ee27 (Add agent wizard, business profile & worker)
      <div>
        <h1 className="text-2xl font-semibold">Novo agente</h1>
        <p className="text-sm text-muted">
          Cria o agente e o login isolado do cliente. As credenciais aparecem ao final.
        </p>
      </div>
      <NewAgentForm templates={templates ?? []} />
    </div>
  );
}
