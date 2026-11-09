import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as katex from "../../assets/vendor/katex/katex.mjs";
import { getKnowledgeContent } from "../../assets/js/data/knowledge-content.js";
import { getExampleContent } from "../../assets/js/data/example-content.js";
import { getDocumentForTopic } from "../../assets/js/data/document-mappings.js";
import { mathTextToLatex, validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";
import { normalizeBoundSourceField } from "../math-pdf/normalize.mjs";
import { digest, sourceIdentityHash } from "./model.mjs";
import { readRuntimeTarget, readJsonObjectAfter } from "./runtime-target.mjs";
import { root as projectRoot } from "./build.mjs";

const staticFiles = ["assets/js/data/calculus-lessons.js", "assets/js/data/calculus-knowledge-details.js", "assets/js/data/calculus-source-examples.js", "assets/js/data/knowledge-content.js", "assets/js/data/example-content.js"];
const loadedHashes = Object.fromEntries(staticFiles.map((file) => [file, digest(readFileSync(join(projectRoot, file)))]));
export const mappingStatuses = Object.freeze(["EXACT_RUNTIME_MAPPING", "MULTIPLE_VALID_TARGETS", "SOURCE_ONLY", "AMBIGUOUS_MAPPING", "MISSING_RUNTIME_CONTENT"]);

// Comparison only: remove spacing/style, retain fraction/radical/group children.
// This is never used to rewrite mathematics or to grant human approval.
export function expressionKey(value) {
  const latex = mathTextToLatex(String(value)).split(/,\s*\\quad/u)[0];
  if (!validateLatexExpression(latex).valid) return null;
  return digest(katex.renderToString(latex, { output: "mathml", trust: false, strict: "ignore" })
    .replace(/<annotation[\s\S]*?<\/annotation>/gu, "").replace(/<mspace\b[^>]*\/?>(?:<\/mspace>)?/gu, "").replace(/<mtext>\s*<\/mtext>/gu, "")
    .replace(/<\/?mstyle\b[^>]*>/gu, "").replace(/\s+/gu, ""));
}

export function loadMappingRuntime(root = projectRoot) {
  for (const file of staticFiles) if (digest(readFileSync(join(root, file))) !== loadedHashes[file]) throw new Error(`Runtime module changed since load; restart mapping process: ${file}`);
  const foundationFile = "assets/js/data/foundation-lessons.generated.js";
  const source = readFileSync(join(root, foundationFile), "utf8");
  return { root, native: readRuntimeTarget(root), foundationFile, foundationHash: digest(source),
    foundation: Object.fromEntries(["knowledge", "examples", "topicKnowledge", "problemTypes"].map((name) => [name, readJsonObjectAfter(source, `const ${name} = `)])) };
}

// A target ID names a source-backed role. Labels/MathML are guarded locators,
// not identities. Ambiguous matches fail closed. Numeric paths are diagnostics
// resolved anew for the current version, never stored permanent identifiers.
export function resolveFormulaFields(record, selector) {
  const containers = selector.scope === "page" ? (record.pages ?? []).map((page, index) => ({ node: page, path: ["pages", index] })) : [{ node: record, path: [] }];
  const found = [];
  for (const container of containers) {
    if (selector.sourcePages && JSON.stringify(container.node.sourcePages) !== JSON.stringify(selector.sourcePages)) continue;
    for (const [index, formula] of (container.node.formulae ?? []).entries()) {
      if (formula.label !== selector.formulaLabel) continue;
      const field = selector.field ?? "value";
      const value = formula[field];
      const values = Array.isArray(value) ? value : [value];
      if (!values.some((entry) => typeof entry === "string" && expressionKey(entry) === selector.expressionKey)) continue;
      found.push({ before: value, path: [...container.path, "formulae", index, field], formula, page: container.node });
    }
  }
  if (found.length !== 1) throw new Error(found.length ? "Ambiguous formula locator" : "Formula locator not found");
  return found[0];
}

const formulaSpecs = {
  "pdf-derivative-power": ["Quy tắc đại số", String.raw`(x^n)'=nx^{n-1}`],
  "pdf-derivative-quotient": ["Quy tắc đại số", String.raw`\left(\frac{u}{v}\right)'=\frac{u'v-uv'}{v^2}`],
  "pdf-derivative-root": ["Hàm hợp và căn thức", String.raw`(\sqrt{u})'=\frac{u'}{2\sqrt{u}}`],
  "pdf-derivative-log": ["Mũ và lôgarit", String.raw`(\log_a u)'=\frac{u'}{u\ln a}`],
  "pdf-integral-definition": ["Định nghĩa nguyên hàm", String.raw`\int f(x)\,dx=F(x)+C`],
  "pdf-integral-power": ["Lũy thừa", String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C`],
  "pdf-integral-log": ["Hàm nghịch đảo", String.raw`\int\frac{1}{x}\,dx=\ln|x|+C`],
  "pdf-integral-base": ["Hàm mũ", String.raw`\int a^x\,dx=\frac{a^x}{\ln a}+C`],
  "pdf-integral-cos-reciprocal": ["Phân thức lượng giác", String.raw`\int\frac{1}{\cos^2 x}\,dx=\tan x+C`],
  "pdf-integral-sin-reciprocal": ["Phân thức lượng giác", String.raw`\int\frac{1}{\sin^2 x}\,dx=-\cot x+C`],
  "pdf-integral-radical": ["Arcsin – arctan", String.raw`\int\frac{1}{\sqrt{1-x^2}}\,dx=\arcsin x+C`],
  "pdf-integral-chain": ["Hàm hợp lũy thừa", String.raw`\int f'(x)[f(x)]^n\,dx=\frac{[f(x)]^{n+1}}{n+1}+C`],
  "pdf-definite-integral": ["Newton–Leibniz", String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`],
  "pdf-area-absolute": ["Diện tích với Ox", String.raw`S=\int_a^b|f(x)|\,dx`]
};
const exampleSpecs = {
  "pdf-geometric-point": ["7.7-source-example-1", 1, ["prompt"]],
  "pdf-simultaneous-constraints": ["1.1-source-example-8", 8, ["answer", "source-solution.expression"]],
  "pdf-rational-exponents": ["8.1-source-example-1", 1, ["prompt"]],
  "pdf-nested-exponents": ["8.1-source-example-6", 6, ["prompt"]],
  "pdf-root-exponents": ["8.1-source-example-3", 3, ["prompt"]],
  "pdf-powers-condition": ["8.1-source-example-5", 5, ["prompt"]],
  "pdf-log-bases": ["8.2-source-example-1", 1, ["prompt"]],
  "pdf-log-nested": ["8.2-source-example-3", 3, ["prompt"]],
  "pdf-log-product": ["8.2-source-example-5", 5, ["prompt"]],
  "pdf-definite-example": ["13.1-example-1", 1, ["prompt"]],
  "pdf-graph-associated": ["13.1-source-example-2", 2, ["prompt", "answer", "setup.expression"]],
  "pdf-area-piecewise": ["14.1-source-example-1", 1, ["setup.expression", "answer"]],
  "pdf-root-domain": ["1.3-source-example-4", 4, ["prompt", "answer", "source-solution.expression", "title"]],
  "pdf-rational-domain": ["1.2-source-example-5", 5, ["prompt", "answer", "source-solution.expression", "title"]]
};
const stepLabels = { "source-solution.expression": "Lời giải từ tài liệu", "setup.expression": "Thiết lập" };

export function resolveExampleField(record, field) {
  if (!field.includes(".")) { if (typeof record[field] !== "string") throw new Error("Missing example field"); return { before: record[field], path: [field] }; }
  const matches = (record.steps ?? []).map((step, index) => ({ step, index })).filter(({ step }) => step.label === stepLabels[field]);
  if (matches.length !== 1) throw new Error("Ambiguous worked-solution field");
  return { before: matches[0].step.expression, path: ["steps", matches[0].index, "expression"] };
}

export function classifyRuntimeMappings(items, { runtime = loadMappingRuntime(), corrections = JSON.parse(readFileSync(join(runtime.root, "scripts/source-first/corrections-v53.json"), "utf8")).corrections } = {}) {
  return items.map((item) => {
    const code = item.sectionId;
    const source = getDocumentForTopic(item.topicId);
    const usages = [], candidates = [], issues = [];
    const add = (id, recordId, record, result, origin, relation, selector) => {
      const corrected = normalizeBoundSourceField({ recordId, sourceHash: item.source.sha256, field: selector.fieldId, value: result.before }, corrections);
      usages.push({ targetId: id, recordId, selector, sourceDocumentId: source?.documentId, sourceHash: item.source.sha256,
        sourceBlockId: record.sourceBlockId ?? record.sectionId ?? null, contentVersion: record.contentVersion ?? `module-sha256:${loadedHashes[origin] ?? runtime.foundationHash}`,
        origin, resolvedPath: result.path, before: result.before, after: corrected.value, beforeHash: digest(result.before), recordHash: digest(record),
        relation, conditionContext: result.formula?.detail ?? null, correctionId: corrected.correctionId, changed: corrected.changed,
        rollback: { before: corrected.value, after: result.before }, humanApproval: "pending", targetReviewRequired: true,
        correctionSource: corrected.correctionId ? corrections.find((entry) => entry.id === corrected.correctionId) : null });
    };
    try {
      if (item.source.kind === "tex" && ["CD20", "CD21"].includes(item.topicId)) {
        candidates.push({ recordId: `knowledge:${code}`, sourceDocumentId: source?.documentId, formulae: getKnowledgeContent(code)?.formulae });
        issues.push("The native TeX edition is excluded from the current CD20/CD21 import. Existing PDF-backed counterparts are not an approved cross-edition target.");
      } else if (item.id === "pdf-counting-source") {
        candidates.push({ problemTypeId: code, sourcePages: [4], observedValue: "N = 3 + 4 + 1 = 8" });
        issues.push("The corresponding legacy Example has no stable ID/sourceBlockId; its fallback ID depends on array order. Do not bind or overwrite it by position.");
      } else if (!source || source.documentId !== item.source.documentId || source.sourceSha256 !== item.source.sha256 || digest(readFileSync(join(runtime.root, source.filePath))) !== item.source.sha256) {
        issues.push("Source registry identity/hash does not match this source edition.");
      } else if (item.source.kind === "tex") {
        const record = runtime.native.knowledge[code];
        if (!record || record.sourceDocumentId !== item.source.documentId || !record.sourceLines || item.source.location.lines[0] < record.sourceLines[0] || item.source.location.lines[1] > record.sourceLines[1]) throw new Error("Native source section mismatch");
        const selector = { recordId: `knowledge:${code}`, blockRole: `native-formula:${code}`, scope: "root", formulaLabel: "Công thức", expressionKey: expressionKey(item.normalizedLatex), field: "value", fieldId: "formula.value" };
        add(`${item.id}:native-formula`, selector.recordId, record, resolveFormulaFields(record, selector), "assets/js/data/latex-pilot.generated.js", "exact source formula", selector);
      } else if (formulaSpecs[item.id]) {
        const [label, core] = formulaSpecs[item.id];
        const foundation = /^(?:[1-9]|10|11)\./u.test(code);
        const record = foundation ? runtime.foundation.knowledge[code] : getKnowledgeContent(code);
        if (!record) throw new Error("Knowledge record missing");
        const origin = foundation ? runtime.foundationFile : "assets/js/data/calculus-knowledge-details.js";
        const views = [{ scope: "root", record, recordId: `knowledge:${code}` }];
        if (record.pages) views.push({ scope: "page", record, recordId: `knowledge:${code}` });
        if (foundation && runtime.foundation.topicKnowledge[item.topicId]?.formulae) views.push({ scope: "topic", record: runtime.foundation.topicKnowledge[item.topicId], recordId: `topic:${item.topicId}` });
        for (const view of views) {
          const containing = (view.scope === "page" ? view.record.pages : [view.record]).flatMap((page) => page.formulae ?? []).filter((formula) => formula.label === label && [formula.value, ...(formula.expressions ?? [])].some((value) => expressionKey(value) === expressionKey(core)));
          if (!containing.length) {
            if ((view.scope === "page" ? view.record.pages : [view.record]).some((page) => page.formulae?.some((formula) => formula.label === label))) issues.push(`Known formula role ${label} has a different mathematical structure; do not infer a match.`);
            continue;
          }
          const formula = containing[0];
          const fields = formula.expressions?.some((value) => expressionKey(value) === expressionKey(core)) ? ["expressions", ...(expressionKey(formula.value) === expressionKey(core) ? ["value"] : [])] : ["value"];
          for (const field of fields) {
            const selector = { recordId: view.recordId, blockRole: item.id, scope: view.scope === "page" ? "page" : "root", formulaLabel: label, expressionKey: expressionKey(core), field, fieldId: field === "detail" ? "formula:area-with-Ox.detail" : `formula.${field}` };
            add(`${item.id}:${view.scope}:${field}`, view.recordId, view.record, resolveFormulaFields(view.record, selector), origin, view.scope === "root" && record.pages ? "aggregate alias; page view is the reader" : "formula collection usage", selector);
          }
        }
        if (item.id === "pdf-area-absolute") {
          const selector = { recordId: `knowledge:${code}`, blockRole: "area-with-Ox", scope: "root", formulaLabel: label, expressionKey: expressionKey(core), field: "value", fieldId: "formula:area-with-Ox.detail" };
          const resolved = resolveFormulaFields(record, selector);
          add(`${item.id}:bound-order-condition`, selector.recordId, record, { ...resolved, before: resolved.formula.detail, path: [...resolved.path.slice(0, -1), "detail"] }, origin, "source-printed condition accompanying the formula", selector);
        }
      } else if (item.id === "pdf-exponent-warning") {
        const record = runtime.foundation.knowledge[code];
        add(`${item.id}:knowledge-note`, `knowledge:${code}`, record, { before: record.note.text, path: ["note", "text"] }, runtime.foundationFile, "source warning; not a universal inequality", { recordId: `knowledge:${code}`, fieldId: "note.text", sourcePage: 9 });
        const types = runtime.foundation.problemTypes[item.topicId].filter((entry) => entry.code === code);
        if (types.length !== 1) throw new Error("Ambiguous problem-type code");
        add(`${item.id}:method-note`, `problem-type:${code}`, types[0], { before: types[0].note, path: ["note"] }, runtime.foundationFile, "same source warning reused in methodology", { recordId: `problem-type:${code}`, fieldId: "note", sourcePage: 9 });
      } else if (exampleSpecs[item.id]) {
        const [recordId, number, fields] = exampleSpecs[item.id];
        const foundation = /^(?:[1-9]|10|11)\./u.test(code);
        const examples = foundation ? runtime.foundation.examples[code] : getExampleContent(code);
        const matches = examples.filter((record) => record.id === recordId && record.sourceBlockId === `${code}-worked-example-${number}`);
        if (matches.length !== 1) throw new Error("Stable Example/sourceBlockId mismatch");
        const record = matches[0];
        if (!record.sourcePages?.includes(item.source.location.page)) throw new Error("Example source page mismatch");
        const origin = foundation ? runtime.foundationFile : recordId.includes("-source-example-") ? "assets/js/data/calculus-source-examples.js" : "assets/js/data/calculus-lessons.js";
        for (const field of fields) add(`${item.id}:${field}`, recordId, record, resolveExampleField(record, field), origin, ["pdf-graph-associated", "pdf-area-piecewise"].includes(item.id) ? "component of a source equality chain; never substitute the whole chain into the question" : "same original source Example and field role", { recordId, sourceBlockId: record.sourceBlockId, originalExampleNumber: number, fieldId: field });
      } else issues.push("No source-backed target specification exists.");
    } catch (error) { issues.push(error.message); }
    const classification = issues.length ? "AMBIGUOUS_MAPPING" : usages.length > 1 ? "MULTIPLE_VALID_TARGETS" : usages.length === 1 ? "EXACT_RUNTIME_MAPPING" : "MISSING_RUNTIME_CONTENT";
    const proposalContent = { itemId: item.id, itemVersion: item.contentVersion, sourceIdentityHash: sourceIdentityHash(item), normalizedLatex: item.normalizedLatex, conditions: item.conditions ?? [],
      usages: usages.map(({ targetId, recordId, selector, before, after, recordHash, contentVersion, correctionSource }) => ({ targetId, recordId, selector, before, after, recordHash, contentVersion,
        correctionSource: correctionSource ? { id: correctionSource.id, sourceHash: correctionSource.sourceHash, sourcePages: correctionSource.sourcePages, sourceBlockId: correctionSource.sourceBlockId } : null })) };
    return { itemId: item.id, classification, reason: issues.length ? issues.join(" ") : usages.length > 1 ? "All listed usages resolve through stable record/source identities and guarded semantic field roles; they are not independent source items." : usages.length ? "One exact source-backed field resolves uniquely." : "No field for this source expression exists under the known record and source identities.",
      source: item.source, originalExpression: item.originalExpression, normalizedLatex: item.normalizedLatex, conditions: item.conditions, usages, candidates, issues,
      reviewStatus: item.review.status, proposedChanges: usages.filter((usage) => usage.changed), proposalContent, proposalHash: digest(proposalContent), publication: "blocked-pending-human-target-review", protectedTopic: ["CD20", "CD21"].includes(item.topicId) };
  });
}
