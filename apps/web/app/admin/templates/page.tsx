import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TemplateCreateForm } from "@/components/template-create-form";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, slug, description, default_agent_name")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-muted">Modelos de persona usados ao criar agentes.</p>
        </div>
        <TemplateCreateForm />
      </div>

      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{t.name}</CardTitle>
              <span className="font-mono text-xs text-muted">{t.slug}</span>
            </div>
            {t.description && <CardDescription className="mt-1">{t.description}</CardDescription>}
            {t.default_agent_name && (
              <p className="mt-2 text-xs text-muted">Agente padrão: {t.default_agent_name}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
