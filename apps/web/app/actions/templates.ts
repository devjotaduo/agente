"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createTemplate(input: {
  name: string;
  description?: string;
  default_agent_name?: string;
  default_system_prompt: string;
}): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const slug = slugify(input.name);
  if (!slug) return { error: "Nome inválido." };

  const { error } = await supabase.from("templates").insert({
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    default_agent_name: input.default_agent_name?.trim() || null,
    default_system_prompt: input.default_system_prompt,
  });
  if (error) {
    return { error: error.message.includes("duplicate") ? "Já existe um template com esse nome." : error.message };
  }
  revalidatePath("/admin/templates");
  return { ok: true };
}
