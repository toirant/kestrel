import assert from "node:assert/strict";
import test from "node:test";
import { PROGRAMS, getProbes } from "./programs.ts";
import { reviewSource, SAMPLES } from "./review.ts";

test("every lab has a hit and a miss", () => {
  for (const program of PROGRAMS) {
    const probes = getProbes(program.id);
    assert.ok(probes.length >= 3, program.id);
    const results = probes.map((probe) => probe.run());
    assert.ok(
      results.some((result) => result.hit && result.finding),
      `${program.id} hit`,
    );
    assert.ok(
      results.some((result) => !result.hit && !result.finding),
      `${program.id} miss`,
    );
    for (const result of results) {
      if (result.hit) assert.ok(result.finding, result.log);
      else assert.equal(result.finding, undefined);
    }
  }
});

test("samples trip the local rules", () => {
  const express = reviewSource(SAMPLES[0].code).map((hit) => hit.ruleId);
  assert.ok(express.includes("secret"));
  assert.ok(express.includes("sqli"));
  assert.ok(express.includes("mass"));
  assert.ok(express.includes("redirect"));

  const react = reviewSource(SAMPLES[1].code).map((hit) => hit.ruleId);
  assert.deepEqual(react, ["xss"]);

  const python = reviewSource(SAMPLES[2].code).map((hit) => hit.ruleId);
  assert.ok(python.includes("deserialize"));
  assert.ok(python.includes("ssrf"));

  const go = reviewSource(SAMPLES[3].code).map((hit) => hit.ruleId);
  assert.ok(go.includes("path"));
  assert.ok(go.includes("cmd"));
});
