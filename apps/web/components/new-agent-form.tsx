"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle, Label } from "@/components/ui/card";

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  default_agent_name: string | null;
  default_system_prompt: string;
}

interface CreatedResult {
  agentId: string;
  client: { email: string; password: string };
}

export function NewAgentForm({ templates }: { templates: Template[] }) {
  const [email, setEmail] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [agentName, setAgentName] = useState(templates[0]?.default_agent_name ?? "");
  const [systemPrompt, setSystemPrompt] = useState(templates[0]?.default_system_prompt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedResult | null>(null);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setAgentName(tpl.default_agent_name ?? "");
      setSystemPrompt(tpl.default_system_prompt);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/create-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, templateId: templateId || null, agentName, systemPrompt }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Falha ao criar agente.");
      return;
    }
    setResult({ agentId: data.agentId, client: data.client });
  }

  if (result) {
    return (
      <Card>
        <CardTitle>Agente criado ✅</CardTitle>
        <CardDescription className="mt-1">
          Repasse estas credenciais ao cliente. A senha não será exibida novamente.
        </CardDescription>
        <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm">
          <div>
            <span className="text-muted">E-mail: </span>
            <span className="font-mono">{result.client.email}</span>
          </div>
          <div>
            <span className="text-muted">Senha: </span>
            <span className="font-mono">{result.client.password}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href={`/admin/agents/${result.agentId}`}>
            <Button variant="secondary">Abrir agente</Button>
          </Link>
          <Link href="/admin/agents">
            <Button variant="ghost">Ver todos</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail do cliente (login)</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </div>

        <div>
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Selecionar um template preenche a voz abaixo. Você pode editar livremente.
          </p>
        </div>

        <div>
          <Label htmlFor="agentName">Nome do agente</Label>
          <Input
            id="agentName"
            required
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Ex.: Sofia"
          />
        </div>

        <div>
          <Label htmlFor="voz">Voz (como o agente responde e age)</Label>
          <Textarea
            id="voz"
            rows={8}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? "Criando…" : "Criar agente + login"}
        </Button>
      </form>
    </Card>
  );
}
