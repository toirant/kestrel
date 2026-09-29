export type Severity = "critical" | "high" | "medium" | "low";

export type FindingStatus = "draft" | "ready" | "filed";

export type FindingDraft = {
  title: string;
  severity: Severity;
  cvss: string;
  cwe: string;
  asset: string;
  summary: string;
  steps: string[];
  impact: string;
  remediation: string;
  bountyLow: number;
  bountyHigh: number;
  request: string;
  response: string;
};

export type Finding = FindingDraft & {
  id: string;
  programId: string;
  programName: string;
  probeId: string;
  status: FindingStatus;
  foundAt: number;
};

export type LogKind = "scope" | "map" | "hypo" | "miss" | "hit" | "note";

export type LogLine = {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
};

export type HuntPhase = "idle" | "scope" | "map" | "probe" | "report" | "done";

export type HuntSnapshot = {
  running: boolean;
  programId: string | null;
  phase: HuntPhase;
  lines: LogLine[];
};

export type ProbeResult = {
  hit: boolean;
  log: string;
  finding?: FindingDraft;
};

export type Probe = {
  id: string;
  name: string;
  hypothesis: string;
  run: () => ProbeResult;
};

export type Program = {
  id: string;
  index: string;
  name: string;
  host: string;
  blurb: string;
  surface: string;
  inScope: string[];
  outOfScope: string[];
  endpoints: { method: string; path: string }[];
  payouts: Record<Severity, [number, number]>;
};
