import { useState } from "react";
import { band } from "@/lib/kestrel/format";
import { useDesk } from "@/lib/kestrel/store";
import type { Finding, FindingStatus } from "@/lib/kestrel/types";
import { ReportDialog } from "./report-dialog";
import { Button, Eyebrow, SeverityChip } from "./ui";

const COLUMNS: { status: FindingStatus; label: string; hint: string }[] = [
  { status: "draft", label: "Draft", hint: "Confirmed, not yet checked by you." },
  { status: "ready", label: "Ready", hint: "You would file this." },
  { status: "filed", label: "Filed", hint: "Kept for the record." },
];

export function BoardPage() {
  const findings = useDesk((state) => state.findings);
  const setStatus = useDesk((state) => state.setStatus);
  const drop = useDesk((state) => state.drop);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = findings.find((finding) => finding.id === openId) ?? null;

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Case file</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">What Kestrel confirmed.</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          Drafts land here as the hunt runs. Open one, copy the report, and move it when you mean it.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const rows = findings.filter((finding) => finding.status === column.status);
          return (
            <section key={column.status} className="min-w-0">
              <h2 className="font-serif text-2xl">{column.label}</h2>
              <p className="mt-1 text-sm text-muted">{column.hint}</p>
              {rows.length === 0 ? (
                <p className="mt-4 border border-dashed border-line px-3 py-6 text-muted">None.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {rows.map((finding) => (
                    <li key={finding.id} className="border border-line bg-surface p-3">
                      <Card finding={finding} onOpen={() => setOpenId(finding.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <ReportDialog finding={open} onClose={() => setOpenId(null)} onStatus={setStatus} onDrop={drop} />
    </div>
  );
}

function Card({ finding, onOpen }: { finding: Finding; onOpen: () => void }) {
  return (
    <div>
      <SeverityChip severity={finding.severity} />
      <h3 className="mt-2 font-serif text-lg leading-snug">{finding.title}</h3>
      <p className="mt-1 text-sm text-muted">
        {finding.programName} · {band(finding.bountyLow, finding.bountyHigh)}
      </p>
      <Button tone="quiet" className="mt-3 w-full" onClick={onOpen}>
        Open report
      </Button>
    </div>
  );
}
