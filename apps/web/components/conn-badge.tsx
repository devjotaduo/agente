import type { Enums } from "@jotaduo/shared";

const map: Record<Enums<"conn_status">, { label: string; cls: string }> = {
  disconnected: { label: "Desconectado", cls: "bg-white/5 text-muted" },
  qr_pending: { label: "Aguardando QR", cls: "bg-amber-500/15 text-amber-400" },
  connecting: { label: "Conectando…", cls: "bg-amber-500/15 text-amber-400" },
  connected: { label: "Conectado", cls: "bg-emerald-500/15 text-emerald-400" },
  logged_out: { label: "Desconectado", cls: "bg-white/5 text-muted" },
  error: { label: "Erro", cls: "bg-red-500/15 text-red-400" },
};

export function ConnBadge({ status }: { status: Enums<"conn_status"> }) {
  const s = map[status] ?? map.disconnected;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
