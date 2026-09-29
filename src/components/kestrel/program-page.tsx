import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { band } from "@/lib/kestrel/format";
import { getProbes, getProgram } from "@/lib/kestrel/programs";
import { useDesk } from "@/lib/kestrel/store";
import type { Severity } from "@/lib/kestrel/types";
import { FindingList } from "./finding-list";
import { FixDesk } from "./fix-desk";
import { HuntLog } from "./hunt-log";
import { Lab } from "./labs";
import { Button, Eyebrow, Panel } from "./ui";

const ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function ProgramPage({ programId }: { programId: string }) {
  const program = getProgram(programId);
  const probes = getProbes(programId);
  const running = useDesk((state) => state.hunt.running);
  const dispatch = useDesk((state) => state.dispatch);
  const stop = useDesk((state) => state.stop);
  const reshuffle = useDesk((state) => state.reshuffle);
  const [queue, setQueue] = useState(probes.map((probe) => probe.id));
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(probes.map((probe) => [probe.id, true])),
  );

  if (!program) {
    return (
      <div>
        <h1 className="font-serif text-4xl">No program under that name.</h1>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center text-copper">
          Back to the field
        </Link>
      </div>
    );
  }

  function move(id: string, direction: -1 | 1) {
    setQueue((current) => {
      const index = current.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  const selected = queue.filter((id) => picked[id]);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-muted">
          Field
        </Link>
        <Eyebrow>{program.host}</Eyebrow>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl leading-tight md:text-5xl">{program.name}</h1>
            <p className="mt-3 max-w-xl text-lg text-muted">{program.blurb}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button tone="quiet" onClick={stop}>
                Stop the hunt
              </Button>
            ) : (
              <Button
                onClick={() => dispatch([{ programId: program.id, probeIds: selected }])}
                disabled={selected.length === 0}
              >
                Run selected
              </Button>
            )}
            <Button tone="quiet" onClick={reshuffle} disabled={running}>
              Reshuffle lab data
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Probe order</h2>
        <p className="mt-2 max-w-xl text-muted">
          Tick the probes you want and move them. The hunt runs only that list, top to bottom.
        </p>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {queue.map((id, index) => {
            const probe = probes.find((item) => item.id === id);
            if (!probe) return null;
            return (
              <li key={id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-copper"
                    checked={picked[id] !== false}
                    onChange={() => setPicked((current) => ({ ...current, [id]: !current[id] }))}
                  />
                  <span className="min-w-0">
                    <span className="font-serif text-lg">{probe.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">{probe.hypothesis}</span>
                  </span>
                </label>
                <span className="flex gap-2 pl-7 sm:pl-0">
                  <Button tone="meta" onClick={() => move(id, -1)} disabled={index === 0}>
                    Up
                  </Button>
                  <Button tone="meta" onClick={() => move(id, 1)} disabled={index === queue.length - 1}>
                    Down
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface p-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-copper">In scope</h2>
          <ul className="mt-2 space-y-1">
            {program.inScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="bg-surface p-4">
          <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Out of scope</h2>
          <ul className="mt-2 space-y-1 text-muted">
            {program.outOfScope.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="font-mono text-xs uppercase tracking-widest text-faint">Illustrative bands</h2>
        <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {ORDER.map((severity) => (
            <div key={severity} className="bg-surface px-3 py-3">
              <dt className="font-mono text-xs uppercase tracking-widest text-muted">{severity}</dt>
              <dd className="mt-1 font-serif text-lg tabular-nums">{band(...program.payouts[severity])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Specimen" title="Try it yourself">
          <Lab programId={program.id} />
        </Panel>
        <div className="space-y-4">
          <HuntLog placeholder />
          {running ? null : (
            <p className="text-muted">
              The hunt uses the same calls as the specimen. Nothing is sent off this desk.
            </p>
          )}
        </div>
      </div>

      <Panel eyebrow="Fix it" title="Edit the function, then re-run">
        <FixDesk programId={program.id} />
      </Panel>

      <section>
        <h2 className="font-serif text-2xl">From this lab</h2>
        <div className="mt-4">
          <FindingList programId={program.id} />
        </div>
      </section>
    </div>
  );
}
