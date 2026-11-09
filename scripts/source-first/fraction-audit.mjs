import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root } from "./build.mjs";
import { digest } from "./model.mjs";
import { getKnowledgeContent } from "../../assets/js/data/knowledge-content.js";
import { getExampleContent } from "../../assets/js/data/example-content.js";
import { documentSources, getDocumentForTopic } from "../../assets/js/data/document-mappings.js";
import { writeImmutableJson } from "./review-store.mjs";
import { parseLatexDocument, buildPilotTopic, SOURCE_RELATIVE_PATH } from "../latex-pilot/parser.mjs";

export const auditDirectory = join(root, ".audit/source-first-v5");
export function recoverV55() {
  const report = JSON.parse(readFileSync(join(auditDirectory, "development-preview-v5.5.json"), "utf8"));
  const runtime = report.plan.files.map((file) => ({ file: file.file, hash: digest(readFileSync(join(root, file.file))), expectedAfterHash: file.afterHash }));
  if (runtime.some((entry) => entry.hash !== entry.expectedAfterHash)) throw new Error("V5.6 requires the intact applied V5.5 baseline; no automatic rollback/rebase");
  const directory = join(root, ".content-work/source-first-v5/dev-experiments", report.plan.planHash);
  const journal = readdirSync(directory).sort().map((file) => ({ file, hash: digest(readFileSync(join(directory, file))) }));
  const sources = JSON.parse(readFileSync(join(auditDirectory, "recovery-v5.5.json"), "utf8")).sources;
  const protectedFiles = ["assets/js/data/latex-pilot.generated.js", "assets/js/data/calculus-lessons.js", "assets/js/data/calculus-source-examples.js", "assets/js/learning-progress.js"].filter((file) => existsSync(join(root,file)));
  const recovery = { version: "5.6", baseline: "locally-applied-unreviewed", runtime, journal, parentPlanHash: report.plan.planHash,
    immutableParent: `.content-work/source-first-v5/dev-plans/${report.plan.planHash}/manifest.json`,
    sources: sources.map((entry) => ({ file: entry.file, hash: digest(readFileSync(join(root,entry.file))) })),
    protectedFiles: protectedFiles.map((file) => ({ file, hash: digest(readFileSync(join(root,file))) })),
    parentDependencies: report.plan.dependencies, realRuntimeWrites: 0, formalHumanApproval: false };
  writeImmutableJson(join(auditDirectory, "recovery-v5.6.json"), recovery);
  return recovery;
}

export function collectFractionRows() {
  const previous = JSON.parse(readFileSync(join(root, ".audit/math-content-v5-checkpoint.json"), "utf8"));
  const entities = JSON.parse(readFileSync(join(auditDirectory, "verification-v5.1.json"), "utf8")).reviewEntities;
  return previous.textIssues.filter((entry) => entry.rule === "plain-fraction-candidate").map((flag) => {
    const reference = `${flag.id}:${flag.field}`, code = flag.id.match(/^\d+\.\d+/u)?.[0], topicId = `CD${code.split(".")[0].padStart(2,"0")}`;
    const matches = getExampleContent(code).filter((record) => flag.id === record.id || flag.id.startsWith(`${record.id}-step-`));
    const record = flag.id.includes("knowledge") ? getKnowledgeContent(code) : matches.length === 1 ? matches[0] : null;
    const stepNumber = flag.id.match(/-step-(\d+)$/u)?.[1];
    const step=stepNumber?record?.steps?.[Number(stepNumber)-1]:null;
    const current = !record ? null : flag.field === "steps.text" ? step?.text : flag.field === "note.text" ? record.note?.text : record[flag.field];
    const document = getDocumentForTopic(topicId);
    return { reference, existingEntityKey: entities.find((entity) => entity.references.includes(reference))?.key ?? null,
      flag, code, topicId, recordId: record?.id ?? (flag.id.includes("knowledge") ? `knowledge:${code}` : null),
      exactMapping: Boolean(record && typeof current === "string" && (!step || record.steps.filter((entry)=>entry.label===step.label).length===1)), fieldId: stepNumber ? `step:${step?.label??"unresolved"}.text` : flag.field,
      current, record: record ?? null, documentId: document?.documentId ?? null, sourceFile: document?.filePath ?? null, sourceHash: document?.sourceSha256 ?? null,
      number: record?.originalExampleNumber ?? null, pages: record?.sourcePages?.length?record.sourcePages:document?.exercisePages?.[code]?[document.exercisePages[code]]:[], reviewStatus: record?.reviewStatus ?? "unresolved", formalHumanApproval: false };
  });
}

export function extractFractionEvidence(rows) {
  const result = spawnSync("python", ["-X", "utf8", join(root, "scripts/source-first/fraction-evidence.py")], {
    input: JSON.stringify({ sources: documentSources.filter((source) => source.availabilityStatus === "available"), rows }), encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 32*1024*1024,
  });
  if (result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  return JSON.parse(result.stdout);
}

export const classifications = ["ALREADY_CORRECT","CONFIRMED_CONVERSION_ERROR","SOURCE_AMBIGUOUS","RUNTIME_MAPPING_AMBIGUOUS","SOURCE_CONFLICT","UNSUPPORTED"];
const superscripts = Object.fromEntries([..."⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣᵗ"].map((char,index)=>[char,[..."0123456789+-=()nxt"][index]]));
export function canonicalInline(text) {
  return String(text).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣᵗ]+/gu,(value)=>`^{${[...value].map((char)=>superscripts[char]).join("")}}`).replace(/\s+/gu,"");
}
export function sourceInlineKey(region) {
  if (!region?.spans || region.drawings.length || /[√∫]/u.test(region.rawText)) return null;
  let source="",sup="";
  const flush=()=>{if(sup){source+=`^{${sup}}`;sup="";}};
  for(const span of region.spans) {
    if (!span.text.trim()) continue;
    if((span.flags&1) && /^[0-9xnmt+−=()\-/]+$/u.test(span.text.trim())) sup+=span.text.trim().replaceAll("−","-");
    else {flush();source+=span.text;}
  }
  flush();
  return source.replace(/^Ví\s*dụ\s*\d+\./u,"").replace(/\s+/gu,"");
}

export function classifyFractions(rows,registry) {
  const tex=readFileSync(join(root,SOURCE_RELATIVE_PATH),"utf8"),native=buildPilotTopic(parseLatexDocument(tex));
  return rows.map((row)=>{
    let classification="SOURCE_AMBIGUOUS",reason="PDF layout/grouping not proven by independent structured evidence; extractor replay alone is not fidelity proof";
    const correction=registry.corrections.find((entry)=>entry.recordId===row.recordId);
    const region=row.evidence.regions.find((entry)=>entry.role===(row.flag.field==="prompt"?"statement":"solution"));
    const nativeRecord=native.examples[row.code]?.find((entry)=>entry.id===row.recordId);
    let sourceKey=null;
    if(!row.exactMapping){classification="RUNTIME_MAPPING_AMBIGUOUS";reason="Historical ID no longer identifies exactly one learner record; do not substitute a same-position example";}
    else if(correction){classification="CONFIRMED_CONVERSION_ERROR";reason=correction.reason;}
    else if(row.sourceHash==="2EBC6F3ABB4558E84237FC2C45DBBC20353B0A6C435E193D6B4A264A17433CA0" && row.code==="6.1" && [7,8,9,10].includes(row.number) && row.flag.field==="answer") {
      classification="CONFIRMED_CONVERSION_ERROR";reason="Agent compared original pp.87–88: disconnected quotient or fractional exponent. Excluded: complete statement/solution group or supported full check not prepared in this batch.";
    }
    else if(nativeRecord && row.flag.field==="prompt" && nativeRecord.prompt===row.current && digest(readFileSync(join(root,row.sourceFile)))===row.sourceHash){
      classification="ALREADY_CORRECT";reason="Native TeX block/lines and stable ID replay exactly, including inline slash and conditional-event bar; no rewrite needed";
    } else if(region && (sourceKey=sourceInlineKey(region))!==null && sourceKey===canonicalInline(row.current)) {
      classification="ALREADY_CORRECT";reason="Exact inline glyph sequence with geometry-preserved superscripts; no stacked bar/radical/layout guess; fidelity only, not a mathematical approval";
    }
    // All audit facets stay on the old canonical entity/reference. No second
    // queue, synthetic source identity or positional write target is created.
    return {...row,classification,reason,sourceKey, correctionId:correction?.id??null,eligible:Boolean(correction),
      originalSourceExpression:region?.rawText??null,existingConvertedExpression:row.current,currentRuntimeRepresentation:row.current,
      sourceConditions:{interpretation:correction?"Source-printed conditions retained in complete correction group; supported domains checked separately":"Not inferred; retain complete source statement/solution context",
        contexts:row.evidence.regions.map(({role,page,rawText})=>({role,page,text:rawText})),runtimeStatement:row.record?.prompt??null},
      nativeEvidence:nativeRecord?{file:SOURCE_RELATIVE_PATH,sha256:digest(tex),lines:row.record.sourceLines,raw:tex.split(/\r?\n/u).slice(row.record.sourceLines[0]-1,row.record.sourceLines[1]).join("\n")}:null};
  });
}

if (process.argv[1]?.endsWith("fraction-audit.mjs")) {
  mkdirSync(auditDirectory, { recursive:true });
  recoverV55();
  const rows = collectFractionRows(), evidence = extractFractionEvidence(rows);
  const report = { queue: ".audit/math-content-v5-checkpoint.json#textIssues", newQueueCreated: false,
    rows: rows.map((row) => ({ ...row, evidence: evidence.find((entry) => entry.reference === row.reference) })) };
  writeFileSync(join(auditDirectory, "fraction-evidence-v5.6.json"), JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({total:rows.length,exactRuntime:rows.filter((row)=>row.exactMapping).length,exactSource:evidence.filter((entry)=>entry.locator==="section-and-original-example-number").length}));
}
