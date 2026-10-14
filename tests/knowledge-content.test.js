import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeContent, getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgeSections } from "../assets/js/data/knowledge-slides.js";

test("all CD20 and CD21 lessons expose structured reading content", () => {
  assert.deepEqual(Object.keys(knowledgeContent), Object.keys(knowledgeSections));
  assert.equal(Object.keys(knowledgeContent).length, 25);
  for (const [code, reading] of Object.entries(knowledgeContent)) {
    assert.ok(reading.lead.length >= 60, `${code} lead`);
    assert.ok(reading.formulae.length >= 1, `${code} formulae`);
    assert.ok(reading.points.length >= 1, `${code} points`);
    assert.ok(["tip", "warning"].includes(reading.note.tone), `${code} note tone`);
  }
});

test("reading content stays text-only and safe to render", () => {
  for (const [code, reading] of Object.entries(knowledgeContent)) {
    const values = [reading.lead, ...reading.formulae.flatMap((item) => [item.label, item.value, item.detail]), ...reading.points.flatMap((item) => [item.label, item.text]), reading.note.label, reading.note.text];
    assert.ok(values.every((value) => typeof value === "string" && !value.includes("<")), `${code} plain text`);
  }
  assert.equal(getKnowledgeContent("20.1").formulae[0].value, "N = n₁ + n₂ + … + nₖ");
  assert.equal(getKnowledgeContent("not-mapped"), null);
});
