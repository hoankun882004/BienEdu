import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeContent, getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgeSections } from "../assets/js/data/knowledge-slides.js";

const calculusFormulaCounts = {
  "12.1": 12, "12.2": 3, "12.3": 4, "12.4": 6, "12.5": 5, "12.6": 3, "12.7": 3, "12.8": 4, "12.9": 4,
  "13.1": 6, "13.2": 5, "13.3": 3, "13.4": 2, "13.5": 2, "13.6": 3, "13.7": 2, "13.8": 4,
  "14.1": 3, "14.2": 2, "14.3": 3, "14.4": 3, "14.5": 3, "14.6": 3, "14.7": 4, "14.8": 4, "14.9": 4
};

const criticalSourceCoverage = {
  "12.1": ["arcsin", "arctan", String.raw`\frac{1}{\cos^2 x}`, String.raw`\frac{1}{\sin^2 x}`, String.raw`\int f'(x)e^{f(x)}`],
  "12.2": ["u′(x)[u(x)]ⁿ"],
  "12.3": ["A₁/(x−a)", "M/(x−α)"],
  "12.4": ["∫cotx", "sin²x", "sin(ax+b)"],
  "12.5": ["∫lnx", "ln|lnx|", "qᵃˣ⁺ᵇ"],
  "12.6": ["du=g′(x)dx", "u′/u"],
  "12.7": ["∫u dv", "Lặp từng phần"],
  "12.8": ["f(a)−f(b)", "f′(x₀)=0"],
  "12.9": ["a−G(x₀)", "Mỗi khoảng xác định"],
  "13.1": ["Newton–Leibniz", "arctanx"],
  "13.2": ["f≤g", "k(b−a)"],
  "13.3": ["Đổi biểu thức, vi phân và cận", "trở về x"],
  "13.4": ["[uv]ₐᵇ"],
  "13.5": [String.raw`\sum`, String.raw`\int`],
  "13.6": ["S₊+S₋", "bán nguyệt"],
  "13.7": ["F[b(m)]−F[a(m)]"],
  "13.8": ["f(a+b−x)", "k(b−a)/2"],
  "14.1": ["∫ₐᵇ|f(x)|dx", "f(x)≤0"],
  "14.2": ["|f(x)−g(x)|"],
  "14.3": ["2π∫", "R(x)²−r(x)²"],
  "14.4": ["π(R−r)²", "V_ngoài−V_khoét"],
  "14.5": ["∫ₐᵇ|v(t)|dt"],
  "14.6": ["F(b)=F(a)+", "°C/giờ"],
  "14.7": ["3,6×10⁶", "1 W=1 J/s"],
  "14.8": ["q_vào(t)−q_ra(t)", "q(t)=V′(t)"],
  "14.9": [String.raw`\sum`, String.raw`\int`, String.raw`|v_k(t)|`]
};

test("all CD12-CD14 and CD20-CD21 lessons expose structured reading content", () => {
  assert.deepEqual(Object.keys(knowledgeContent), Object.keys(knowledgeSections));
  assert.equal(Object.keys(knowledgeContent).length, 51);
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
  assert.equal(getKnowledgeContent("12.1").formulae[0].value, String.raw`F'(x)=f(x),\quad x\in I`);
  assert.equal(getKnowledgeContent("14.9").note.tone, "warning");
  assert.equal(getKnowledgeContent("not-mapped"), null);
});

test("all 26 calculus readings cover the source theory and three-step method", () => {
  assert.deepEqual(Object.keys(calculusFormulaCounts), Object.keys(criticalSourceCoverage));
  for (const [code, expectedCount] of Object.entries(calculusFormulaCounts)) {
    const reading = getKnowledgeContent(code);
    assert.equal(reading.formulae.length, expectedCount, `${code} complete formula count`);
    assert.ok(reading.points.length >= 3, `${code} complete method`);
    const sourceText = [...reading.formulae.flatMap((item) => [item.label, item.value, item.detail]), ...reading.points.flatMap((item) => [item.label, item.text])].join(" ");
    for (const needle of criticalSourceCoverage[code]) assert.ok(sourceText.includes(needle), `${code} includes ${needle}`);
  }
});

test("12.1 splits its complete formula table into two readable pages", () => {
  const reading = getKnowledgeContent("12.1");
  assert.equal(reading.pages.length, 2);
  assert.equal(reading.pages.flatMap((page) => page.formulae).length, reading.formulae.length);
  assert.deepEqual(reading.pages.map((page) => page.sourcePages), [[3], [3, 4]]);
});

test("compound formula groups expose reviewed expression boundaries", () => {
  const reading = getKnowledgeContent("12.1");
  assert.deepEqual(reading.formulae[6].expressions, [
    String.raw`\int\frac{1}{\cos^2 x}\,dx=\tan x+C`,
    String.raw`\int\frac{1}{\sin^2 x}\,dx=-\cot x+C`,
    String.raw`\int\tan x\,dx=-\ln|\cos x|+C`,
    String.raw`\int\cot x\,dx=\ln|\sin x|+C`
  ]);
  assert.equal(reading.formulae[7].expressions.length, 3);
  assert.ok(reading.formulae.every((item) => !item.expressions || item.expressions.every((value) => typeof value === "string" && value.length > 0)));
});

test("CD12–CD14 runtime content preserves the source trigonometric notation", () => {
  const sourceText = Object.entries(knowledgeContent)
    .filter(([code]) => /^(?:12|13|14)\./.test(code))
    .flatMap(([, reading]) => reading.formulae.flatMap((item) => [item.value, ...(item.expressions ?? [])]))
    .join(" ");
  assert.doesNotMatch(sourceText, /\b(?:sec|csc)\b/i);
  assert.match(sourceText, /\\frac\{1\}\{\\cos\^2 x\}/);
  assert.match(sourceText, /\\frac\{1\}\{\\sin\^2 x\}/);
});
