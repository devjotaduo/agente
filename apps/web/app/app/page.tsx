import Link from "next/link";
import { getMyAgent, getConnection } from "@/lib/agents";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ConnBadge } from "@/components/conn-badge";

export default async function ClientHome() {
  const agent = await getMyAgent();

  if (!agent) {
    return (
      <Card>
        <CardTitle>Nenhum agente ainda</CardTitle>
        <CardDescription className="mt-1">
          Seu agente ainda não foi configurado. Fale com o suporte da jotaduo.
        </CardDescription>
      </Card>
    );
  }

  const conn = await getConnection(agent.id);

  return (
<<<<<<< HEAD
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{agent.display_name}</h1>
        <p className="text-sm text-muted">Configure, teste e conecte seu agente seguindo os passos.</p>
=======
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{agent.display_name}</h1>
          <p className="text-sm text-muted">Seu agente de atendimento</p>
        </div>
        <ConnBadge status={conn?.status ?? "disconnected"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/app/settings">
          <Card className="h-full transition-colors hover:border-[var(--primary)]">
            <CardTitle>Voz</CardTitle>
            <CardDescription className="mt-1">
              Defina como o agente fala, age e o nome dele.
            </CardDescription>
          </Card>
        </Link>
        <Link href="/app/test">
          <Card className="h-full transition-colors hover:border-[var(--primary)]">
            <CardTitle>Testar</CardTitle>
            <CardDescription className="mt-1">
              Converse com o agente antes de conectar o WhatsApp.
            </CardDescription>
          </Card>
        </Link>
        <Link href="/app/whatsapp">
          <Card className="h-full transition-colors hover:border-[var(--primary)]">
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription className="mt-1">
              Conecte um número via QR code para o agente atender.
            </CardDescription>
          </Card>
        </Link>
>>>>>>> parent of cb6ee27 (Add agent wizard, business profile & worker)
      </div>
    </div>
  );
}
