import { useState } from "react";
import { band } from "@/lib/kestrel/format";
import { useDesk } from "@/lib/kestrel/store";
import { ReportDialog } from "./report-dialog";
import { Button, SeverityChip } from "./ui";

export function FindingList({ programId }: { programId?: string }) {
  const findings = useDesk((state) => state.findings);
  const setStatus = useDesk((state) => state.setStatus);
  const drop = useDesk((state) => state.drop);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = programId ? findings.filter((finding) => finding.programId === programId) : findings;
  const open = rows.find((finding) => finding.id === openId) ?? null;

  if (rows.length === 0) {
    return (
      <p className="text-muted">
        Nothing confirmed yet. Hunt a lab, or read some source and add what you trust.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((finding) => (
          <li key={finding.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityChip severity={finding.severity} />
                <span className="font-mono text-xs uppercase tracking-widest text-faint">{finding.status}</span>
              </div>
              <h3 className="mt-2 font-serif text-xl leading-snug">{finding.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {finding.programName} · illustrative {band(finding.bountyLow, finding.bountyHigh)}
              </p>
            </div>
            <Button tone="quiet" className="shrink-0" onClick={() => setOpenId(finding.id)}>
              Open report
            </Button>
          </li>
        ))}
      </ul>
      <ReportDialog
        finding={open}
        onClose={() => setOpenId(null)}
        onStatus={setStatus}
        onDrop={drop}
      />
    </>
  );
}
