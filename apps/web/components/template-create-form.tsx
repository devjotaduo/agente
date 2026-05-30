"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTemplate } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardTitle, Label } from "@/components/ui/card";

export function TemplateCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentName, setAgentName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createTemplate({
        name,
        description,
        default_agent_name: agentName,
        default_system_prompt: prompt,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setDescription("");
      setAgentName("");
      setPrompt("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Novo template</Button>;
  }

  return (
    <Card className="space-y-4">
      <CardTitle>Novo template</CardTitle>
      <div>
        <Label htmlFor="t-name">Nome</Label>
        <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Suporte técnico" />
      </div>
      <div>
        <Label htmlFor="t-desc">Descrição</Label>
        <Input id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="t-agent">Nome padrão do agente</Label>
        <Input id="t-agent" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex.: Téo" />
      </div>
      <div>
        <Label htmlFor="t-prompt">Voz padrão (system prompt)</Label>
        <Textarea id="t-prompt" rows={8} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending || !name || !prompt}>
          {pending ? "Criando…" : "Criar template"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
