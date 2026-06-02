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

  // Geração
  const [briefing, setBriefing] = useState("");
  const [format, setFormat] = useState("1080x1080");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Detalhe (modal) + publicação
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCaption, setSelectedCaption] = useState("");
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  const connected = conn.status === "connected";
  const selected = posters.find((p) => p.id === selectedId) ?? null;

  function oauthConnect() {
    window.location.href = `/api/admin/instagram/oauth/ig/start?agentId=${encodeURIComponent(agentId)}`;
  }
  function fbPageConnect() {
    window.location.href = `/api/admin/instagram/oauth/start?agentId=${encodeURIComponent(agentId)}`;
  }

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
    } catch (e: any) {
      setConnError(e?.message ?? "Falha ao conectar.");
    } finally {
      setConnLoading(false);
    }
  }

  async function generate() {
    if (!briefing.trim()) return;
    setGenError(null);
    setGenLoading(true);
    try {
      const res = await fetch("/api/admin/posters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, briefing: briefing.trim(), size: format }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? "Falha ao gerar o pôster.");
        return;
      }
      const p = data.poster as PosterItem;
      setPosters((prev) => [p, ...prev]);
      setBriefing("");
    } catch (e: any) {
      setGenError(e?.message ?? "Falha ao gerar o pôster.");
    } finally {
      setGenLoading(false);
    }
  }

  function openDetail(p: PosterItem) {
    setSelectedId(p.id);
    setSelectedCaption(p.caption ?? "");
    setPubError(null);
  }
  function closeDetail() {
    setSelectedId(null);
    setPubError(null);
  }

  async function publish() {
    if (!selected) return;
    setPubError(null);
    setPubLoading(true);
    try {
      const res = await fetch("/api/admin/posters/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterId: selected.id, caption: selectedCaption }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPubError(data.error ?? "Falha ao publicar.");
        return;
      }
      const permalink = data.poster?.ig_permalink ?? null;
      setPosters((prev) =>
        prev.map((p) =>
          p.id === selected.id
            ? { ...p, status: "published", caption: selectedCaption, ig_permalink: permalink }
            : p,
        ),
      );
    } catch (e: any) {
      setPubError(e?.message ?? "Falha ao publicar.");
    } finally {
      setPubLoading(false);
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
              Trocar conta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {conn.status === "error" && conn.last_error && (
              <p className="rounded-lg bg-red-500/10 p-2 text-sm text-red-400">{conn.last_error}</p>
            )}
            <CardDescription>
              Conecte uma conta do Instagram <span className="text-foreground">profissional</span>{" "}
              (Empresa/Criador). Login direto, sem precisar de Página do Facebook.
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
              <button type="button" onClick={fbPageConnect} className="text-muted underline hover:text-foreground">
                conectar via Página do Facebook
              </button>
              <button type="button" onClick={() => setShowManual((v) => !v)} className="text-muted underline hover:text-foreground">
                {showManual ? "ocultar token manual" : "ou colar token manualmente"}
              </button>
            </div>
            {showManual && (
              <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
                <CardDescription>
                  Alternativa: cole o <span className="text-foreground">IG User ID</span> e um{" "}
                  <span className="text-foreground">token de longa duração</span>.
                </CardDescription>
                <div>
                  <Label htmlFor="igid">IG User ID (Business/Creator)</Label>
                  <Input id="igid" value={igUserId} onChange={(e) => setIgUserId(e.target.value)} placeholder="178414...." />
                </div>
                <div>
                  <Label htmlFor="igtoken">Token de acesso de longa duração</Label>
                  <Input id="igtoken" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA..." />
                </div>
                <Button variant="secondary" onClick={connectInstagram} disabled={connLoading || !igUserId.trim() || !token.trim()}>
                  {connLoading ? "Validando…" : "Conectar com token"}
                </Button>
              </div>
            )}
            {connError && <p className="text-sm text-red-400">{connError}</p>}
          </div>
        )}
      </Card>

      {/* 1) Gerar pôster */}
      <Card className="space-y-4">
        <CardTitle>Criar pôster com IA</CardTitle>
        <CardDescription>
          Descreva o post. A IA cria a arte (quadrada 1:1) e a legenda — depois é só ver e publicar.
        </CardDescription>
        <Textarea
          rows={4}
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          placeholder="Ex.: Promoção de pizza grande na sexta, 2 por R$59,90. Visual apetitoso, cores quentes."
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="fmt" className="mb-0">Formato</Label>
          <select
            id="fmt"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
          >
            <option value="1080x1080">Quadrado (1:1)</option>
            <option value="1080x1350">Retrato (4:5)</option>
          </select>
        </div>
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
      </Card>

      {/* 2) Lista de gerados */}
      <Card className="space-y-4">
        <CardTitle>Pôsteres gerados</CardTitle>
        {posters.length === 0 ? (
          <CardDescription>Nenhum pôster ainda. Gere o primeiro acima.</CardDescription>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {posters.map((p) => (
              <div key={p.id} className="space-y-2 rounded-lg border border-[var(--border)] p-2">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.briefing}
                    className="aspect-square w-full rounded-md border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="grid aspect-square w-full place-items-center rounded-md border border-[var(--border)] bg-white/5 text-xs text-muted">
                    {p.status === "generating" ? "gerando…" : p.status}
                  </div>
                )}
                <div className="flex items-center justify-between gap-1">
                  <StatusBadge status={p.status} />
                  <Button size="sm" variant="secondary" onClick={() => openDetail(p)}>
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3) Modal de detalhe: modelo do post + publicar */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDetail}
        >
          <Card
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Modelo do post</CardTitle>
              <button onClick={closeDetail} className="text-muted hover:text-foreground" aria-label="Fechar">
                ✕
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[280px_1fr]">
              {selected.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.image_url}
                  alt="Pôster"
                  className="aspect-square w-full rounded-lg border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center rounded-lg border border-[var(--border)] bg-white/5 text-sm text-muted">
                  {selected.status}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="cap">Legenda</Label>
                  <Textarea id="cap" rows={8} value={selectedCaption} onChange={(e) => setSelectedCaption(e.target.value)} />
                </div>

                {pubError && <p className="text-sm text-red-400">{pubError}</p>}

                {selected.status === "published" ? (
                  <p className="text-sm text-[var(--success)]">
                    Publicado ✅{" "}
                    {selected.ig_permalink && (
                      <a className="underline" href={selected.ig_permalink} target="_blank" rel="noreferrer">
                        ver no Instagram
                      </a>
                    )}
                  </p>
                ) : (
                  <>
                    <Button onClick={publish} disabled={!connected || pubLoading}>
                      {pubLoading ? "Publicando…" : "Publicar no Instagram"}
                    </Button>
                    {!connected && (
                      <p className="text-xs text-muted">Conecte o Instagram acima para poder publicar.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
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
  const s = map[status] ?? { label: String(status), cls: "bg-white/5 text-muted" };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>;
}
