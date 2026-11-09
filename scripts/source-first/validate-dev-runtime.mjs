import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderMathText, humanVerificationStatus } from "../../assets/js/components/markdown-math-renderer.js";
import { resolveExampleField } from "./runtime-mappings.mjs";

export async function validateDevelopmentRuntime(root, changes, phase = "after") {
  const knowledge = await import(pathToFileURL(join(root, "assets/js/data/knowledge-content.js")).href);
  const examples = await import(pathToFileURL(join(root, "assets/js/data/example-content.js")).href);
  const results = [];
  for (const change of changes) {
    let record, actual;
    if (change.recordId === "knowledge:14.1") {
      record = knowledge.getKnowledgeContent("14.1");
      const fields = record.formulae.filter((field) => field.label === change.formulaLabel);
      if (fields.length !== 1) throw new Error("Ambiguous learner Knowledge field"); actual = fields[0].detail;
    } else {
      const matches = examples.getExampleContent(change.recordId.split("-")[0]).filter((record) => record.id === change.recordId && record.sourceBlockId === change.sourceBlockId);
      if (matches.length !== 1) throw new Error("Ambiguous learner Example identity"); record = matches[0]; actual = resolveExampleField(record, change.fieldId).before;
    }
    const expected = change[phase];
    if (actual !== expected) throw new Error(`Learner loader differs from ${phase} preview: ${change.recordId}/${change.fieldId}`);
    if (/math-render-error|katex-error/u.test(renderMathText(actual))) throw new Error("Learner math render error");
    if (humanVerificationStatus(record).mathematical) throw new Error("Machine-only pilot must not gain a human editorial badge");
    results.push({ recordId: change.recordId, fieldId: change.fieldId, exactMatch: true, renderPassed: true, humanEditorialBadge: false });
  }
  return { passed: true, fields: results };
}
if (process.argv[1]?.endsWith("validate-dev-runtime.mjs")) {
  try { const payload = JSON.parse(readFileSync(0, "utf8")); console.log(JSON.stringify(await validateDevelopmentRuntime(payload.root, payload.changes, payload.phase))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
