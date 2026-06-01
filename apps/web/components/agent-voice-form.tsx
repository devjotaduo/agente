"use client";

import { useState, useTransition } from "react";
import { updateAgent } from "@/app/actions/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, Label } from "@/components/ui/card";

interface Template {
  id: string;
  name: string;
  default_agent_name: string | null;
  default_system_prompt: string;
}

interface AgentLite {
  id: string;
  display_name: string;
  system_prompt: string;
  model: string;
}

export function AgentVoiceForm({
  agent,
  templates,
}: {
  agent: AgentLite;
  templates: Template[];
}) {
  const [displayName, setDisplayName] = useState(agent.display_name);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyTemplate(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (tpl.default_agent_name) setDisplayName(tpl.default_agent_name);
    setSystemPrompt(tpl.default_system_prompt);
  }

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateAgent({
        id: agent.id,
        display_name: displayName,
        system_prompt: systemPrompt,
      });
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <Card className="space-y-4">
      {templates.length > 0 && (
        <div>
          <Label htmlFor="tpl">Aplicar template (opcional)</Label>
          <select
            id="tpl"
            defaultValue=""
            onChange={(e) => e.target.value && applyTemplate(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="">— escolher —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="name">Nome do agente</Label>
        <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <div>
        <Label htmlFor="voz">Voz — como o agente responde e age</Label>
        <Textarea
          id="voz"
          rows={12}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Descreva o tom, a personalidade e as regras de atendimento do agente…"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        {saved && <span className="text-sm text-emerald-400">Salvo!</span>}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </Card>
  );
}
