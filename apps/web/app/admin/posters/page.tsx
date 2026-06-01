import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PosterStudio } from "@/components/poster-studio";
import { cn } from "@/lib/utils";

export default async function AdminPostersPage({
  searchParams,
}: {
  searchParams?: Promise<{ agentId?: string }>;
}) {
  const supabase = await createClient();
  const query = await searchParams;

  const { data: agents } = await supabase
    .from("agents")
    .select("id, display_name, owner_id, created_at")
    .order("created_at", { ascending: false });

  if (!agents?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Gerar imagem</h1>
          <p className="text-sm text-muted">Crie artes e posts para o Instagram dos agentes.</p>
        </div>
        <Card>
          <CardTitle>Nenhum agente ainda</CardTitle>
          <CardDescription className="mt-1">
            Crie um agente antes de gerar imagens para Instagram.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const requestedAgentId = query?.agentId;
  const selectedAgent = agents.find((agent) => agent.id === requestedAgentId) ?? agents[0];
  const ownerIds = [...new Set(agents.map((agent) => agent.owner_id))];

  const [{ data: profiles }, { data: igConn }, { data: posters }] = await Promise.all([
    ownerIds.length
      ? supabase.from("profiles").select("id, email").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    supabase
      .from("instagram_connections")
      .select("status, username, ig_user_id, last_error")
      .eq("agent_id", selectedAgent.id)
      .maybeSingle(),
    supabase
      .from("posters")
      .select("id, briefing, caption, image_url, status, ig_permalink, created_at")
      .eq("agent_id", selectedAgent.id)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const emailByOwnerId = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gerar imagem</h1>
        <p className="text-sm text-muted">Crie artes, legendas e posts para o Instagram.</p>
      </div>

      <Card className="space-y-3">
        <div>
          <CardTitle>Agente</CardTitle>
          <CardDescription className="mt-1">Escolha para qual cliente a imagem sera criada.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => {
            const active = agent.id === selectedAgent.id;
            return (
              <Link
                key={agent.id}
                href={`/admin/posters?agentId=${agent.id}`}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-foreground"
                    : "border-[var(--border)] text-muted hover:bg-white/5 hover:text-foreground",
                )}
              >
                <span className="block font-medium">{agent.display_name}</span>
                <span className="block max-w-[180px] truncate text-xs text-muted">
                  {emailByOwnerId.get(agent.owner_id) ?? "sem email"}
                </span>
              </Link>
            );
          })}
        </div>
      </Card>

      <PosterStudio
        agentId={selectedAgent.id}
        initialConnection={{
          status: igConn?.status ?? "disconnected",
          username: igConn?.username ?? null,
          ig_user_id: igConn?.ig_user_id ?? null,
          last_error: igConn?.last_error ?? null,
        }}
        initialPosters={(posters ?? []) as never}
      />
    </div>
  );
}
