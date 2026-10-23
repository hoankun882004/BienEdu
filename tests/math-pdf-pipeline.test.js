import test from "node:test";
import assert from "node:assert/strict";

import { normalizeExtraction, validateRecord } from "../scripts/math-pdf/normalize.mjs";
import { renderMarkdownMath } from "../assets/js/components/markdown-math-renderer.js";

function fixture() {
  return {
    subtopic: {
      topic: { id: "CD20", title: "Tổ hợp" },
      exercise: { id: "CD20-02", code: "20.2", title: "Quy tắc nhân" },
      document: { documentId: "doc", sourceFileName: "source.pdf", sourceSha256: "A".repeat(64), pageCount: 10 },
      mapping: {
        subtopicId: "20.2",
        startPage: 5,
        endPage: 5,
        regions: [{ id: "20.2-pdf-1", page: 5, x: 0, y: .4, width: 1, height: .6 }]
      }
    },
    extraction: {
      provider: "marker",
      raw: {
        block_type: "Document",
        children: [{
          block_type: "Page",
          page_id: 4,
          polygon: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]],
          children: [
            { id: "outside", block_type: "Text", polygon: [[20, 20], [900, 20], [900, 100], [20, 100]], text: "20.1 Quy tắc cộng" },
            { id: "heading", block_type: "SectionHeader", polygon: [[20, 450], [900, 450], [900, 500], [20, 500]], text: "20.2 Quy tắc nhân" },
            { id: "formula", block_type: "Equation", polygon: [[20, 520], [900, 520], [900, 620], [20, 620]], text: "N = n_1 \\cdot n_2" },
            { id: "example", block_type: "SectionHeader", polygon: [[20, 650], [900, 650], [900, 700], [20, 700]], text: "VÍ DỤ NHANH" },
            { id: "body", block_type: "Text", polygon: [[20, 720], [900, 720], [900, 800], [20, 800]], text: "Có $3 \\cdot 4 = 12$ cách." }
          ]
        }]
      }
    }
  };
}

test("normalizer keeps source geometry, pages and actual heading boundaries", () => {
  const record = normalizeExtraction(fixture());
  assert.equal(record.blocks.length, 4);
  assert.equal(record.blocks.some((block) => block.providerBlockId === "outside"), false);
  assert.deepEqual(record.sections.knowledge.length, 2);
  assert.deepEqual(record.sections.workedExamples.length, 2);
  assert.equal(record.blocks[0].page, 5);
  assert.match(record.markdown, /source-block:/);
  assert.equal(validateRecord(record).valid, true);
});

test("normalizer flags malformed LaTeX without repairing or inventing it", () => {
  const input = fixture();
  input.extraction.raw.children[0].children[1].text = "$\\frac{1}{2$";
  const record = normalizeExtraction(input);
  assert.ok(record.flags.some((flag) => flag.code === "uncertain-formula"));
  assert.equal(validateRecord(record).valid, false);
});

test("Markdown renderer escapes HTML and renders KaTeX", () => {
  const html = renderMarkdownMath("# Mục\n\n<script>alert(1)</script> và $x^2$.");
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /class=\"katex\"/);
});

