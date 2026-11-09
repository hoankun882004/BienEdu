import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root, work } from "./build.mjs";
import { digest } from "./model.mjs";
import { writeImmutableJson } from "./review-store.mjs";
import { extractDelimitedMath } from "./tex.mjs";
import { definitions, correctedAnswer, sourceHash } from "./corrections-v56.mjs";
import { collectFractionRows, extractFractionEvidence, auditDirectory, recoverV55 } from "./fraction-audit.mjs";
import { renderMathText } from "../../assets/js/components/markdown-math-renderer.js";

export const registryFile = "scripts/source-first/corrections-v56.json";
export function sealCorrections(rows) {
  const corrections = definitions.map((definition) => {
    const id = `${definition.code}-source-example-${definition.number}`, row = rows.find((row) => row.recordId===id);
    if (!row?.exactMapping || row.sourceHash!==sourceHash || row.evidence.locator!=="section-and-original-example-number") throw new Error("Missing exact pilot source/runtime evidence");
    if (row.record.answer!==row.record.steps[0].expression) throw new Error("Contradictory initial solution/answer group");
    const answer = correctedAnswer(definition,row.record.answer);
    const fields = [{field:"answer",before:row.record.answer,after:answer},{field:"source-solution.expression",before:row.record.steps[0].expression,after:answer}];
    if (definition.prompt) fields.push({field:"prompt",before:row.record.prompt,after:definition.prompt},{field:"title",before:row.record.title,after:`Ví dụ ${definition.number}`});
    for (const field of fields) if (/math-render-error|katex-error/u.test(renderMathText(field.after))) throw new Error("Invalid proposed KaTeX");
    return { id:`fraction-v56-${definition.code}-${definition.number}`, recordId:id, code:definition.code, number:definition.number, sourceBlockId:row.record.sourceBlockId,
      sourceDocumentId:row.documentId,sourceFile:row.sourceFile,sourceHash, recordHash:digest(row.record), reason:definition.reason,
      regions:row.evidence.regions.map(({role,page,bbox})=>({role,page,bbox})), evidenceHash:digest(row.evidence), fields, formalHumanApproval:false };
  });
  const registry={schemaVersion:"bienedu.source-corrections.v5.6", corrections};
  writeImmutableJson(join(root,registryFile),registry);
  return registry;
}

export function symbolicJobs(registry) {
  return registry.corrections.flatMap((record) => {
    const definition=definitions.find((entry)=>entry.code===record.code && entry.number===record.number);
    const answer=record.fields.find((field)=>field.field==="answer").after;
    const math=extractDelimitedMath(answer).map((entry)=>entry.raw);
    if (definition.polynomials) return definition.polynomials.map((polynomial,index)=>({id:`${record.id}-${String.fromCharCode(65+index)}`,kind:"equivalent",
      expression:polynomial.replaceAll("x",String.raw`(\frac{1}{2})`),expected:math[index],domain:"real"}));
    const prompt=record.fields.find((field)=>field.field==="prompt")?.after;
    const expression=prompt ? extractDelimitedMath(prompt)[0]?.raw.split("=").slice(1).join("=") : definition.expression;
    // Negative powers, denominator and domains are the actual proposed values,
    // not a separate idealized answer used to green-light a different patch.
    const derivative=math.find((entry)=>/^(?:y'|f'\(x\))=/u.test(entry))?.split("=").slice(1).join("=");
    if (expression!==definition.expression || derivative!==definition.derivative) throw new Error("Symbolic/proposed field drift");
    return [{id:record.id,kind:"derivative",expression,expected:derivative,functionDomain:definition.functionDomain,derivativeDomain:definition.derivativeDomain,
      ...(definition.valueAt ? {valueAt:definition.valueAt,value:definition.value}: {})}];
  });
}
export function verifySymbolic(registry) {
  const jobs=symbolicJobs(registry),python=join(work,"sympy-env",process.platform==="win32"?"Scripts/python.exe":"bin/python");
  const result=spawnSync(python,["-X","utf8",join(root,"scripts/source-first/symbolic-batch.py")],{input:JSON.stringify({jobs}),encoding:"utf8",windowsHide:true,timeout:30000,maxBuffer:4*1024*1024});
  if(result.status!==0) throw new Error(result.error?.message??result.stderr);
  return {jobs,...JSON.parse(result.stdout)};
}

export function prepareFractionBatch() {
  const recovery=recoverV55(),rows=collectFractionRows(),evidence=extractFractionEvidence(rows);
  for(const row of rows) row.evidence=evidence.find((entry)=>entry.reference===row.reference);
  const registry=sealCorrections(rows),symbolic=verifySymbolic(registry);
  writeFileSync(join(auditDirectory,"fraction-evidence-v5.6.json"),JSON.stringify({queue:".audit/math-content-v5-checkpoint.json#textIssues",newQueueCreated:false,rows},null,2)+"\n");
  writeFileSync(join(auditDirectory,"symbolic-v5.6.json"),JSON.stringify(symbolic,null,2)+"\n");
  return {recovery,rows,registry,symbolic};
}
if(process.argv[1]?.endsWith("fraction-batch.mjs")) {
  const result=prepareFractionBatch();console.log(JSON.stringify({corrections:result.registry.corrections.length,symbolic:result.symbolic},null,2));
}
