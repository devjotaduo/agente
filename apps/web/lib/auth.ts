import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@jotaduo/shared";

export interface SessionProfile {
  id: string;
  email: string;
  role: AppRole;
  fullName: string | null;
}

/** Retorna o usuário logado + perfil. Redireciona para /login se não autenticado. */
export async function requireUser(): Promise<SessionProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role: (profile?.role ?? "client") as AppRole,
    fullName: profile?.full_name ?? null,
  };
}

/** Exige papel admin; redireciona client para /app. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/app");
  return profile;
}
