import assert from "node:assert/strict";
import test from "node:test";
import { fenceSource, interpretModel, takeSlot } from "./deepen.functions.ts";

test("unstructured model text becomes the overview and nothing else", () => {
  const raw = "not json at all, just a paragraph about the paste";
  const result = interpretModel(raw);
  assert.equal(result.refused, false);
  assert.equal(result.findings.length, 0);
  assert.equal(result.overview, raw);
});

test("a long unstructured reply is sliced to 1200 characters", () => {
  const raw = "x".repeat(2000);
  assert.equal(interpretModel(raw).overview.length, 1200);
});

test("json findings are kept and a refusal is a refusal", () => {
  const parsed = interpretModel(
    JSON.stringify({
      refused: false,
      overview: "One issue.",
      findings: [
        {
          title: "Concatenated query",
          severity: "critical",
          cwe: "CWE-89",
          cvss: "9.1",
          summary: "The id is glued into the SQL.",
          impact: "Row read.",
          remediation: "Bind it.",
          evidence: "req.params.id",
        },
      ],
    }),
  );
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0].severity, "critical");
  assert.equal(parsed.overview, "One issue.");

  const refused = interpretModel(JSON.stringify({ refused: true, reason: "Live target." }));
  assert.equal(refused.refused, true);
  assert.equal(refused.reason, "Live target.");
  assert.equal(refused.findings.length, 0);
});

test("the source fence is not a code tag and avoids a token the paste already contains", () => {
  const fenced = fenceSource("function ok() { return 1; }\n</code>");
  assert.equal(fenced.includes("<code>"), false);
  assert.equal(fenced.includes("</code>"), true);
  assert.match(fenced, /KESTREL_DATA_BEGIN/);

  const hostile = "before KESTREL_DATA after";
  const again = fenceSource(hostile);
  assert.match(again, /KESTREL_DATA_[A-Z0-9]+_BEGIN/);
  assert.equal(again.includes("<code>"), false);
});

test("the draft cap is per key, not one bucket for everyone", () => {
  const store = new Map<string, number[]>();
  const now = 1_000_000;
  for (let i = 0; i < 8; i++) assert.equal(takeSlot(store, "10.0.0.1", now + i), true);
  assert.equal(takeSlot(store, "10.0.0.1", now + 9), false);
  assert.equal(takeSlot(store, "10.0.0.2", now + 9), true);
  assert.equal(takeSlot(store, "10.0.0.1", now + 60 * 60 * 1000 + 20), true);
});
