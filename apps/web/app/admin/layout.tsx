import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <Shell
      brand="jotaduo · Admin"
      email={profile.email}
      nav={[
        { href: "/admin", label: "Visão geral" },
        { href: "/admin/agents", label: "Agentes" },
        { href: "/admin/agents/new", label: "Novo agente" },
        { href: "/admin/posters", label: "Gerar imagem" },
        { href: "/admin/templates", label: "Templates" },
      ]}
    >
      {children}
    </Shell>
  );
}
