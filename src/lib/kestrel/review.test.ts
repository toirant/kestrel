import assert from "node:assert/strict";
import test from "node:test";
import { PAYOUTS } from "./payouts.ts";
import { CHECKED_PATTERNS, findingKey, isComment, reviewSource } from "./review.ts";

test("a query split across lines is still a hit", () => {
  const code = `const q =
  "SELECT * FROM accounts WHERE id = '" +
  req.params.id;`;
  const hits = reviewSource(code);
  assert.ok(hits.some((hit) => hit.ruleId === "sqli"));
});

test("a log line that mentions DELETE and req is not SQL injection", () => {
  const hits = reviewSource(`console.log("DELETE user", req.user.id);`);
  assert.equal(
    hits.some((hit) => hit.ruleId === "sqli"),
    false,
  );
});

test("a Go pointer line is not treated as a block comment", () => {
  const line = `*out, _ = exec.Command("sh", "-c", "ping " + r.URL.Query().Get("host")).Output()`;
  assert.equal(isComment(line), false);
  assert.ok(reviewSource(line).some((hit) => hit.ruleId === "cmd"));
});

test("hash comments are skipped and preprocessor lines are not", () => {
  assert.equal(isComment("# a note with sk_live_labonly1"), true);
  assert.equal(isComment('#define TOKEN "sk_live_labonly1"'), false);
  const hits = reviewSource('#define TOKEN "sk_live_labonly1"');
  assert.ok(hits.some((hit) => hit.ruleId === "secret"));
  assert.equal(reviewSource("# sk_live_labonly1").length, 0);
});

test("a clean read names every pattern that was checked", () => {
  assert.equal(reviewSource("const ok = 1;").length, 0);
  assert.ok(CHECKED_PATTERNS.length >= 10);
  assert.ok(CHECKED_PATTERNS.every((pattern) => pattern.title && pattern.cwe));
});

test("bounty bands come from the shared table", () => {
  const [hit] = reviewSource(`const stripe = "sk_live_labonly1";`);
  assert.equal(hit.severity, "high");
  assert.deepEqual([hit.bountyLow, hit.bountyHigh], PAYOUTS.high);
});

test("finding keys follow the snippet, not the line number", () => {
  const left = findingKey("sqli", "SELECT id");
  const right = findingKey("sqli", "SELECT name");
  assert.notEqual(left, right);
  assert.equal(left, findingKey("sqli", "SELECT id"));
});
