import * as katex from "../../assets/vendor/katex/katex.mjs";
import { digest, validateItem } from "./model.mjs";
import { mathTextToLatex, renderMathText, validateLatexExpression } from "../../assets/js/components/markdown-math-renderer.js";
import { sourceFormulaToLatex } from "../latex-pilot/parser.mjs";

// Full expression comparison: unlike a core-formula locator, this retains all
// printed conditions and token grouping. No algebraic equivalence is inferred.
export function mathematicalStructure(value) {
  const latex = mathTextToLatex(value ?? "");
  if (!latex.trim() || !validateLatexExpression(latex).valid) return null;
  const mathml = katex.renderToString(latex, { output: "mathml", trust: false, strict: "ignore" })
    .replace(/<annotation[\s\S]*?<\/annotation>/gu, "").replace(/<mspace\b[^>]*\/?>(?:<\/mspace>)?/gu, "")
    .replace(/<mtext>\s*<\/mtext>/gu, "").replace(/<\/?mstyle\b[^>]*>/gu, "").replace(/\s+/gu, "");
  return { hash: digest(mathml), tokens: [...mathml.matchAll(/<(mi|mn|mo)\b[^>]*>(.*?)<\/\1>/gu)].map((match) => [match[1], match[2]]),
    shapes: Object.fromEntries(["mfrac", "msqrt", "mroot", "msup", "msub", "msubsup"].map((tag) => [tag, (mathml.match(new RegExp(`<${tag}(?:>|\\s)`, "gu")) ?? []).length])) };
}

export function compareMathematics(items, mappings, { root }) {
  return items.map((item) => {
    const mapping = mappings.find((entry) => entry.itemId === item.id);
    const validation = validateItem(item, { root });
    const sourceNormalization = item.source.kind === "tex" ? sourceFormulaToLatex(item.originalExpression) : item.originalExpression;
    const original = mathematicalStructure(sourceNormalization), candidate = mathematicalStructure(item.normalizedLatex);
    const uncertainties = [...mapping.issues];
    const sourceValid = validation.structure.status === "passed";
    const renderValid = validation.syntax.status === "passed" && !/math-render-error|katex-error/u.test(renderMathText(`\\(${item.normalizedLatex}\\)`));
    const conditions = (item.conditions ?? []).map((condition) => {
      const context = mapping.usages.map((usage) => usage.conditionContext ?? "").join(" ").replace(/^với\s+/u, "").replace(/\\[()]/gu, "");
      return { ...condition, sourceStructure: mathematicalStructure(condition.originalExpression ?? condition.normalizedLatex)?.hash,
        nativeSourceContextPresent: item.source.kind === "tex" && typeof condition.originalContext === "string" && readFileSync(localFile(root, item.source.file), "utf8").includes(condition.originalContext),
        preserved: mathematicalStructure(context)?.hash === mathematicalStructure(condition.normalizedLatex)?.hash };
    });
    if (conditions.some((condition) => !condition.preserved || item.source.kind === "tex" && !condition.nativeSourceContextPresent)) uncertainties.push("Printed condition has no independently matching source/runtime condition context.");
    if (!sourceValid || !renderValid) uncertainties.push("Source provenance or rendering validation failed.");
    const changed = mapping.proposedChanges;
    // These are source-bound V5.3 agent transcriptions, not machine-derived PDF
    // ground truth. Keep this evidence distinction visible to the reviewer.
    const demonstratedPilot = sourceValid && renderValid && !mapping.issues.length && changed.length > 0
      && changed.every((usage) => usage.correctionSource?.sourceHash === item.source.sha256 && usage.beforeHash === digest(usage.before)
        && !/math-render-error|katex-error/u.test(renderMathText(usage.after)));
    const nativeMatch = item.source.kind === "tex" && original && candidate && original.hash === candidate.hash
      && mapping.usages.length === 1 && !uncertainties.length
      && mathematicalStructure(mapping.usages[0].before)?.hash === candidate.hash;
    const classification = demonstratedPilot ? "CONFIRMED_CONVERSION_DEFECT" : sourceValid && renderValid && nativeMatch ? "MACHINE_MATCHED" : "AMBIGUOUS";
    if (item.source.kind === "pdf" && !demonstratedPilot) uncertainties.push("PDF benchmark transcription is not independent machine ground truth; original layout/grouping still requires review.");
    if (item.source.kind === "tex" && original?.hash !== candidate?.hash) uncertainties.push("Native source and candidate differ under supported structural normalization.");
    return { itemId: item.id, classification, priority: classification === "AMBIGUOUS" ? 1 : classification === "CONFIRMED_CONVERSION_DEFECT" ? 2 : 3,
      source: item.source, sourceValid, originalExpression: item.originalExpression, extractedExpression: item.originalExpression,
      candidate: item.normalizedLatex, currentRuntime: mapping.usages.map((usage) => ({ targetId: usage.targetId, value: usage.before })),
      proposedRuntime: changed.map((usage) => ({ targetId: usage.targetId, value: usage.after })),
      structure: { source: original, candidate, nativeSourceMatches: item.source.kind === "tex" && original?.hash === candidate?.hash,
        tokensPreserved: Boolean(original && candidate && digest(original.tokens) === digest(candidate.tokens)), shapesPreserved: Boolean(original && candidate && digest(original.shapes) === digest(candidate.shapes)) },
      sourceNormalization: item.source.kind === "tex" ? { expression: sourceNormalization, adapter: "existing sourceFormulaToLatex: balanced RHS fraction, text scripts, probability labels/operators; no algebraic rewrites", independentMathematicalProof: false } : null,
      conditions, renderValid, uncertainties, sourceEvidence: item.assetReferences,
      evidenceMethod: item.source.kind === "tex" ? "Untouched source slice + full MathML/token comparison + runtime/source binding" : demonstratedPilot ? "V5.3 source-bound PDF transcription, original statement/answer pages and guarded runtime diff; agent observation, not human approval" : "Source/crop hashes and parsing; no independent PDF formula recognizer available",
      humanApproval: "not-inferred", humanRequirement: classification === "MACHINE_MATCHED" ? "Sampling permitted; no source/math approval granted" : "Explicit source and mathematical review required" };
  }).sort((a, b) => a.priority - b.priority || a.itemId.localeCompare(b.itemId, "en"));
}

export function pilotConsistencyEvidence() {
  const rational = [-2, -.5, 0, .5, 2, 3].map((x) => {
    const h = 1e-6, f = (t) => t / (t*t-1), numeric = (f(x+h)-f(x-h))/(2*h), candidate = (-x*x-1)/((x-1)**2*(x+1)**2);
    return { x, numeric, candidate, matches: Math.abs(numeric-candidate) < 1e-5 };
  });
  const radical = [-1.5, -.5, 0, .5, 1.5].map((x) => {
    const h = 1e-6, f = (t) => Math.sqrt(4-t*t), numeric = (f(x+h)-f(x-h))/(2*h), candidate = -x/Math.sqrt(4-x*x);
    return { x, numeric, candidate, matches: Math.abs(numeric-candidate) < 1e-5 };
  });
  return { rational, rationalResult: { numerator: -5, denominator: 9 }, radical,
    domain: { function: "[-2;2]", derivative: "(-2;2)", endpointDerivativeClaimed: false },
    limitation: "Numerical regression evidence only; source fidelity and mathematical proof are separate.",
    localModel: "No supported local model CLI/configuration detected; no model or external document service invoked." };
}
import { readFileSync } from "node:fs";
import { localFile } from "./model.mjs";
