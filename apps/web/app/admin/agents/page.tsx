import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnBadge } from "@/components/conn-badge";
import type { Enums } from "@jotaduo/shared";

export default async function AgentsListPage() {
  const supabase = await createClient();
  const { data: agents } = await supabase
    .from("agents")
    .select("id, display_name, owner_id, created_at")
    .order("created_at", { ascending: false });

  const ownerIds = [...new Set((agents ?? []).map((a) => a.owner_id))];
  const agentIds = (agents ?? []).map((a) => a.id);

  const [{ data: profiles }, { data: conns }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    agentIds.length
      ? supabase.from("whatsapp_connections").select("agent_id, status").in("agent_id", agentIds)
      : Promise.resolve({ data: [] as { agent_id: string; status: Enums<"conn_status"> }[] }),
  ]);

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const statusByAgent = new Map((conns ?? []).map((c) => [c.agent_id, c.status]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agentes</h1>
          <p className="text-sm text-muted">Todos os agentes e seus clientes.</p>
        </div>
        <Link href="/admin/agents/new">
          <Button>Novo agente</Button>
        </Link>
      </div>

      {!agents?.length ? (
        <Card>
          <CardTitle>Nenhum agente ainda</CardTitle>
          <CardDescription className="mt-1">Crie o primeiro em “Novo agente”.</CardDescription>
        </Card>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <Link key={a.id} href={`/admin/agents/${a.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-[var(--primary)]">
                <div>
                  <p className="font-medium">{a.display_name}</p>
                  <p className="text-sm text-muted">{emailById.get(a.owner_id) ?? "—"}</p>
                </div>
                <ConnBadge status={statusByAgent.get(a.id) ?? "disconnected"} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
