import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { band } from "@/lib/kestrel/format";
import { toMarkdown } from "@/lib/kestrel/report";
import type { Finding, FindingStatus } from "@/lib/kestrel/types";
import { Button, SeverityChip } from "./ui";

const nextStatus: Record<FindingStatus, { status: FindingStatus; label: string }> = {
  draft: { status: "ready", label: "Mark ready" },
  ready: { status: "filed", label: "Mark filed" },
  filed: { status: "draft", label: "Return to draft" },
};

export function ReportDialog({
  finding,
  onClose,
  onStatus,
  onDrop,
}: {
  finding: Finding | null;
  onClose: () => void;
  onStatus: (id: string, status: FindingStatus) => void;
  onDrop: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const markdown = finding ? toMarkdown(finding) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog.Root
      open={finding !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/80" />
        <Dialog.Content className="fixed inset-x-3 top-12 z-50 max-h-[85vh] overflow-y-auto border border-line bg-surface p-4 md:inset-x-auto md:left-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:p-6">
          {finding ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityChip severity={finding.severity} />
                <span className="font-mono text-xs uppercase tracking-widest text-faint">{finding.cwe}</span>
                <span className="font-mono text-xs text-muted">CVSS {finding.cvss}</span>
              </div>
              <Dialog.Title className="mt-3 font-serif text-3xl leading-tight">{finding.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-muted">
                {finding.programName} · {finding.asset}
              </Dialog.Description>
              <p className="mt-4 text-base leading-relaxed">{finding.summary}</p>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-copper">Steps</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {finding.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-copper">Evidence</h3>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words bg-paper p-3 font-mono text-xs leading-relaxed text-ink">
                {finding.request}
              </pre>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words bg-paper p-3 font-mono text-xs leading-relaxed text-ink">
                {finding.response}
              </pre>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-copper">Impact</h3>
              <p className="mt-2 leading-relaxed">{finding.impact}</p>
              <h3 className="mt-6 font-mono text-xs uppercase tracking-widest text-copper">Remediation</h3>
              <p className="mt-2 leading-relaxed">{finding.remediation}</p>
              <p className="mt-6 font-mono text-xs text-muted">
                Illustrative band {band(finding.bountyLow, finding.bountyHigh)}. Not a promise of payment.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy report"}</Button>
                <Button
                  tone="quiet"
                  onClick={() => onStatus(finding.id, nextStatus[finding.status].status)}
                >
                  {nextStatus[finding.status].label}
                </Button>
                <Button
                  tone="meta"
                  onClick={() => {
                    onDrop(finding.id);
                    onClose();
                  }}
                >
                  Drop
                </Button>
                <Dialog.Close asChild>
                  <Button tone="meta">Close</Button>
                </Dialog.Close>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
