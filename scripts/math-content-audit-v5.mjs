import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mathTextToLatex,
  renderKnowledgeMarkdown,
  renderMathText,
  validateLatexExpression
} from "../assets/js/components/markdown-math-renderer.js";
import { approvedMathContent } from "../assets/js/data/approved-math-content.js";
import { learningContentRegistry } from "../assets/js/data/content-registry.js";
import { curriculumTopics } from "../assets/js/data/curriculum.js";
import { documentSources, nativeDocumentSources } from "../assets/js/data/document-mappings.js";
import { exampleContent } from "../assets/js/data/example-content.js";
import { knowledgeContent } from "../assets/js/data/knowledge-content.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checkpointPath = resolve(projectRoot, ".audit", "math-content-v5-checkpoint.json");
const sourceDocuments = [...documentSources, ...nativeDocumentSources];
const exerciseTitles = new Map(curriculumTopics.flatMap((topic) => (
  topic.exerciseTypes.map((exercise) => [exercise.code, exercise.title])
)));

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function sourceInventory() {
  return sourceDocuments.map((document) => {
    const path = resolve(projectRoot, document.filePath);
    const present = existsSync(path);
    return {
      id: document.id,
      format: document.sourceKind ?? "pdf",
      path: document.filePath,
      expectedSha256: document.sourceSha256,
      actualSha256: present ? sha256(path) : null,
      checksumMatches: present && sha256(path) === document.sourceSha256,
      topicIds: Object.keys(document.topics),
      verification: document.verification?.status ?? "unknown"
    };
  });
}

function formulaInventory() {
  const rows = [];
  for (const [code, reading] of Object.entries(knowledgeContent)) {
    for (const [formulaIndex, formula] of (reading.formulae ?? []).entries()) {
      if (formula.renderAsMath === false) continue;
      for (const [expressionIndex, value] of (formula.expressions?.length ? formula.expressions : [formula.value]).entries()) {
        const latex = mathTextToLatex(value);
        const rendered = renderMathText(value, { display: true });
        const renderedAsMath = formula.renderAsMath === true || rendered.includes('class="math-expression');
        const validation = renderedAsMath ? validateLatexExpression(latex) : { valid: null, error: null };
        rows.push({
          id: `${code}:knowledge:${formulaIndex + 1}:expression:${expressionIndex + 1}`,
          code,
          field: "knowledge.formulae",
          latex,
          renderedAsMath,
          valid: validation.valid,
          error: validation.error
        });
      }
    }
  }
  for (const [code, examples] of Object.entries(exampleContent)) {
    for (const [exampleIndex, example] of examples.entries()) {
      for (const [stepIndex, step] of (example.steps ?? []).entries()) {
        if (!step.expression) continue;
        const latex = mathTextToLatex(step.expression);
        const rendered = renderMathText(step.expression, { display: true });
        const renderedAsMath = rendered.includes('class="math-expression');
        const validation = renderedAsMath ? validateLatexExpression(latex) : { valid: null, error: null };
        rows.push({
          id: `${code}:example:${exampleIndex + 1}:step:${stepIndex + 1}`,
          code,
          field: "examples.steps.expression",
          latex,
          renderedAsMath,
          valid: validation.valid,
          error: validation.error
        });
      }
    }
  }
  return rows;
}

function renderingInventory() {
  const rows = [];
  const inspect = (id, field, html) => {
    const errorMatches = [...String(html).matchAll(/class="(?:math-render-error|katex-error)"[^>]*?(?:data-math-error="([^"]*)")?/gu)];
    rows.push({
      id,
      field,
      valid: errorMatches.length === 0,
      errors: errorMatches.map((match) => match[1] ?? "math-render-error")
    });
  };

  for (const [code, reading] of Object.entries(knowledgeContent)) {
    const pages = reading.pages ?? [reading];
    for (const [pageIndex, page] of pages.entries()) {
      inspect(`${code}-knowledge-${pageIndex + 1}`, "knowledge", renderKnowledgeMarkdown({
        slide: { reading: page },
        position: { current: pageIndex + 1, total: pages.length },
        exercise: { code, title: exerciseTitles.get(code) ?? page.title ?? code }
      }));
    }
  }

  const inspectText = (id, field, value, display = false) => {
    if (value == null || value === "") return;
    inspect(id, field, renderMathText(value, { display }));
  };
  for (const [code, examples] of Object.entries(exampleContent)) {
    for (const [exampleIndex, example] of examples.entries()) {
      const id = example.id ?? `${code}-example-${exampleIndex + 1}`;
      inspectText(id, "prompt", example.prompt);
      for (const [analysisIndex, value] of (example.analysis ?? []).entries()) {
        inspectText(`${id}-analysis-${analysisIndex + 1}`, "analysis", value);
      }
      for (const [stepIndex, step] of (example.steps ?? []).entries()) {
        inspectText(`${id}-step-${stepIndex + 1}`, "steps.expression", step.expression, true);
        inspectText(`${id}-step-${stepIndex + 1}`, "steps.text", step.text);
      }
      inspectText(id, "answer", example.answer);
      inspectText(id, "takeaway", example.takeaway);
    }
  }
  return rows;
}

function withoutDelimitedMath(value) {
  return String(value ?? "")
    .replace(/\$\$[\s\S]*?\$\$/gu, "")
    .replace(/\\\([\s\S]*?\\\)/gu, "")
    .replace(/\$[^$\n]+\$/gu, "");
}

function scanTextIssues() {
  const issues = [];
  const inspect = (id, field, value) => {
    const plain = withoutDelimitedMath(value);
    if (/P\([^)]*\|[^)]*\)/u.test(plain)) {
      issues.push({ id, field, category: "RENDERING_ONLY_DEFECT", rule: "plain-conditional-probability" });
    }
    if (/(?:P\([^)]*\)|\b\d+(?:[.,]\d+)?)\s*\/\s*(?:P\(|\d)/u.test(plain)) {
      issues.push({ id, field, category: "NEEDS_MATH_REVIEW", rule: "plain-fraction-candidate" });
    }
    if (/(?:_\(|²ˣ⁺¹|−ˣ⁻²|√\s+[²³])/u.test(plain)) {
      issues.push({ id, field, category: "CONVERSION_DEFECT", rule: "flattened-script-or-radical" });
    }
  };

  for (const [code, reading] of Object.entries(knowledgeContent)) {
    inspect(`${code}-knowledge`, "lead", reading.lead);
    for (const [index, point] of (reading.points ?? []).entries()) {
      inspect(`${code}-knowledge-point-${index + 1}`, "points.text", point.text);
    }
    if (reading.note) inspect(`${code}-knowledge-note`, "note.text", reading.note.text);
    if (reading.conversionStatus === "native-latex-pilot" && reading.reviewStatus === "verified" && reading.verificationGates?.mathematicalReview !== "verified") {
      issues.push({ id: `${code}-knowledge`, field: "reviewStatus", category: "SOURCE_MAPPING_DEFECT", rule: "review-status-overclaim" });
    }
  }
  for (const [code, examples] of Object.entries(exampleContent)) {
    for (const [index, example] of examples.entries()) {
      inspect(example.id ?? `${code}-example-${index + 1}`, "prompt", example.prompt);
      inspect(example.id ?? `${code}-example-${index + 1}`, "answer", example.answer);
      for (const [stepIndex, step] of (example.steps ?? []).entries()) {
        inspect(`${example.id ?? `${code}-example-${index + 1}`}-step-${stepIndex + 1}`, "steps.text", step.text);
      }
    }
  }
  return issues;
}

function figureInventory() {
  const figures = [];
  for (const [code, examples] of Object.entries(exampleContent)) {
    for (const example of examples) {
      for (const [index, figure] of (example.assetReferences ?? example.figures ?? []).entries()) {
        const source = figure.src ?? figure.path ?? null;
        const localPath = source ? source.replace(/^\//u, "") : null;
        figures.push({
          id: `${example.id ?? `${code}-example`}-figure-${index + 1}`,
          source,
          reviewStatus: figure.reviewStatus ?? "needs-visual-review",
          present: localPath ? existsSync(resolve(projectRoot, localPath)) : false
        });
      }
    }
  }
  return figures;
}

function topicCoverage() {
  return curriculumTopics.map((topic) => {
    const record = learningContentRegistry.topics[topic.id];
    const subtopics = Object.values(record.subtopics);
    const available = (section) => subtopics.filter((item) => item.sections[section].status === "available").length;
    return {
      topicId: topic.id,
      status: record.status,
      subtopicCount: subtopics.length,
      knowledge: available("knowledge"),
      examples: available("examples"),
      practice: available("practice"),
      documentId: record.documentId
    };
  });
}

function main() {
  const sources = sourceInventory();
  const formulas = formulaInventory();
  const rendering = renderingInventory();
  const textIssues = scanTextIssues();
  const figures = figureInventory();
  const coverage = topicCoverage();
  const nativeReviewQueue = Object.entries(knowledgeContent)
    .filter(([, reading]) => reading.verificationGates?.mathematicalReview === "needs-review")
    .flatMap(([code]) => [`${code}-knowledge`, ...(exampleContent[code] ?? []).map((example) => example.id)]);
  const practiceUnits = Object.values(learningContentRegistry.topics)
    .flatMap((topic) => Object.values(topic.subtopics))
    .flatMap((subtopic) => subtopic.sections.practice.units);
  const sourceVerifiedExamples = Object.values(exampleContent).flat().filter((example) => (
    example.verification === "source-verified" || example.reviewStatus === "verified"
  ));

  const checkpoint = {
    schemaVersion: "bienedu.math-content-audit.v5",
    generatedAt: "2026-11-04",
    scope: {
      curriculumTopics: curriculumTopics.length,
      importedTopicIds: coverage.filter((item) => item.knowledge || item.examples || item.practice).map((item) => item.topicId),
      protectedTopicIds: ["CD20", "CD21"],
      pilotCorrections: ["22.5-inline-indices", "22.7-formula"]
    },
    counts: {
      sourceDocuments: sources.length,
      sourceDocumentsChecksumMatched: sources.filter((item) => item.checksumMatches).length,
      knowledgeRecords: Object.keys(knowledgeContent).length,
      exampleRecords: Object.values(exampleContent).flat().length,
      practiceUnits: practiceUnits.length,
      formulasScanned: formulas.length,
      formulasRenderedAsMath: formulas.filter((item) => item.renderedAsMath).length,
      formulasValid: formulas.filter((item) => item.valid === true).length,
      formulaTextSlots: formulas.filter((item) => !item.renderedAsMath).length,
      renderingChecks: rendering.length,
      renderingFailures: rendering.filter((item) => !item.valid).length,
      figuresReferenced: figures.length,
      figuresMissing: figures.filter((item) => !item.present).length,
      sourceVerifiedExamples: sourceVerifiedExamples.length,
      immutableApprovedRecords: Object.values(approvedMathContent).filter((item) => item.verification?.status === "verified").length,
      remainingSuspiciousTextItems: textIssues.length,
      mathematicalReviewQueue: nativeReviewQueue.length,
      missingSourceTopics: coverage.filter((item) => !item.documentId).length
    },
    sourceInventory: sources,
    formulaFailures: formulas.filter((item) => item.valid === false),
    renderingFailures: rendering.filter((item) => !item.valid),
    textIssues,
    figureIssues: figures.filter((item) => !item.present),
    correctionLog: [{
      id: "22.7-knowledge-1",
      source: { documentId: "cd20-cd23-native-latex", lines: [739, 755] },
      before: {
        category: "RENDERING_ONLY_DEFECT",
        formula: "P(bệnh|+) = P(bệnh)P(+|bệnh) / P(+)",
        renderMode: "plain-text",
        badge: "Đã kiểm duyệt"
      },
      after: {
        category: "NEEDS_MATH_REVIEW",
        formula: String.raw`\mathrm{P}(\text{bệnh}\mid +) = \frac{\mathrm{P}(\text{bệnh})\mathrm{P}(+\mid \text{bệnh})}{\mathrm{P}(+)}`,
        renderMode: "katex-display",
        badge: "Đã đối chiếu nguồn"
      },
      sourceFidelity: "verified",
      mathematicalReview: "needs-review"
    }, {
      id: "22.5-knowledge-inline-probability",
      source: { documentId: "cd20-cd23-native-latex", lines: [711, 715] },
      before: {
        category: "CONVERSION_DEFECT",
        formula: String.raw`\mathrm{P}(\text{B_{j}}\mid A)`,
        renderMode: "math-render-error",
        cause: "symbolic Unicode subscript was misclassified as prose"
      },
      after: {
        category: "NEEDS_MATH_REVIEW",
        formula: String.raw`\mathrm{P}(B_{j}\mid A)`,
        renderMode: "katex-inline"
      },
      sourceFidelity: "verified",
      mathematicalReview: "needs-review"
    }],
    reviewQueue: {
      mathematical: nativeReviewQueue,
      visual: figures.map((item) => item.id),
      missingSource: coverage.filter((item) => !item.documentId).map((item) => item.topicId)
    },
    topicCoverage: coverage
  };

  mkdirSync(dirname(checkpointPath), { recursive: true });
  writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  console.log(`Math V5 audit: ${formulas.length} formula slots and ${rendering.length} rendered fields; ${rendering.filter((item) => !item.valid).length} rendering failure(s).`);
  console.log(`${textIssues.length} suspicious text item(s); ${nativeReviewQueue.length} native-source review item(s).`);
  console.log(`Checkpoint: ${checkpointPath}`);
}

main();
