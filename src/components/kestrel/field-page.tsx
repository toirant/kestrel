import { Link } from "@tanstack/react-router";
import { band, money } from "@/lib/kestrel/format";
import { PROGRAMS } from "@/lib/kestrel/programs";
import { useDesk } from "@/lib/kestrel/store";
import { HuntLog } from "./hunt-log";
import { Button, Eyebrow } from "./ui";

const METHOD = [
  { n: "01", title: "Scope", body: "Read what is in, and what is explicitly out." },
  { n: "02", title: "Map", body: "List the routes the lab actually exposes." },
  { n: "03", title: "Probe", body: "Call the same functions the specimen uses." },
  { n: "04", title: "Report", body: "Keep evidence, impact, and a fix. You file it." },
];

export function FieldPage() {
  const findings = useDesk((state) => state.findings);
  const running = useDesk((state) => state.hunt.running);
  const dispatch = useDesk((state) => state.dispatch);
  const stop = useDesk((state) => state.stop);
  const open = findings.filter((finding) => finding.status !== "filed");
  const mid = open.reduce((sum, finding) => sum + (finding.bountyLow + finding.bountyHigh) / 2, 0);
  const low = open.reduce((sum, finding) => sum + finding.bountyLow, 0);
  const high = open.reduce((sum, finding) => sum + finding.bountyHigh, 0);

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] lg:items-end">
        <div>
          <Eyebrow>Case file</Eyebrow>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight md:text-5xl">
            Five labs. No live hosts.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Dispatch Kestrel on a fictional program, or hand it source. It writes the evidence.
            You decide what is worth filing.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          {running ? (
            <Button tone="quiet" onClick={stop}>
              Stop the hunt
            </Button>
          ) : (
            <Button onClick={() => dispatch(PROGRAMS.map((program) => program.id))}>
              Dispatch the case
            </Button>
          )}
          <Link
            to="/review"
            className="inline-flex min-h-11 items-center font-serif text-base text-copper"
          >
            Or review source you paste
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        <div className="bg-surface px-4 py-4">
          <dt className="font-mono text-xs uppercase tracking-widest text-faint">Open findings</dt>
          <dd className="mt-1 font-serif text-3xl tabular-nums">{open.length}</dd>
        </div>
        <div className="bg-surface px-4 py-4">
          <dt className="font-mono text-xs uppercase tracking-widest text-faint">Ready to file</dt>
          <dd className="mt-1 font-serif text-3xl tabular-nums">
            {findings.filter((finding) => finding.status === "ready").length}
          </dd>
        </div>
        <div className="col-span-2 bg-surface px-4 py-4 sm:col-span-1">
          <dt className="font-mono text-xs uppercase tracking-widest text-faint">Illustrative band</dt>
          <dd className="mt-1 font-serif text-2xl tabular-nums md:text-3xl">
            {open.length === 0 ? "—" : band(low, high)}
          </dd>
          <p className="mt-1 font-mono text-xs text-faint">
            {open.length === 0
              ? "Nothing open"
              : `Mid-band ${money(Math.round(mid))} if every open finding paid. Not a payout.`}
          </p>
        </div>
      </dl>

      <HuntLog />

      <div>
        <Eyebrow>In the case</Eyebrow>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {PROGRAMS.map((program) => {
            const count = findings.filter((finding) => finding.programId === program.id).length;
            return (
              <li key={program.id}>
                <Link
                  to="/program/$id"
                  params={{ id: program.id }}
                  className="flex min-h-11 flex-col gap-2 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-faint">
                      {program.index} · {program.host}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl">{program.name}</h2>
                    <p className="mt-1 max-w-xl text-muted">{program.blurb}</p>
                  </div>
                  <p className="shrink-0 font-mono text-xs uppercase tracking-widest text-copper">
                    {count > 0 ? `${count} in file` : program.surface}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {METHOD.map((step) => (
          <li key={step.n}>
            <p className="font-mono text-xs text-copper">{step.n}</p>
            <h2 className="mt-2 font-serif text-xl">{step.title}</h2>
            <p className="mt-1 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
