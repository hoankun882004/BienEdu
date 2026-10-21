import test from "node:test";
import assert from "node:assert/strict";
import { exampleContent, getExampleContent } from "../assets/js/data/example-content.js";
import { knowledgeSections } from "../assets/js/data/knowledge-slides.js";

test("all mapped lessons expose complete worked examples", () => {
  assert.deepEqual(Object.keys(exampleContent), Object.keys(knowledgeSections));
  assert.equal(Object.values(exampleContent).flat().length, 94);
  for (const [code, examples] of Object.entries(exampleContent)) {
    assert.ok(examples.length >= 1, `${code} examples`);
    for (const example of examples) {
      assert.ok(example.prompt.length >= 12, `${code} prompt`);
      assert.ok(example.analysis.length >= 2, `${code} analysis`);
      assert.ok(example.steps.length >= 2, `${code} steps`);
      assert.ok(example.steps.every((step) => step.label && step.expression && step.text), `${code} step detail`);
      assert.ok(example.answer && example.takeaway, `${code} conclusion`);
      assert.ok(example.sourcePages.length >= 1, `${code} provenance`);
    }
  }
});

test("CD12-CD14 account for both worked examples in every source subtopic", () => {
  const sourceExamples = Object.entries(exampleContent)
    .filter(([code]) => /^(12|13|14)\./u.test(code))
    .flatMap(([, examples]) => examples.filter((example) => example.origin === "verified-source"));

  assert.equal(sourceExamples.length, 52);
  assert.equal(new Set(sourceExamples.map((example) => example.sourceBlockId)).size, 52);
  assert.ok(sourceExamples.every((example) => example.sourceBlockId && example.verification === "verified"));
});

test("worked examples preserve important multi-step source cases", () => {
  assert.equal(getExampleContent("20.1").length, 2);
  assert.equal(getExampleContent("20.2").length, 3);
  assert.equal(getExampleContent("20.8")[0].answer, "Có 84 cách chia kẹo.");
  assert.equal(getExampleContent("12.6")[0].answer, "I=sin(x²+1)+C.");
  assert.equal(getExampleContent("14.5")[0].answer, "Quãng đường bằng 5 đơn vị.");
  assert.equal(getExampleContent("not-mapped"), null);
});
