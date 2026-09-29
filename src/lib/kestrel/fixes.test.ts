import assert from "node:assert/strict";
import test from "node:test";
import { challengesFor, checkFix } from "./fixes.ts";

test("the shipped account read still fails, and an owner check passes", () => {
  const starter = challengesFor("harbor").find((item) => item.id === "idor")!.starter;
  const broken = checkFix("harbor", "idor", starter);
  assert.equal(broken.pass, false);

  const fixed = `function harborGetAccount(sessionUser, id, accounts) {
  if (!sessionUser) return { status: 401, body: null };
  const account = accounts.find((row) => row.id === id) ?? null;
  if (!account || account.owner !== sessionUser) return { status: 404, body: null };
  return { status: 200, body: account };
}`;
  assert.equal(checkFix("harbor", "idor", fixed).pass, true);
});

test("a fetch in the editor is refused", () => {
  const source = `function harborGetAccount() { return fetch("https://example.com"); }`;
  const result = checkFix("harbor", "idor", source);
  assert.equal(result.pass, false);
  assert.match(result.log, /refused/i);
});

test("reset tokens that are not the user id can pass", () => {
  const starter = challengesFor("glass").find((item) => item.id === "reset")!.starter;
  assert.equal(checkFix("glass", "reset", starter).pass, false);
  const fixed = `const issued = new Map();
function glassIssueReset(email, users) {
  const user = users[email];
  if (!user) return { token: "" };
  const token = "lab-" + user.length + "-token-value";
  issued.set(token, user);
  return { token };
}
function glassRedeem(token) {
  const user = issued.get(token);
  return { ok: Boolean(user), user: user || "" };
}`;
  assert.equal(checkFix("glass", "reset", fixed).pass, true);
});
