"use client";

import { useState, useTransition } from "react";
import { updateAgent } from "@/app/actions/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, Label } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  tone: string;
  skills: string[];
}

const TONES = [
  "Amigável",
  "Formal",
  "Descontraído",
  "Profissional",
  "Empático",
  "Direto",
  "Entusiasmado",
];

export function AgentVoiceForm({
  agent,
  templates,
}: {
  agent: AgentLite;
  templates: Template[];
}) {
  const [displayName, setDisplayName] = useState(agent.display_name);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);
  const [tone, setTone] = useState(agent.tone ?? "");
  const [skills, setSkills] = useState<string[]>(agent.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function applyTemplate(id: string) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    if (tpl.default_agent_name) setDisplayName(tpl.default_agent_name);
    setSystemPrompt(tpl.default_system_prompt);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateAgent({
        id: agent.id,
        display_name: displayName,
        system_prompt: systemPrompt,
        tone,
        skills,
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
        <Label>Tom do agente</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(tone === t ? "" : t)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                tone === t
                  ? "border-[var(--primary)] bg-[var(--primary)]/15 text-foreground"
                  : "border-[var(--border)] text-muted hover:bg-white/5",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="voz">Voz — como o agente responde e age</Label>
        <Textarea
          id="voz"
          rows={10}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Descreva o tom, a personalidade e as regras de atendimento do agente…"
        />
      </div>

      <div>
        <Label>Skills</Label>
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Ex.: Consultar status de pedido"
          />
          <Button variant="secondary" onClick={addSkill} type="button">
            Adicionar
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-sm"
              >
                {s}
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  className="text-muted hover:text-foreground"
                  aria-label={`Remover ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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
