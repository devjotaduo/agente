import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PosterStudio } from "@/components/poster-studio";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function PostersPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent: agentParam } = await searchParams;
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("id, display_name")
    .order("display_name");

  const list = agents ?? [];

  // Status de conexão do Instagram por agente (para o seletor).
  const { data: igConns } = list.length
    ? await supabase.from("instagram_connections").select("agent_id, status")
    : { data: [] as { agent_id: string; status: string }[] };
  const igConnected = new Set(
    (igConns ?? []).filter((c) => c.status === "connected").map((c) => c.agent_id),
  );
  // Seleciona o agente da URL ou o primeiro disponível.
  const agentId = agentParam && list.some((a) => a.id === agentParam) ? agentParam : list[0]?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Posts</h1>
        <p className="text-sm text-muted">Gere e publique pôsteres no Instagram para cada agente.</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardTitle>Nenhum agente</CardTitle>
          <CardDescription className="mt-1">Crie um agente primeiro em “Novo agente”.</CardDescription>
        </Card>
      ) : (
        <>
          {/* Seletor de agente */}
          <div className="flex flex-wrap gap-2">
            {list.map((a) => (
              <Link
                key={a.id}
                href={`/admin/posters?agent=${a.id}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  a.id === agentId
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-foreground"
                    : "border-[var(--border)] text-muted hover:bg-white/5",
                )}
                title={igConnected.has(a.id) ? "Instagram conectado" : "Instagram desconectado"}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    igConnected.has(a.id) ? "bg-[var(--success)]" : "bg-white/20",
                  )}
                />
                {a.display_name}
              </Link>
            ))}
          </div>

          {agentId && <PosterStudioForAgent agentId={agentId} />}
        </>
      )}
    </div>
  );
}

async function PosterStudioForAgent({ agentId }: { agentId: string }) {
  const supabase = await createClient();

  const [{ data: igConn }, { data: posters }] = await Promise.all([
    supabase
      .from("instagram_connections")
      .select("status, username, ig_user_id, last_error")
      .eq("agent_id", agentId)
      .maybeSingle(),
    supabase
      .from("posters")
      .select("id, briefing, caption, image_url, status, ig_permalink, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(48),
  ]);

  return (
    <PosterStudio
      agentId={agentId}
      initialConnection={{
        status: igConn?.status ?? "disconnected",
        username: igConn?.username ?? null,
        ig_user_id: igConn?.ig_user_id ?? null,
        last_error: igConn?.last_error ?? null,
      }}
      initialPosters={(posters ?? []) as never}
    />
  );
}
