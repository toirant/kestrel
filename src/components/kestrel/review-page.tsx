import { useState } from "react";
import { deepenReview, type DeepFinding } from "@/lib/kestrel/deepen.functions";
import { band } from "@/lib/kestrel/format";
import { PAYOUTS } from "@/lib/kestrel/payouts";
import { SOURCE_PROGRAM_ID, SOURCE_PROGRAM_NAME } from "@/lib/kestrel/programs";
import { CHECKED_PATTERNS, findingKey, reviewSource, SAMPLES, type ReviewHit } from "@/lib/kestrel/review";
import { useDesk } from "@/lib/kestrel/store";
import type { FindingDraft } from "@/lib/kestrel/types";
import { Button, Eyebrow, SeverityChip } from "./ui";

export function ReviewPage() {
  const code = useDesk((state) => state.draftCode);
  const setCode = useDesk((state) => state.setDraftCode);
  const addDraft = useDesk((state) => state.addDraft);
  const [hits, setHits] = useState<ReviewHit[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState("");
  const [deep, setDeep] = useState<DeepFinding[]>([]);
  const [refused, setRefused] = useState("");
  const [added, setAdded] = useState<Record<string, "added" | "already">>({});

  function read() {
    setHits(reviewSource(code));
    setError("");
    setOverview("");
    setDeep([]);
    setRefused("");
  }

  function fileHit(hit: ReviewHit) {
    const key = findingKey(hit.ruleId, hit.snippet);
    const draft: FindingDraft = {
      title: hit.title,
      severity: hit.severity,
      cvss: hit.cvss,
      cwe: hit.cwe,
      asset: `Pasted source, line ${hit.line}`,
      summary: hit.summary,
      steps: [
        "Paste the source on the Source desk and run the local read.",
        `Inspect line ${hit.line}: ${hit.snippet}`,
      ],
      impact: hit.impact,
      remediation: hit.remediation,
      bountyLow: hit.bountyLow,
      bountyHigh: hit.bountyHigh,
      request: `Line ${hit.line}\n${hit.snippet}`,
      response: "Static read of pasted source. No request was sent.",
    };
    const ok = addDraft(SOURCE_PROGRAM_ID, SOURCE_PROGRAM_NAME, key, draft);
    setAdded((current) => ({ ...current, [key]: ok ? "added" : "already" }));
  }

  function fileDeep(finding: DeepFinding) {
    const key = findingKey("grok", `${finding.title}\n${finding.evidence}`);
    const [low, high] = PAYOUTS[finding.severity];
    const draft: FindingDraft = {
      title: finding.title,
      severity: finding.severity,
      cvss: finding.cvss,
      cwe: finding.cwe,
      asset: "Pasted source",
      summary: finding.summary,
      steps: ["Review the pasted source against the evidence line below.", finding.evidence || finding.summary],
      impact: finding.impact || "See the summary. Confirm it against the code before you file.",
      remediation: finding.remediation || "Fix the line the evidence quotes, then re-read.",
      bountyLow: low,
      bountyHigh: high,
      request: finding.evidence || "(no line quoted)",
      response: "Drafted from the paste. No live host was contacted.",
    };
    const ok = addDraft(SOURCE_PROGRAM_ID, SOURCE_PROGRAM_NAME, key, draft);
    setAdded((current) => ({ ...current, [key]: ok ? "added" : "already" }));
  }

  async function draft() {
    setBusy(true);
    setError("");
    setRefused("");
    const localHits = hits ?? reviewSource(code);
    if (!hits) setHits(localHits);
    try {
      const local = localHits.slice(0, 12).map((hit) => ({
        line: hit.line,
        title: hit.title,
        severity: hit.severity,
        cwe: hit.cwe,
      }));
      const result = await deepenReview({ data: { code, note, hits: local } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.refused) {
        setRefused(result.reason ?? "Refused.");
        setDeep([]);
        setOverview("");
        return;
      }
      setOverview(result.overview);
      setDeep(result.findings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The draft pass failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Source desk</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Read code before you touch a host.</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          The local read stays in the browser. Drafting a report sends the paste once, and only when you ask.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <Button key={sample.id} tone="meta" onClick={() => setCode(sample.code)}>
            {sample.label}
          </Button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">Source</span>
        <textarea
          value={code}
          onChange={(event) => setCode(event.target.value)}
          spellCheck={false}
          placeholder="Paste a handler, a component, or a config. Nothing leaves until you draft."
          className="min-h-72 w-full border border-line bg-ink px-3 py-3 font-mono text-sm leading-relaxed text-fg outline-none focus:border-copper"
        />
      </label>

      <label className="block max-w-xl">
        <span className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
          Note for the draft, optional
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          placeholder="What were you testing? No live URLs."
          className="h-11 w-full border border-line bg-bg px-3 font-mono text-sm text-fg outline-none focus:border-copper"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={read} disabled={code.trim().length < 8}>
          Read the source
        </Button>
        <Button tone="quiet" onClick={() => void draft()} disabled={busy || code.trim().length < 8}>
          {busy ? "Drafting…" : "Draft with Kestrel"}
        </Button>
      </div>
      <p className="max-w-xl font-mono text-xs text-faint">
        Eight drafts an hour for your address, on this running instance. A cold start clears the count.
        It is a soft guard, not a shared quota.
      </p>

      {error ? <p className="max-w-xl text-copper">{error}</p> : null}
      {refused ? <p className="max-w-xl text-copper">{refused}</p> : null}

      {hits ? (
        <section>
          <h2 className="font-serif text-2xl">Local read</h2>
          {hits.length === 0 ? (
            <div className="mt-3 max-w-xl">
              <p className="text-muted">
                No rule matched. That is not a clean bill of health. These {CHECKED_PATTERNS.length} patterns
                were checked, line by line and across a three-line window:
              </p>
              <ul className="mt-3 space-y-1">
                {CHECKED_PATTERNS.map((pattern) => (
                  <li key={pattern.id} className="font-mono text-xs text-faint">
                    {pattern.cwe} · {pattern.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {hits.map((hit) => {
                const key = findingKey(hit.ruleId, hit.snippet);
                const state = added[key];
                return (
                  <li key={key} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={hit.severity} />
                      <span className="font-mono text-xs text-faint">
                        L{hit.line} · {hit.cwe}
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-xl">{hit.title}</h3>
                    <p className="mt-1 text-muted">{hit.summary}</p>
                    <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words bg-paper p-3 font-mono text-xs text-ink">
                      {hit.snippet}
                    </pre>
                    <p className="mt-2 text-sm text-muted">{hit.remediation}</p>
                    <p className="mt-1 font-mono text-xs text-faint">
                      Illustrative {band(hit.bountyLow, hit.bountyHigh)}
                    </p>
                    <Button tone="meta" className="mt-3" onClick={() => fileHit(hit)}>
                      {state === "added" ? "In the case file" : state === "already" ? "Already in the case file" : "Add to case file"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {overview || deep.length > 0 ? (
        <section>
          <h2 className="font-serif text-2xl">Draft</h2>
          {overview ? <p className="mt-3 max-w-2xl leading-relaxed">{overview}</p> : null}
          <ul className="mt-4 space-y-4">
            {deep.map((finding) => {
              const key = findingKey("grok", `${finding.title}\n${finding.evidence}`);
              const state = added[key];
              return (
                <li key={key} className="border border-line bg-surface p-4">
                  <SeverityChip severity={finding.severity} />
                  <h3 className="mt-2 font-serif text-xl">{finding.title}</h3>
                  <p className="mt-2 leading-relaxed">{finding.summary}</p>
                  {finding.evidence ? (
                    <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words bg-paper p-3 font-mono text-xs text-ink">
                      {finding.evidence}
                    </pre>
                  ) : null}
                  {finding.remediation ? <p className="mt-2 text-muted">{finding.remediation}</p> : null}
                  <Button tone="meta" className="mt-3" onClick={() => fileDeep(finding)}>
                    {state === "added" ? "In the case file" : state === "already" ? "Already in the case file" : "Add to case file"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
