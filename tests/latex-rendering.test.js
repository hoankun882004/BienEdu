import test from "node:test";
import assert from "node:assert/strict";

import {
  mathTextToLatex,
  renderMarkdownMath,
  renderMathText,
  validateLatexExpression
} from "../assets/js/components/markdown-math-renderer.js";
import { approvedMathContent } from "../assets/js/data/approved-math-content.js";
import { calculusSourcePractice } from "../assets/js/data/calculus-source-practice.js";
import { exampleContent } from "../assets/js/data/example-content.js";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";
import { generatePracticeSet, supportedPracticeTopics } from "../assets/js/domain/exercise-generators.js";

function formulaSlots() {
  const rows = [];
  for (const [code, reading] of Object.entries(knowledgeContent)) {
    for (const [index, formula] of (reading.formulae ?? []).entries()) {
      const expressions = formula.expressions?.length ? formula.expressions : [formula.value];
      expressions.forEach((value, expressionIndex) => rows.push({
        id: `${code}:knowledge:${index + 1}:expression:${expressionIndex + 1}`,
        value
      }));
    }
  }
  for (const [code, examples] of Object.entries(exampleContent)) {
    for (const [exampleIndex, example] of examples.entries()) {
      for (const [stepIndex, step] of (example.steps ?? []).entries()) {
        if (step.expression) rows.push({ id: `${code}:example:${exampleIndex + 1}:step:${stepIndex + 1}`, value: step.expression });
      }
    }
  }
  return rows;
}

function surroundingContent() {
  const rows = [];
  for (const code of supportedPracticeTopics) {
    for (const [index, question] of generatePracticeSet(code, "LATEX_QA_V13_1").entries()) {
      rows.push({ id: `${code}:generated:${index + 1}:prompt`, value: question.prompt });
      rows.push({ id: `${code}:generated:${index + 1}:solution`, value: question.solution });
      question.options.forEach((value, optionIndex) => rows.push({ id: `${code}:generated:${index + 1}:option:${optionIndex + 1}`, value }));
    }
  }
  for (const [code, exercises] of Object.entries(calculusSourcePractice)) {
    exercises.forEach((exercise, index) => {
      rows.push({ id: `${code}:source:${index + 1}:prompt`, value: exercise.prompt });
      rows.push({ id: `${code}:source:${index + 1}:answer`, value: exercise.answerKey });
    });
  }
  return rows;
}

test("all imported Knowledge and Example formula slots render without KaTeX errors", () => {
  const rows = formulaSlots();
  assert.equal(rows.length, 547, "the complete source formula inventory changed unexpectedly");

  for (const row of rows) {
    const html = renderMathText(row.value, { display: true });
    assert.doesNotMatch(html, /katex-error|math-render-error/, `${row.id}: ${row.value}`);
    assert.doesNotMatch(mathTextToLatex(row.value), /\\(?:intP|suma|intu)\b/, `${row.id}: control words must have boundaries`);
    if (html.includes('class="math-expression')) {
      const latex = mathTextToLatex(row.value);
      assert.doesNotMatch(latex, /\//, `${row.id}: imported fractions must use \\frac{...}{...}`);
      const validation = validateLatexExpression(latex);
      assert.equal(validation.valid, true, `${row.id}: ${validation.error ?? row.value}`);
    }
  }
});

test("all approved raw LaTeX expressions pass strict KaTeX parsing", () => {
  const formulas = Object.values(approvedMathContent)
    .flatMap((record) => record.blocks)
    .flatMap((block) => block.latex ?? []);
  assert.equal(formulas.length, 93);
  formulas.forEach((formula) => assert.deepEqual(validateLatexExpression(formula), { valid: true, error: null }, formula));
});

test("all generated and PDF-source practice fields are safe to render", () => {
  const rows = surroundingContent();
  assert.equal(rows.length, 1438, "practice rendering inventory changed unexpectedly");
  for (const row of rows) {
    const html = renderMathText(row.value);
    assert.doesNotMatch(html, /katex-error|math-render-error/, `${row.id}: ${row.value}`);
    assert.doesNotMatch(html, /\\(?:intP|suma|intu)\b/, `${row.id}: malformed command leaked to the learner`);
  }
});

test("Unicode conversion creates safe control-word boundaries and proper simple fractions", () => {
  assert.match(mathTextToLatex("∫P(x)dx"), /^\\int \\mathrm\{P\}/);
  assert.match(mathTextToLatex("∑aᵢ"), /^\\sum a_\{i\}$/);
  assert.match(mathTextToLatex("∫u du"), /^\\int u du$/);
  assert.match(mathTextToLatex("x²/2"), /\\frac\{x\^\{2\}\}\{2\}/);
  assert.match(mathTextToLatex("1/√(1−x²)"), /1\/\\sqrt\{1-x\^\{2\}\}/);
});

test("unsupported LaTeX is flagged and never becomes red KaTeX error text", () => {
  const validation = validateLatexExpression(String.raw`\notARealKatexCommand{x}`);
  assert.equal(validation.valid, false);
  assert.match(validation.error, /Undefined control sequence|notARealKatexCommand/);

  const html = renderMarkdownMath(String.raw`$$\notARealKatexCommand{x}$$`);
  assert.match(html, /class="math-render-error"/);
  assert.match(html, /data-math-error=/);
  assert.doesNotMatch(html, /class="katex-error"/);
});

test("source-verified boundary conditions and indices remain explicit", () => {
  assert.equal(
    knowledgeContent["13.3"].formulae[0].value,
    String.raw`\int_a^b f(g(x))g'(x)\,dx=\int_{g(a)}^{g(b)}f(u)\,du`
  );
  assert.equal(
    knowledgeContent["14.9"].formulae[1].value,
    String.raw`\Delta F=\sum_{k=1}^{n}\int_{t_{k-1}}^{t_k}r_k(t)\,dt`
  );
});
