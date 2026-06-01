"use client";

import { useState } from "react";
import Link from "next/link";
import { updateAgent } from "@/app/actions/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle, Label } from "@/components/ui/card";
import { WhatsappPanel } from "@/components/whatsapp-panel";
import { TestChat } from "@/components/test-chat";
import { cn } from "@/lib/utils";
import type { AgentBusinessProfile, AgentCatalogItem, Enums } from "@jotaduo/shared";

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  default_agent_name: string | null;
  default_system_prompt: string;
}

interface ExistingAgent {
  id: string;
  display_name: string;
  system_prompt: string;
  model: string;
  template_id?: string | null;
  tone: string;
  skills: string[];
  business_profile?: unknown;
}

interface ConnState {
  status: Enums<"conn_status">;
  qr_code: string | null;
  phone_number: string | null;
  last_error: string | null;
}

type Msg = { role: "user" | "assistant"; content: string };

const TONES = [
  "Amigável",
  "Formal",
  "Descontraído",
  "Profissional",
  "Empático",
  "Direto",
  "Entusiasmado",
];

const STEPS = [
  { n: 1, label: "Básico" },
  { n: 2, label: "Empresa" },
  { n: 3, label: "Voz" },
  { n: 4, label: "Skills" },
  { n: 5, label: "WhatsApp" },
  { n: 6, label: "Teste" },
];

const SKILL_SUGGESTIONS = [
  "Informar horário de funcionamento",
  "Consultar status de pedido",
  "Tirar dúvidas sobre produtos",
  "Agendar atendimento",
  "Encaminhar para um humano",
];

type TemplateNoteKey = keyof NonNullable<AgentBusinessProfile["templateNotes"]>;

const DEFAULT_TEMPLATE_NOTES: { key: TemplateNoteKey; label: string; placeholder: string }[] = [
  {
    key: "attendance",
    label: "Regras de atendimento",
    placeholder: "Ex.: pedir número do pedido, prazo para retorno humano, canais de suporte...",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function emptyCatalogItem(): AgentCatalogItem {
  return { name: "", price: "", details: "" };
}

function normalizeCatalogItem(value: unknown): AgentCatalogItem | null {
  if (!isRecord(value)) return null;
  return {
    name: cleanString(value.name),
    price: cleanString(value.price),
    details: cleanString(value.details),
  };
}

function normalizeBusinessProfile(value: unknown): AgentBusinessProfile {
  if (!isRecord(value)) return { products: [] };
  const rawNotes = isRecord(value.templateNotes) ? value.templateNotes : {};
  return {
    companyName: cleanString(value.companyName),
    companyAddress: cleanString(value.companyAddress),
    companyInfo: cleanString(value.companyInfo),
    products: Array.isArray(value.products)
      ? value.products.map(normalizeCatalogItem).filter((item): item is AgentCatalogItem => !!item)
      : [],
    templateNotes: {
      attendance: cleanString(rawNotes.attendance),
      sales: cleanString(rawNotes.sales),
      postSales: cleanString(rawNotes.postSales),
      scheduling: cleanString(rawNotes.scheduling),
      availability: cleanString(rawNotes.availability),
      policies: cleanString(rawNotes.policies),
    },
  };
}

function getTemplateDetailConfig(template?: Template) {
  switch (template?.slug) {
    case "vendas":
      return {
        catalogTitle: "Produtos/serviços e preços",
        catalogDescription: "Itens que o agente pode apresentar sem inventar valores.",
        namePlaceholder: "Ex.: Plano Pro",
        notes: [
          {
            key: "sales" as const,
            label: "Condições comerciais",
            placeholder: "Ex.: formas de pagamento, descontos, link de compra, região atendida...",
          },
          {
            key: "policies" as const,
            label: "Regras e limites",
            placeholder: "Ex.: quando pedir ajuda humana, política de orçamento, estoque...",
          },
        ],
      };
    case "pos-venda":
      return {
        catalogTitle: "Produtos comprados e preços",
        catalogDescription: "Produtos, planos ou serviços que aparecem no pós-venda.",
        namePlaceholder: "Ex.: Kit inicial",
        notes: [
          {
            key: "postSales" as const,
            label: "Trocas, garantia e devoluções",
            placeholder: "Ex.: prazo de troca, documentos necessários, etapas da garantia...",
          },
          {
            key: "policies" as const,
            label: "Status e logística",
            placeholder: "Ex.: como consultar pedido, prazos de entrega, transportadora...",
          },
        ],
      };
    case "agendamento":
      return {
        catalogTitle: "Serviços e valores",
        catalogDescription: "Serviços que podem ser agendados, com duração ou preço quando houver.",
        namePlaceholder: "Ex.: Consulta inicial",
        notes: [
          {
            key: "availability" as const,
            label: "Disponibilidade",
            placeholder: "Ex.: segunda a sexta, 9h às 18h; sábados somente manhã...",
          },
          {
            key: "scheduling" as const,
            label: "Regras de agendamento",
            placeholder: "Ex.: antecedência mínima, dados necessários, remarcação, confirmação...",
          },
        ],
      };
    case "sac":
    default:
      return {
        catalogTitle: "Produtos/serviços e preços",
        catalogDescription: "Itens sobre os quais o atendimento pode tirar dúvidas.",
        namePlaceholder: "Ex.: Assinatura mensal",
        notes: DEFAULT_TEMPLATE_NOTES,
      };
  }
}

export function AgentSteps({
  templates,
  agent,
  connection,
  initialTestMessages = [],
}: {
  templates: Template[];
  /** Se presente, modo "gerenciar" (edita um agente existente). Senão, modo "criar". */
  agent?: ExistingAgent;
  connection?: ConnState;
  initialTestMessages?: Msg[];
}) {
  const [step, setStep] = useState(1);

  // Campos
  const [email, setEmail] = useState("");
  const [agentName, setAgentName] = useState(agent?.display_name ?? templates[0]?.default_agent_name ?? "");
  const [tone, setTone] = useState(agent?.tone ?? "");
  const [templateId, setTemplateId] = useState(agent ? agent.template_id ?? "" : templates[0]?.id ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent?.system_prompt ?? templates[0]?.default_system_prompt ?? "",
  );
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [businessProfile, setBusinessProfile] = useState<AgentBusinessProfile>(() =>
    normalizeBusinessProfile(agent?.business_profile),
  );

  // Estado de criação / persistência
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdLogin, setCreatedLogin] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentId = agent?.id ?? createdId;
  const hasAgent = !!agentId;
  const canCreate = !!email.trim() && !!agentName.trim();
  const selectedTemplate = templates.find((x) => x.id === templateId) ?? (agent ? undefined : templates[0]);
  const templateDetail = getTemplateDetailConfig(selectedTemplate);
  const catalogItems = businessProfile.products ?? [];

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSystemPrompt(t.default_system_prompt);
      if (!agentName.trim() && t.default_agent_name) setAgentName(t.default_agent_name);
    }
  }

  function addSkill(value?: string) {
    const s = (value ?? skillInput).trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }
  function removeSkill(s: string) {
    setSkills((prev) => prev.filter((x) => x !== s));
  }

  function updateBusinessProfile(patch: Partial<AgentBusinessProfile>) {
    setBusinessProfile((prev) => ({ ...prev, ...patch }));
  }

  function updateTemplateNote(key: TemplateNoteKey, value: string) {
    setBusinessProfile((prev) => ({
      ...prev,
      templateNotes: { ...(prev.templateNotes ?? {}), [key]: value },
    }));
  }

  function addCatalogItem() {
    setBusinessProfile((prev) => ({ ...prev, products: [...(prev.products ?? []), emptyCatalogItem()] }));
  }

  function updateCatalogItem(index: number, patch: AgentCatalogItem) {
    setBusinessProfile((prev) => ({
      ...prev,
      products: (prev.products ?? []).map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeCatalogItem(index: number) {
    setBusinessProfile((prev) => ({
      ...prev,
      products: (prev.products ?? []).filter((_, i) => i !== index),
    }));
  }

  async function create() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/admin/create-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        agentName,
        tone,
        templateId: templateId || null,
        systemPrompt,
        skills,
        businessProfile,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Falha ao criar agente.");
      return;
    }
    setCreatedId(data.agentId);
    setCreatedLogin(data.client);
    setStep(5);
  }

  function save() {
    if (!agentId) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    updateAgent({
      id: agentId,
      display_name: agentName,
      system_prompt: systemPrompt,
      tone,
      skills,
      business_profile: businessProfile,
    })
      .then((res) => {
        if (res.error) setError(res.error);
        else {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                step === s.n ? "bg-white/8 text-foreground" : "text-muted hover:bg-white/5",
              )}
            >
              <span
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                  step === s.n ? "bg-[var(--primary)] text-white" : "bg-white/5 text-muted",
                )}
              >
                {s.n}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      {createdLogin && (
        <Card className="border-[var(--success)]/30 bg-[var(--success)]/5">
          <CardTitle className="text-[var(--success)]">Agente criado ✅</CardTitle>
          <CardDescription className="mt-1">
            Credenciais do cliente (repasse a ele) — a senha não será exibida de novo.
          </CardDescription>
          <div className="mt-3 space-y-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
            <div>
              <span className="text-muted">E-mail: </span>
              <span className="font-mono">{createdLogin.email}</span>
            </div>
            <div>
              <span className="text-muted">Senha: </span>
              <span className="font-mono">{createdLogin.password}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Conteúdo do passo */}
      <Card className="min-h-[280px]">
        {step === 1 && (
          <div className="space-y-4">
            <CardTitle>1. Básico</CardTitle>
            {!hasAgent && (
              <div>
                <Label htmlFor="email">E-mail do cliente (login)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                />
              </div>
            )}
            <div>
              <Label htmlFor="name">Nome do agente</Label>
              <Input id="name" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex.: Sofia" />
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
              <Label htmlFor="tpl">Template</Label>
              <select
                id="tpl"
                value={templateId}
                onChange={(e) => e.target.value && applyTemplate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                {agent && <option value="">— aplicar template (opcional) —</option>}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">O template preenche a voz no passo 3. Edite livremente.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <CardTitle>2. Empresa</CardTitle>
              <CardDescription>
                Dados opcionais que ajudam o agente a responder com contexto real.
              </CardDescription>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input
                  id="companyName"
                  value={businessProfile.companyName ?? ""}
                  onChange={(e) => updateBusinessProfile({ companyName: e.target.value })}
                  placeholder="Ex.: Jotaduo"
                />
              </div>
              <div>
                <Label htmlFor="companyAddress">Endereço</Label>
                <Input
                  id="companyAddress"
                  value={businessProfile.companyAddress ?? ""}
                  onChange={(e) => updateBusinessProfile({ companyAddress: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="companyInfo">Informações da empresa</Label>
              <Textarea
                id="companyInfo"
                rows={4}
                value={businessProfile.companyInfo ?? ""}
                onChange={(e) => updateBusinessProfile({ companyInfo: e.target.value })}
                placeholder="Ex.: horários, área atendida, diferenciais, contatos, links importantes..."
              />
            </div>

            <div className="space-y-3 border-t border-[var(--border)] pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{templateDetail.catalogTitle}</p>
                  <p className="text-sm text-muted">{templateDetail.catalogDescription}</p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addCatalogItem}>
                  Adicionar item
                </Button>
              </div>

              {catalogItems.length > 0 && (
                <div className="space-y-3">
                  {catalogItems.map((item, index) => (
                    <div key={index} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                        <div>
                          <Label htmlFor={`catalog-name-${index}`}>Nome</Label>
                          <Input
                            id={`catalog-name-${index}`}
                            value={item.name ?? ""}
                            onChange={(e) => updateCatalogItem(index, { name: e.target.value })}
                            placeholder={templateDetail.namePlaceholder}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`catalog-price-${index}`}>Preço</Label>
                          <Input
                            id={`catalog-price-${index}`}
                            value={item.price ?? ""}
                            onChange={(e) => updateCatalogItem(index, { price: e.target.value })}
                            placeholder="Ex.: R$ 99"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCatalogItem(index)}
                            className="mb-0.5"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label htmlFor={`catalog-details-${index}`}>Detalhes</Label>
                        <Textarea
                          id={`catalog-details-${index}`}
                          rows={2}
                          value={item.details ?? ""}
                          onChange={(e) => updateCatalogItem(index, { details: e.target.value })}
                          placeholder="Descrição, condições, variações, links ou observações."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {catalogItems.length === 0 && (
                <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-muted">
                  Nenhum item cadastrado. O agente será instruído a não inventar produtos ou preços.
                </p>
              )}
            </div>

            <div className="grid gap-4">
              {templateDetail.notes.map((note) => (
                <div key={note.key}>
                  <Label htmlFor={`template-note-${note.key}`}>{note.label}</Label>
                  <Textarea
                    id={`template-note-${note.key}`}
                    rows={3}
                    value={businessProfile.templateNotes?.[note.key] ?? ""}
                    onChange={(e) => updateTemplateNote(note.key, e.target.value)}
                    placeholder={note.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <CardTitle>3. Voz do agente</CardTitle>
            <CardDescription>Como o agente deve responder e agir (personalidade, regras).</CardDescription>
            <Textarea rows={12} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="Descreva o comportamento do agente…" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <CardTitle>4. Skills</CardTitle>
            <CardDescription>O que o agente sabe fazer. Adicione quantas quiser.</CardDescription>
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
              <Button variant="secondary" onClick={() => addSkill()} type="button">
                Adicionar
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-sm">
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="text-muted hover:text-foreground" aria-label={`Remover ${s}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div>
              <p className="mb-1 text-xs text-muted">Sugestões:</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map((s) => (
                  <button key={s} type="button" onClick={() => addSkill(s)} className="rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-xs text-muted hover:bg-white/5">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <CardTitle>5. Conexão WhatsApp</CardTitle>
            {agentId ? (
              <WhatsappPanel
                agentId={agentId}
                initial={
                  connection ?? { status: "disconnected", qr_code: null, phone_number: null, last_error: null }
                }
              />
            ) : (
              <CardDescription>Crie o agente (botão abaixo) para gerar o QR code automaticamente.</CardDescription>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <CardTitle>6. Teste</CardTitle>
            {agentId ? (
              <TestChat agentId={agentId} agentName={agentName || "agente"} initialMessages={initialTestMessages} />
            ) : (
              <CardDescription>Crie o agente (botão abaixo) para testar a conversa.</CardDescription>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </Card>

      {/* Rodapé */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-400">Salvo!</span>}
          {hasAgent ? (
            <Button onClick={save} disabled={loading}>
              {loading ? "Salvando…" : "Salvar alterações"}
            </Button>
          ) : (
            <Button onClick={create} disabled={!canCreate || loading}>
              {loading ? "Criando…" : "Criar agente"}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={step === STEPS.length}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
