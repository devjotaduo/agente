import { getMyAgent } from "@/lib/agents";
import { createAdminClient } from "@/lib/supabase/admin";
import { PosterStudio } from "@/components/poster-studio";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function ClientPostersPage() {
  const agent = await getMyAgent();

  if (!agent) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardTitle>Nenhum agente</CardTitle>
        <CardDescription className="mt-1">Fale com a equipe da jotaduo para ativar seu agente.</CardDescription>
      </Card>
    );
  }

  // Ownership já garantido por getMyAgent (RLS). Carregamos os dados de posts/IG
  // com o client de service_role para não depender de policies nessas tabelas.
  const admin = createAdminClient();
  const [{ data: igConn }, { data: posters }] = await Promise.all([
    admin
      .from("instagram_connections")
      .select("status, username, ig_user_id, last_error")
      .eq("agent_id", agent.id)
      .maybeSingle(),
    admin
      .from("posters")
      .select("id, briefing, caption, image_url, status, ig_permalink, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(48),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Posts</h1>
        <p className="text-sm text-muted">Gere a arte e a legenda com IA e publique no seu Instagram.</p>
      </div>
      <PosterStudio
        agentId={agent.id}
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
