import Link from "next/link";
import { Logo } from "@/components/logo";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { signOut } from "@/app/actions/auth";

export type { NavItem };

export function Shell({
  badge,
  email,
  nav,
  home,
  children,
}: {
  /** Rotulo do contexto (ex.: "Admin" ou "Cliente"). */
  badge?: string;
  email: string;
  nav: NavItem[];
  /** Para onde o logo aponta. */
  home: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-4 lg:h-full lg:max-w-none lg:px-5 lg:py-5">
          <Link href={home} className="flex w-fit items-center gap-2">
            <Logo />
            {badge && (
              <span className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-muted">
                {badge}
              </span>
            )}
          </Link>

          <NavLinks items={nav} orientation="vertical" />

          <div className="mt-auto border-t border-[var(--border)] pt-4">
            <p className="truncate text-sm text-muted" title={email}>
              {email}
            </p>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
