import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { getKnowledgeSection, knowledgeSections } from "../assets/js/data/knowledge-slides.js";

test("CD20 and CD21 expose exact bounded knowledge sections", () => {
  assert.equal(Object.keys(knowledgeSections).length, 25);
  assert.equal(getKnowledgeSection("20.1").endsBefore, "20.2");
  assert.equal(getKnowledgeSection("20.17").endsBefore, "CD21");
  assert.equal(getKnowledgeSection("21.1").endsBefore, "21.2");
  assert.equal(getKnowledgeSection("21.8").endsBefore, "END_CD21");
});

test("theory and source examples are separate for every mapped subtopic", () => {
  for (const [code, section] of Object.entries(knowledgeSections)) {
    assert.ok(section.knowledgeSlides.length >= 1, `${code} knowledge`);
    assert.ok(section.knowledgeSlides.length <= 2, `${code} knowledge fits within two pages`);
    assert.ok(section.exampleSlides.length >= 1, `${code} source example`);
    assert.ok(section.knowledgeSlides.every((slide) => slide.src.includes("-k")));
    assert.ok(section.exampleSlides.every((slide) => slide.src.includes("-e")));
  }
});

test("20.1 theory excludes example blocks and examples stop before 20.2", () => {
  const section = getKnowledgeSection("20.1");
  const page4TheoryBottoms = section.knowledgeSlides.flatMap((slide) => slide.crops).filter((crop) => crop.page === 4).map((crop) => crop.y + crop.height);
  const firstExampleTop = section.exampleSlides[0].crops[0].y;
  assert.ok(page4TheoryBottoms.every((bottom) => bottom <= firstExampleTop + 0.6));
  assert.ok(section.exampleSlides.every((slide) => slide.sourcePages.every((page) => page <= 5)));
  assert.equal(section.endsBefore, "20.2");
});

test("all 55 compact derived slides exist and retain crop provenance", () => {
  const slides = Object.values(knowledgeSections).flatMap((section) => [...section.knowledgeSlides, ...section.exampleSlides]);
  assert.equal(slides.length, 55);
  for (const slide of slides) {
    assert.equal(existsSync(resolve(slide.src)), true, slide.src);
    assert.ok(slide.sourcePages.length >= 1);
    assert.ok(slide.crops.every((crop) => crop.width > 0 && crop.height > 0));
  }
});

test("edge-topic mapping boundaries remain isolated", () => {
  for (const code of ["20.2", "20.17", "21.1", "21.8"]) {
    const section = getKnowledgeSection(code);
    assert.ok(section.knowledgeSlides.length);
    assert.ok(section.exampleSlides.length);
  }
  assert.equal(getKnowledgeSection("20.17").endsBefore, "CD21");
  assert.ok(getKnowledgeSection("20.17").knowledgeSlides.flatMap((slide) => slide.sourcePages).every((page) => page === 14));
  assert.equal(getKnowledgeSection("21.8").endsBefore, "END_CD21");
});
