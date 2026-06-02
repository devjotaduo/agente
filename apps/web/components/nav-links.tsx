"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export function NavLinks({
  items,
  orientation = "horizontal",
  className,
}: {
  items: NavItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  function isActive(href: string) {
    // Match exato para raizes (/admin, /app) e prefixo para subrotas.
    if (href === "/admin" || href === "/app") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className={cn(vertical ? "flex flex-col gap-1" : "flex items-center gap-1", className)}>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg text-sm transition-colors",
              vertical ? "w-full px-3 py-2" : "px-3 py-1.5",
              active
                ? "bg-white/8 text-foreground"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
