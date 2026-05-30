import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  return (
    <Shell
      brand="jotaduo"
      email={profile.email}
      nav={[
        { href: "/app", label: "Meu agente" },
        { href: "/app/settings", label: "Voz" },
        { href: "/app/test", label: "Testar" },
        { href: "/app/whatsapp", label: "WhatsApp" },
      ]}
    >
      {children}
    </Shell>
  );
}
