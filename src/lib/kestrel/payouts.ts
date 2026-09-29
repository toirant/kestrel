import type { Severity } from "./types";

/** One band for the labs, the local rules, and the model drafts. */
export const PAYOUTS: Record<Severity, [number, number]> = {
  critical: [6000, 15000],
  high: [2000, 6000],
  medium: [400, 1500],
  low: [100, 400],
};
