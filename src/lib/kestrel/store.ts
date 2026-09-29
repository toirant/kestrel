import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getProbes, PROGRAMS } from "./programs.ts";
import type { Finding, FindingDraft, FindingStatus, HuntSnapshot, LogKind } from "./types";

type DeskState = {
  findings: Finding[];
  draftCode: string;
  hunt: HuntSnapshot;
  setDraftCode: (code: string) => void;
  dispatch: (programIds: string[]) => void;
  stop: () => void;
  addDraft: (programId: string, programName: string, probeId: string, draft: FindingDraft) => boolean;
  setStatus: (id: string, status: FindingStatus) => void;
  drop: (id: string) => void;
};

let logSeq = 1;
let runToken = 0;
let controller: AbortController | null = null;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

const emptyHunt: HuntSnapshot = {
  running: false,
  programId: null,
  phase: "idle",
  lines: [],
};

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      findings: [],
      draftCode: "",
      hunt: emptyHunt,
      setDraftCode: (code) => set({ draftCode: code.slice(0, 8000) }),
      setStatus: (id, status) =>
        set((state) => ({
          findings: state.findings.map((finding) =>
            finding.id === id ? { ...finding, status } : finding,
          ),
        })),
      drop: (id) =>
        set((state) => ({ findings: state.findings.filter((finding) => finding.id !== id) })),
      addDraft: (programId, programName, probeId, draft) => {
        const id = `${programId}:${probeId}`;
        if (get().findings.some((finding) => finding.id === id)) return false;
        const finding: Finding = {
          ...draft,
          id,
          programId,
          programName,
          probeId,
          status: "draft",
          foundAt: Date.now(),
        };
        set((state) => ({ findings: [finding, ...state.findings] }));
        return true;
      },
      stop: () => {
        runToken += 1;
        controller?.abort();
        set((state) => ({ hunt: { ...state.hunt, running: false, phase: "idle" } }));
      },
      dispatch: (programIds) => {
        const token = ++runToken;
        controller?.abort();
        const next = new AbortController();
        controller = next;
        const { signal } = next;
        const reduce =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const pace = reduce ? 30 : 160;
        const started = Date.now();

        const push = (kind: LogKind, text: string) => {
          if (token !== runToken) return;
          set((state) => ({
            hunt: {
              ...state.hunt,
              lines: [
                ...state.hunt.lines,
                { id: logSeq++, at: Date.now() - started, kind, text },
              ],
            },
          }));
        };

        set({
          hunt: { running: true, programId: programIds[0] ?? null, phase: "scope", lines: [] },
        });

        void (async () => {
          try {
            push("note", "Kestrel stays inside the lab. No packets leave this desk.");
            await sleep(pace, signal);
            for (const id of programIds) {
              if (token !== runToken) return;
              const program = PROGRAMS.find((item) => item.id === id);
              if (!program) continue;
              set((state) => ({
                hunt: { ...state.hunt, programId: program.id, phase: "scope" },
              }));
              push(
                "scope",
                `${program.name}. In: ${program.inScope[0]}. Out: ${program.outOfScope[0]}.`,
              );
              await sleep(pace, signal);
              set((state) => ({ hunt: { ...state.hunt, phase: "map" } }));
              for (const endpoint of program.endpoints) {
                push("map", `${endpoint.method} ${endpoint.path}`);
                await sleep(Math.round(pace * 0.55), signal);
              }
              set((state) => ({ hunt: { ...state.hunt, phase: "probe" } }));
              for (const probe of getProbes(program.id)) {
                push("hypo", probe.hypothesis);
                await sleep(pace, signal);
                const result = probe.run();
                push(result.hit ? "hit" : "miss", result.log);
                if (result.hit && result.finding) {
                  const added = get().addDraft(program.id, program.name, probe.id, result.finding);
                  push(
                    "note",
                    added ? "Wrote it into the case file as a draft." : "Already in the case file.",
                  );
                }
                await sleep(pace, signal);
              }
              set((state) => ({ hunt: { ...state.hunt, phase: "report" } }));
              push("note", `${program.name} pass is done.`);
              await sleep(pace, signal);
            }
            if (token !== runToken) return;
            set((state) => ({ hunt: { ...state.hunt, running: false, phase: "done" } }));
          } catch (error) {
            if (isAbort(error)) return;
            if (token !== runToken) return;
            push("note", "The hunt stopped on an unexpected error.");
            set((state) => ({ hunt: { ...state.hunt, running: false, phase: "idle" } }));
          }
        })();
      },
    }),
    {
      name: "kestrel-desk",
      skipHydration: true,
      partialize: (state) => ({ findings: state.findings, draftCode: state.draftCode }),
    },
  ),
);
