import { useEffect, useRef } from "react";
import { clock } from "@/lib/kestrel/format";
import { useDesk } from "@/lib/kestrel/store";
import { cn } from "./ui";

const kindClass: Record<string, string> = {
  scope: "text-fg",
  map: "text-muted",
  hypo: "text-fg",
  miss: "text-muted",
  hit: "text-copper",
  note: "text-faint",
};

export function HuntLog({ placeholder = false }: { placeholder?: boolean }) {
  const lines = useDesk((state) => state.hunt.lines);
  const phase = useDesk((state) => state.hunt.phase);
  const running = useDesk((state) => state.hunt.running);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [lines.length]);

  if (lines.length === 0 && !running && !placeholder) return null;

  return (
    <section className="min-w-0 border border-line bg-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="font-mono text-xs uppercase tracking-widest text-copper">Agent trace</p>
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          {running ? phase : phase === "done" ? "pass complete" : "idle"}
        </p>
      </header>
      <div className="max-h-80 overflow-auto px-4 py-3" aria-live="polite">
        {lines.length === 0 ? (
          <p className="font-mono text-xs text-faint">The trace lands here. Nothing leaves the desk.</p>
        ) : (
          <ol className="space-y-1.5">
            {lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[3.2rem_3.4rem_minmax(0,1fr)] gap-3 font-mono text-xs leading-relaxed">
                <span className="tabular-nums text-faint">{clock(line.at)}</span>
                <span className={cn("uppercase tracking-widest", kindClass[line.kind])}>{line.kind}</span>
                <span className={cn("min-w-0 break-words", kindClass[line.kind])}>{line.text}</span>
              </li>
            ))}
          </ol>
        )}
        <div ref={bottom} />
      </div>
    </section>
  );
}
