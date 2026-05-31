import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentSteps } from "@/components/agent-steps";
import { PosterStudio } from "@/components/poster-studio";

export default async function AdminAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, display_name, system_prompt, model, owner_id, tone, skills")
    .eq("id", id)
    .maybeSingle();

  if (!agent) notFound();

  const [{ data: owner }, { data: conn }, { data: templates }, { data: testConv }, { data: igConn }, { data: posters }] =
    await Promise.all([
      supabase.from("profiles").select("email").eq("id", agent.owner_id).maybeSingle(),
      supabase
        .from("whatsapp_connections")
        .select("status, qr_code, phone_number, last_error")
        .eq("agent_id", id)
        .maybeSingle(),
      supabase
        .from("templates")
        .select("id, slug, name, description, default_agent_name, default_system_prompt")
        .eq("is_active", true)
        .order("name"),
      supabase.from("conversations").select("id").eq("agent_id", id).eq("channel", "test").maybeSingle(),
      supabase
        .from("instagram_connections")
        .select("status, username, ig_user_id, last_error")
        .eq("agent_id", id)
        .maybeSingle(),
      supabase
        .from("posters")
        .select("id, briefing, caption, image_url, status, ig_permalink, created_at")
        .eq("agent_id", id)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);

  let initialTestMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (testConv) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", testConv.id)
      .order("created_at", { ascending: true });
    initialTestMessages = (msgs ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{agent.display_name}</h1>
        <p className="text-sm text-muted">Cliente: {owner?.email ?? "—"}</p>
      </div>
      <AgentSteps
        templates={templates ?? []}
        agent={agent}
        connection={
          conn
            ? {
                status: conn.status,
                qr_code: conn.qr_code,
                phone_number: conn.phone_number,
                last_error: conn.last_error,
              }
            : undefined
        }
        initialTestMessages={initialTestMessages}
      />

      <div className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-lg font-semibold">Instagram &amp; pôsteres</h2>
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
    </div>
  );
}
