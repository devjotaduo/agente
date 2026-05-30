import { getMyAgent, getConnection } from "@/lib/agents";
import { WhatsappPanel } from "@/components/whatsapp-panel";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function WhatsappPage() {
  const agent = await getMyAgent();
  if (!agent) {
    return (
      <Card>
        <CardTitle>Nenhum agente</CardTitle>
        <CardDescription className="mt-1">Fale com o suporte da jotaduo.</CardDescription>
      </Card>
    );
  }

  const conn = await getConnection(agent.id);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp</h1>
        <p className="text-sm text-muted">Conecte um número para {agent.display_name} atender.</p>
      </div>
      <WhatsappPanel
        agentId={agent.id}
        initial={{
          status: conn?.status ?? "disconnected",
          qr_code: conn?.qr_code ?? null,
          phone_number: conn?.phone_number ?? null,
          last_error: conn?.last_error ?? null,
        }}
      />
    </div>
  );
}
