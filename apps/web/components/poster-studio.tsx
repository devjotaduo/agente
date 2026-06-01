"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDescription, CardTitle, Label } from "@/components/ui/card";

export interface IgConnState {
  status: "disconnected" | "connected" | "error";
  username: string | null;
  ig_user_id: string | null;
  last_error: string | null;
}

export interface PosterItem {
  id: string;
  briefing: string;
  caption: string | null;
  image_url: string | null;
  status: "draft" | "generating" | "ready" | "publishing" | "published" | "failed";
  ig_permalink: string | null;
  created_at: string;
}

export function PosterStudio({
  agentId,
  initialConnection,
  initialPosters,
}: {
  agentId: string;
  initialConnection: IgConnState;
  initialPosters: PosterItem[];
}) {
  const [conn, setConn] = useState<IgConnState>(initialConnection);
  const [posters, setPosters] = useState<PosterItem[]>(initialPosters);

  // Conexão Instagram
  const [igUserId, setIgUserId] = useState(conn.ig_user_id ?? "");
  const [token, setToken] = useState("");
  const [connLoading, setConnLoading] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [showConnForm, setShowConnForm] = useState(conn.status !== "connected");
  const [showManual, setShowManual] = useState(false);

  // Login direto do Instagram (sem precisar de Página do Facebook).
  function oauthConnect() {
    window.location.href = `/api/admin/instagram/oauth/ig/start?agentId=${encodeURIComponent(agentId)}`;
  }
  // Alternativa: conectar via Página do Facebook.
  function fbPageConnect() {
    window.location.href = `/api/admin/instagram/oauth/start?agentId=${encodeURIComponent(agentId)}`;
  }

  // Geração
  const [briefing, setBriefing] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PosterItem | null>(null);
  const [draftCaption, setDraftCaption] = useState("");

  // Publicação
  const [pubLoading, setPubLoading] = useState<string | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);

  const connected = conn.status === "connected";

  async function connectInstagram() {
    setConnError(null);
    setConnLoading(true);
    try {
      const res = await fetch("/api/admin/instagram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, igUserId: igUserId.trim(), accessToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnError(data.error ?? "Falha ao conectar.");
        setConn((c) => ({ ...c, status: "error", last_error: data.error ?? null }));
        return;
      }
      setConn({ status: "connected", username: data.username, ig_user_id: igUserId.trim(), last_error: null });
      setToken("");
      setShowConnForm(false);
    } finally {
      setConnLoading(false);
    }
  }

  async function generate() {
    if (!briefing.trim()) return;
    setGenError(null);
    setGenLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/admin/posters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, briefing: briefing.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Falha ao gerar o pôster.");
        return;
      }
      const p = data.poster as PosterItem;
      setDraft(p);
      setDraftCaption(p.caption ?? "");
      setPosters((prev) => [p, ...prev]);
    } catch (e: any) {
      setGenError(e?.message ?? "Falha ao gerar o pôster.");
    } finally {
      setGenLoading(false);
    }
  }

  async function publish(posterId: string, caption: string) {
    setPubError(null);
    setPubLoading(posterId);
    try {
      const res = await fetch("/api/admin/posters/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterId, caption }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPubError(data.error ?? "Falha ao publicar.");
        return;
      }
      const permalink = data.poster?.ig_permalink ?? null;
      setPosters((prev) =>
        prev.map((p) =>
          p.id === posterId ? { ...p, status: "published", caption, ig_permalink: permalink } : p,
        ),
      );
      if (draft?.id === posterId) {
        setDraft((d) => (d ? { ...d, status: "published", caption, ig_permalink: permalink } : d));
      }
    } finally {
      setPubLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Conexão Instagram */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Conta do Instagram</CardTitle>
          {connected ? (
            <span className="rounded-full bg-[var(--success)]/15 px-3 py-1 text-xs text-[var(--success)]">
              Conectado{conn.username ? ` · @${conn.username}` : ""}
            </span>
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted">Desconectado</span>
          )}
        </div>

        {connected && !showConnForm ? (
          <div className="flex items-center justify-between">
            <CardDescription>
              Publicando como <span className="text-foreground">@{conn.username}</span>.
            </CardDescription>
            <Button variant="ghost" size="sm" onClick={() => setShowConnForm(true)}>
              Trocar token
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {conn.status === "error" && conn.last_error && (
              <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{conn.last_error}</p>
            )}
            <CardDescription>
              Conecte uma conta do Instagram <span className="text-foreground">profissional</span>{" "}
              (Empresa/Criador). Você faz login no Instagram e autoriza — sem colar token e{" "}
              <span className="text-foreground">sem precisar de Página do Facebook</span>.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={oauthConnect}>Conectar Instagram</Button>
              {connected && (
                <Button variant="ghost" onClick={() => setShowConnForm(false)}>
                  Cancelar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <button
                type="button"
                onClick={fbPageConnect}
                className="text-muted underline hover:text-foreground"
              >
                conectar via Página do Facebook
              </button>
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="text-muted underline hover:text-foreground"
              >
                {showManual ? "ocultar token manual" : "ou colar token manualmente"}
              </button>
            </div>

            {showManual && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
                <CardDescription>
                  Alternativa: cole o <span className="text-foreground">IG User ID</span> e um{" "}
                  <span className="text-foreground">token de longa duração</span> (veja{" "}
                  <span className="font-mono text-xs">docs/instagram-setup.md</span>).
                </CardDescription>
                <div>
                  <Label htmlFor="igid">IG User ID (Business/Creator)</Label>
                  <Input
                    id="igid"
                    value={igUserId}
                    onChange={(e) => setIgUserId(e.target.value)}
                    placeholder="178414...."
                  />
                </div>
                <div>
                  <Label htmlFor="igtoken">Token de acesso de longa duração</Label>
                  <Input
                    id="igtoken"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="EAAG..."
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={connectInstagram}
                  disabled={connLoading || !igUserId.trim() || !token.trim()}
                >
                  {connLoading ? "Validando…" : "Conectar com token"}
                </Button>
              </div>
            )}
            {connError && <p className="text-sm text-red-400">{connError}</p>}
          </div>
        )}
      </Card>

      {/* Criar pôster */}
      <Card className="space-y-4">
        <CardTitle>Criar pôster com IA</CardTitle>
        <CardDescription>
          Descreva o post que você quer. A IA cria a arte (quadrada 1:1) e sugere a legenda.
        </CardDescription>
        <Textarea
          rows={4}
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          placeholder="Ex.: Promoção de pizza grande na sexta-feira, 2 por R$59,90. Visual apetitoso, cores quentes."
        />
        {genError && <p className="text-sm text-red-400">{genError}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={genLoading || !briefing.trim()}>
            {genLoading ? "Gerando arte…" : "Gerar pôster"}
          </Button>
          {genLoading && (
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)]" />
              Pode levar até ~1 min.
            </span>
          )}
        </div>

        {/* Preview do rascunho recém-gerado */}
        {draft?.image_url && (
          <div className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-[220px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.image_url}
              alt="Pré-visualização do pôster"
              className="aspect-square w-full rounded-lg border border-[var(--border)] object-cover"
            />
            <div className="space-y-3">
              <div>
                <Label htmlFor="caption">Legenda</Label>
                <Textarea
                  id="caption"
                  rows={6}
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                />
              </div>
              {pubError && <p className="text-sm text-red-400">{pubError}</p>}
              {draft.status === "published" ? (
                <p className="text-sm text-[var(--success)]">
                  Publicado ✅{" "}
                  {draft.ig_permalink && (
                    <a className="underline" href={draft.ig_permalink} target="_blank" rel="noreferrer">
                      ver no Instagram
                    </a>
                  )}
                </p>
              ) : (
                <Button
                  onClick={() => publish(draft.id, draftCaption)}
                  disabled={!connected || pubLoading === draft.id}
                  title={connected ? "" : "Conecte o Instagram primeiro"}
                >
                  {pubLoading === draft.id ? "Publicando…" : "Publicar no Instagram"}
                </Button>
              )}
              {!connected && (
                <p className="text-xs text-muted">Conecte o Instagram acima para poder publicar.</p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Histórico */}
      {posters.length > 0 && (
        <Card className="space-y-4">
          <CardTitle>Pôsteres</CardTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {posters.map((p) => (
              <div key={p.id} className="space-y-2">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.briefing}
                    className="aspect-square w-full rounded-lg border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center rounded-lg border border-[var(--border)] bg-white/5 text-xs text-muted">
                    {p.status === "generating" ? "gerando…" : p.status}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <StatusBadge status={p.status} />
                  {p.ig_permalink && (
                    <a
                      className="text-xs text-[var(--primary)] underline"
                      href={p.ig_permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ver
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PosterItem["status"] }) {
  const map: Record<PosterItem["status"], { label: string; cls: string }> = {
    draft: { label: "rascunho", cls: "bg-white/5 text-muted" },
    generating: { label: "gerando", cls: "bg-white/5 text-muted" },
    ready: { label: "pronto", cls: "bg-[var(--primary)]/15 text-foreground" },
    publishing: { label: "publicando", cls: "bg-white/5 text-muted" },
    published: { label: "publicado", cls: "bg-[var(--success)]/15 text-[var(--success)]" },
    failed: { label: "falhou", cls: "bg-red-500/15 text-red-400" },
  };
  const s = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>;
}
