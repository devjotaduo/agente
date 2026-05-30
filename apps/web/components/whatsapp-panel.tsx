"use client";

import { useEffect, useState, useTransition } from "react";
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

  function connect() {
    startTransition(async () => {
      await requestWhatsappConnect(agentId);
      setConn((c) => ({ ...c, status: "qr_pending", qr_code: null, last_error: null }));
    });
  }
  function disconnect() {
    startTransition(async () => {
      await requestWhatsappDisconnect(agentId);
      setConn((c) => ({ ...c, status: "logged_out", qr_code: null }));
    });
  }

  const showQr = conn.status === "qr_pending" || conn.status === "connecting";

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Conexão WhatsApp</CardTitle>
        <ConnBadge status={conn.status} />
      </div>

      {conn.status === "connected" ? (
        <div className="space-y-3">
          <CardDescription>
            Conectado{conn.phone_number ? ` ao número ${conn.phone_number}` : ""}. O agente já
            responde as mensagens recebidas.
          </CardDescription>
          <Button variant="danger" onClick={disconnect} disabled={pending}>
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <CardDescription>
            Clique em conectar e escaneie o QR code no app do WhatsApp em{" "}
            <span className="text-foreground">Aparelhos conectados › Conectar um aparelho</span>.
          </CardDescription>

          {showQr && conn.qr_code ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg bg-white p-3">
                {/* qr_code é um data URL PNG gravado pelo worker */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={conn.qr_code} alt="QR code do WhatsApp" width={240} height={240} />
              </div>
              <p className="text-xs text-muted">O código expira em segundos e é renovado automaticamente.</p>
            </div>
          ) : showQr ? (
            <p className="text-sm text-muted">Gerando QR code… aguarde o worker.</p>
          ) : null}

          {conn.last_error && <p className="text-sm text-red-400">Erro: {conn.last_error}</p>}

          {!showQr && (
            <Button onClick={connect} disabled={pending}>
              {pending ? "Solicitando…" : "Conectar WhatsApp"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
