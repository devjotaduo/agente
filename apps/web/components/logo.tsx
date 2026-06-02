import { cn } from "@/lib/utils";

/** Marca da jotaduo: badge com bolha de conversa + wordmark. */
export function Logo({
  className,
  showText = true,
  size = 28,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="grid place-items-center rounded-[10px] shadow-lg shadow-black/30"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
        }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4V6a2 2 0 0 1 2-2z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="9.5" cy="10" r="1.2" fill="var(--primary)" />
          <circle cx="14.5" cy="10" r="1.2" fill="var(--primary)" />
        </svg>
      </span>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight">
          jota<span className="text-[var(--primary)]">duo</span>
        </span>
      )}
    </span>
  );
}
