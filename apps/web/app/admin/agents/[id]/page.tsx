import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentVoiceForm } from "@/components/agent-voice-form";
import { ConnBadge } from "@/components/conn-badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function AdminAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, display_name, system_prompt, model, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!agent) notFound();

  const [{ data: owner }, { data: conn }, { data: templates }] = await Promise.all([
    supabase.from("profiles").select("email").eq("id", agent.owner_id).maybeSingle(),
    supabase.from("whatsapp_connections").select("status, phone_number").eq("agent_id", id).maybeSingle(),
    supabase
      .from("templates")
      .select("id, name, default_agent_name, default_system_prompt")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{agent.display_name}</h1>
          <p className="text-sm text-muted">Cliente: {owner?.email ?? "—"}</p>
        </div>
        <ConnBadge status={conn?.status ?? "disconnected"} />
      </div>

      <Card>
        <CardTitle>Conexão WhatsApp</CardTitle>
        <CardDescription className="mt-1">
          {conn?.phone_number
            ? `Número conectado: ${conn.phone_number}`
            : "Sem número conectado. O cliente conecta pelo painel dele."}
        </CardDescription>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Voz</h2>
        <AgentVoiceForm agent={agent} templates={templates ?? []} />
      </div>
    </div>
  );
}
