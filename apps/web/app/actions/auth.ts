"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Encerra a sessão e volta para o login. Server Action garante a limpeza dos cookies. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
