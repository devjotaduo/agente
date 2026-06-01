import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ count: agentsCount }, { count: templatesCount }, { count: clientsCount }] =
    await Promise.all([
      supabase.from("agents").select("*", { count: "exact", head: true }),
      supabase.from("templates").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client"),
    ]);

  const stats = [
    { label: "Agentes", value: agentsCount ?? 0, href: "/admin/agents" },
    { label: "Clientes", value: clientsCount ?? 0, href: "/admin/agents" },
    { label: "Templates", value: templatesCount ?? 0, href: "/admin/templates" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <p className="text-sm text-muted">Gerencie agentes, clientes e templates.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-[var(--primary)]">
              <CardDescription>{s.label}</CardDescription>
              <p className="mt-2 text-3xl font-semibold">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardTitle>Começar</CardTitle>
        <CardDescription className="mt-1">
          Crie um novo agente e o login do cliente em{" "}
          <Link href="/admin/agents/new" className="text-[var(--primary)] underline">
            Novo agente
          </Link>
          .
        </CardDescription>
      </Card>
    </div>
  );
}
