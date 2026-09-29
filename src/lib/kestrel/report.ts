import { band } from "./format.ts";
import type { Finding } from "./types";

export function toMarkdown(finding: Finding) {
  const steps = finding.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  return [
    `# ${finding.title}`,
    "",
    `**Program:** ${finding.programName}`,
    `**Severity:** ${finding.severity} (CVSS ${finding.cvss})`,
    `**Weakness:** ${finding.cwe}`,
    `**Asset:** ${finding.asset}`,
    "",
    "## Summary",
    finding.summary,
    "",
    "## Steps to reproduce",
    steps,
    "",
    "## Evidence",
    "```",
    finding.request.trim(),
    "```",
    "```",
    finding.response.trim(),
    "```",
    "",
    "## Impact",
    finding.impact,
    "",
    "## Remediation",
    finding.remediation,
    "",
    "---",
    `Illustrative band: ${band(finding.bountyLow, finding.bountyHigh)}. Practice write-up from Kestrel. File only on a program that authorized you.`,
  ].join("\n");
}
