import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { renderKnowledgeMarkdown, renderMathText } from "../assets/js/components/markdown-math-renderer.js";
import { approvedMathContent } from "../assets/js/data/approved-math-content.js";
import { curriculumGroups } from "../assets/js/data/curriculum.js";
import { getExampleContent } from "../assets/js/data/example-content.js";
import { getKnowledgeContent } from "../assets/js/data/knowledge-content.js";
import { knowledgePdfMappings } from "../assets/js/data/knowledge-pdf-mappings.js";
import { createLessonSlides } from "../assets/js/domain/lesson-workspace.js";

const projectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("student runtime has no PDF viewer, embed, canvas, or PDF.js dependency", () => {
  const runtime = [
    projectFile("assets/js/curriculum.js"),
    projectFile("assets/js/domain/lesson-workspace.js"),
    projectFile("assets/styles.css")
  ].join("\n");
  const packageJson = JSON.parse(projectFile("package.json"));

  assert.doesNotMatch(runtime, /pdf-reader|data-pdf-viewer|pdf-knowledge-viewer|show-source-pdf|<iframe|<embed|<object/i);
  assert.equal(packageJson.dependencies?.["pdfjs-dist"], undefined);
});

test("all 51 verified source mappings publish native Markdown knowledge slides", () => {
  const exercises = curriculumGroups.flatMap((group) => group.topics).flatMap((topic) =>
    topic.exerciseTypes.map((exercise) => ({ topic, exercise }))
  );

  for (const code of Object.keys(knowledgePdfMappings)) {
    const match = exercises.find(({ exercise }) => exercise.code === code);
    assert.ok(match, `${code} must remain in the curriculum`);
    const reading = getKnowledgeContent(code);
    assert.ok(reading, `${code} must have verified native reading content`);
    const slides = createLessonSlides({
      ...match,
      approvedMathContent: approvedMathContent[code] ?? null,
      reading,
      examples: getExampleContent(code)
    });
    const knowledge = slides.filter((slide) => slide.section === "knowledge");
    assert.ok(knowledge.length > 0, `${code} must publish at least one Knowledge section`);
    assert.ok(knowledge.every((slide) => slide.kind === "knowledge-markdown"));
    assert.ok(knowledge.every((slide) => !slide.pdfMapping && !slide.src));
  }
});

test("the shared renderer converts Unicode math to KaTeX without exposing raw commands", () => {
  const integral = renderMathText("∫ₐᵇf(x)dx = F(b)−F(a)", { display: true });
  const probability = renderMathText("P(A ∩ B) = P(A)P(B)", { display: true });

  assert.match(integral, /class="katex-display"/);
  assert.match(probability, /class="katex-display"/);
  assert.doesNotMatch(integral.replace(/<annotation[\s\S]*?<\/annotation>/g, ""), /\\int_\{/);
  assert.doesNotMatch(probability.replace(/<annotation[\s\S]*?<\/annotation>/g, ""), /\\cap/);
});

test("symmetric integral bounds with a negative subscript render without a KaTeX error", () => {
  const html = renderMathText("∫₋ₐᵃf(x)dx=0", { display: true });
  assert.match(html, /class="katex"/);
  assert.doesNotMatch(html, /katex-error|Double subscript/);
});

test("approved 20.2 Knowledge excludes source examples and PDF controls", () => {
  const record = approvedMathContent["20.2"];
  const html = renderKnowledgeMarkdown({
    slide: { approvedMathContent: record },
    position: { current: 1, total: 1 },
    exercise: { code: "20.2", title: "Quy tắc nhân" }
  });

  assert.match(html, /data-markdown-lesson/);
  assert.match(html, /Giai đoạn thứ nhất/);
  assert.doesNotMatch(html, /Quy trình nhắn tin|Xem PDF|Trang gốc|data-pdf/);
});

test("structured Knowledge uses content-aware layout and separate equation nodes", () => {
  const reading = getKnowledgeContent("12.1").pages[0];
  const html = renderKnowledgeMarkdown({
    slide: { reading },
    position: { current: 1, total: 2 },
    exercise: { code: "12.1", title: "Nguyên hàm cơ bản" }
  });

  assert.match(html, /data-knowledge-layout="formula-heavy"/);
  assert.equal((html.match(/class="math-lesson__formula-card(?:\s|"?)/g) ?? []).length, 8);
  assert.equal((html.match(/class="math-lesson__formula-section"/g) ?? []).length, 1);
  assert.equal((html.match(/class="math-lesson__equation"/g) ?? []).length, 18);
  assert.match(html, /data-expression-count="4"/);
  assert.doesNotMatch(html, /class="math-lesson__equation"[^>]*>[^<]*;[^<]*</);
});

test("reviewed long derivations render as KaTeX aligned blocks", () => {
  const html = renderKnowledgeMarkdown({
    slide: { reading: getKnowledgeContent("12.6") },
    position: { current: 1, total: 1 },
    exercise: { code: "12.6", title: "Phương pháp đổi biến số" }
  });

  assert.match(html, /data-multiline="true"/);
  assert.match(html, /math-lesson__formula-card--wide/);
  assert.match(html, /class="katex-display"/);
  assert.doesNotMatch(html, /math-render-error|katex-error/);
});
