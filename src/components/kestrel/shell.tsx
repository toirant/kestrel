import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useDesk } from "@/lib/kestrel/store";
import { cn } from "./ui";

const LINKS = [
  { to: "/", label: "Field" },
  { to: "/board", label: "Case file" },
  { to: "/review", label: "Source" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const running = useDesk((state) => state.hunt.running);

  useEffect(() => {
    void useDesk.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="h-0.5 bg-copper" />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-3">
            <span className="grid size-9 place-items-center bg-copper font-mono text-sm font-medium text-ink">
              K
            </span>
            <span>
              <span className="block font-serif text-xl leading-none">Kestrel</span>
              <span className="font-mono text-xs uppercase tracking-widest text-faint">Bounty desk</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const on = link.to === "/" ? path === "/" : path.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "inline-flex min-h-11 items-center px-3 font-mono text-xs uppercase tracking-widest",
                    on ? "text-copper" : "text-muted",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="border-b border-line bg-surface">
        <p className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-mono text-xs text-muted md:px-6">
          <span>Authorized targets only. These companies are fictional. Kestrel will not scan a live URL.</span>
          {running ? (
            <span className="inline-flex items-center gap-2 text-copper">
              <span className="size-1.5 animate-pulse rounded-full bg-copper" />
              Hunting
            </span>
          ) : null}
        </p>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
