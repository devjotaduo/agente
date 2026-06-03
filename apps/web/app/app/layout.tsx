import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  return (
    <Shell
      home="/app"
      email={profile.email}
      nav={[
        { href: "/app", label: "Meu agente" },
        { href: "/app/posters", label: "Posts" },
      ]}
    >
      {children}
    </Shell>
  );
}
