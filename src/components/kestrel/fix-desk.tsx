import { useState } from "react";
import { challengesFor, checkFix } from "@/lib/kestrel/fixes";
import { Button, TextArea } from "./ui";

export function FixDesk({ programId }: { programId: string }) {
  const challenges = challengesFor(programId);
  const [open, setOpen] = useState(challenges[0]?.id ?? "");
  const [sources, setSources] = useState<Record<string, string>>(() =>
    Object.fromEntries(challenges.map((item) => [item.id, item.starter])),
  );
  const [logs, setLogs] = useState<Record<string, { pass: boolean; log: string }>>({});

  if (challenges.length === 0) return null;

  return (
    <div className="space-y-4">
      <p className="text-muted">
        The hunt still runs the shipped lab. Here you edit a copy and re-run that one probe. Nothing
        you type is sent off this desk.
      </p>
      <div className="flex flex-wrap gap-2">
        {challenges.map((item) => (
          <Button key={item.id} tone={open === item.id ? "primary" : "meta"} onClick={() => setOpen(item.id)}>
            {item.title}
          </Button>
        ))}
      </div>
      {challenges
        .filter((item) => item.id === open)
        .map((item) => {
          const result = logs[item.id];
          return (
            <div key={item.id}>
              <p className="text-muted">{item.hint}</p>
              <div className="mt-3">
                <TextArea
                  label="Your copy"
                  value={sources[item.id] ?? item.starter}
                  rows={12}
                  spellCheck={false}
                  onChange={(event) =>
                    setSources((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    setLogs((current) => ({
                      ...current,
                      [item.id]: checkFix(programId, item.id, sources[item.id] ?? item.starter),
                    }))
                  }
                >
                  Re-run this probe
                </Button>
                <Button
                  tone="quiet"
                  onClick={() => {
                    setSources((current) => ({ ...current, [item.id]: item.starter }));
                    setLogs((current) => {
                      const next = { ...current };
                      delete next[item.id];
                      return next;
                    });
                  }}
                >
                  Reset to the bug
                </Button>
              </div>
              {result ? (
                <p className={result.pass ? "mt-3 text-fg" : "mt-3 text-copper"}>{result.log}</p>
              ) : null}
            </div>
          );
        })}
    </div>
  );
}
