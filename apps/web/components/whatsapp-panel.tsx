"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { requestWhatsappConnect, requestWhatsappDisconnect } from "@/app/actions/agents";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ConnBadge } from "@/components/conn-badge";
import type { Enums } from "@jotaduo/shared";

interface ConnState {
  status: Enums<"conn_status">;
  qr_code: string | null;
  phone_number: string | null;
  last_error: string | null;
}

export function WhatsappPanel({
  agentId,
  initial,
}: {
  agentId: string;
  initial: ConnState;
}) {
  const [conn, setConn] = useState<ConnState>(initial);
  const [pending, startTransition] = useTransition();
  const autoStarted = useRef(false);

  // Realtime: status/QR ao vivo.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wa-conn-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_connections",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const row = payload.new as ConnState;
          setConn({
            status: row.status,
            qr_code: row.qr_code,
            phone_number: row.phone_number,
            last_error: row.last_error,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  // Auto-inicia a conexão (gera QR) ao abrir, se ainda não conectado.
  useEffect(() => {
    if (autoStarted.current) return;
    if (conn.status === "disconnected" || conn.status === "logged_out") {
      autoStarted.current = true;
      startTransition(async () => {
        await requestWhatsappConnect(agentId);
        setConn((c) => ({ ...c, status: "qr_pending", qr_code: null, last_error: null }));
      });
    }
  }, [conn.status, agentId]);

  function retry() {
    autoStarted.current = true;
    startTransition(async () => {
      await requestWhatsappConnect(agentId);
      setConn((c) => ({ ...c, status: "qr_pending", qr_code: null, last_error: null }));
    });
  }

  function disconnect() {
    startTransition(async () => {
      await requestWhatsappDisconnect(agentId);
      autoStarted.current = false;
      setConn((c) => ({ ...c, status: "logged_out", qr_code: null }));
    });
  }

  if (conn.status === "connected") {
    return (
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>Conexão WhatsApp</CardTitle>
          <ConnBadge status={conn.status} />
        </div>
        <CardDescription>
          Conectado{conn.phone_number ? ` ao número ${conn.phone_number}` : ""}. O agente já
          responde as mensagens recebidas.
        </CardDescription>
        <Button variant="danger" onClick={disconnect} disabled={pending}>
          Desconectar
        </Button>
      </Card>
    );
  }

  const isError = conn.status === "error";

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Conexão WhatsApp</CardTitle>
        <ConnBadge status={conn.status} />
      </div>

      <CardDescription>
        Abra o WhatsApp no celular em{" "}
        <span className="text-foreground">Aparelhos conectados › Conectar um aparelho</span> e
        escaneie o código abaixo.
      </CardDescription>

      {conn.qr_code ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={conn.qr_code} alt="QR code do WhatsApp" width={240} height={240} />
          </div>
          <p className="text-xs text-muted">
            O código expira em segundos e é renovado automaticamente.
          </p>
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <p className="text-sm text-red-400">{conn.last_error ?? "Falha na conexão."}</p>
          <Button onClick={retry} disabled={pending}>
            Gerar QR novamente
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 py-6">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)]" />
          <p className="text-sm text-muted">Gerando QR code… aguarde alguns segundos.</p>
        </div>
      )}
    </Card>
  );
}
