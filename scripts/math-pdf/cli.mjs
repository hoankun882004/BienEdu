#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import { approvedDirectory, catalogSummary, getSubtopic, projectRoot, reviewDirectory, workDirectory } from "./source-catalog.mjs";
import { assignSections, extractLatex, normalizeExtraction, renderReviewMarkdown, validateRecord } from "./normalize.mjs";
import { extractWithMarker, markerStatus } from "./providers/marker.mjs";
import { extractWithMathpix, mathpixStatus } from "./providers/mathpix.mjs";

function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else { options[key] = next; index += 1; }
  }
  return { command, options };
}

function requireOption(options, key) {
  if (!options[key]) throw new Error(`Thiếu --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.`);
  return options[key];
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(".", "-");
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function reviewPaths(recordOrCode, documentId = null) {
  const code = typeof recordOrCode === "string" ? recordOrCode : recordOrCode.subtopic.code;
  const doc = documentId ?? recordOrCode.source.documentId;
  const base = join(reviewDirectory, doc, code);
  return { json: `${base}.json`, markdown: `${base}.md` };
}

function readReview(code) {
  const subtopic = getSubtopic(code);
  const paths = reviewPaths(code, subtopic.document.documentId);
  if (!existsSync(paths.json)) throw new Error(`Chưa có bản review cho ${code}: ${relative(projectRoot, paths.json)}`);
  return { record: JSON.parse(readFileSync(paths.json, "utf8")), paths, subtopic };
}

function saveReview(record, { replaceReview = false } = {}) {
  const paths = reviewPaths(record);
  if (existsSync(paths.json)) {
    const current = JSON.parse(readFileSync(paths.json, "utf8"));
    if (current.verification?.status === "verified") throw new Error(`Không ghi đè dữ liệu đã xác minh: ${relative(projectRoot, paths.json)}`);
    if (!replaceReview) throw new Error(`Bản review đã tồn tại. Dùng --replace-review chỉ khi bản hiện tại chưa xác minh: ${relative(projectRoot, paths.json)}`);
  }
  const serializable = structuredClone(record);
  for (const asset of serializable.assets ?? []) {
    if (!asset.data) continue;
    const assetPath = join(dirname(paths.json), asset.fileName);
    mkdirSync(dirname(assetPath), { recursive: true });
    writeFileSync(assetPath, Buffer.from(asset.data, "base64"));
    delete asset.data;
  }
  writeJson(paths.json, serializable);
  writeFileSync(paths.markdown, record.markdown, "utf8");
  return paths;
}

async function extract(options) {
  const code = requireOption(options, "subtopic");
  const provider = options.provider ?? "marker";
  if (!new Set(["marker", "mathpix"]).has(provider)) throw new Error(`Provider không hỗ trợ: ${provider}`);
  const subtopic = getSubtopic(code);
  const rawDirectory = join(workDirectory, "runs", `${timestamp()}-${provider}-${code.replace(".", "-")}`);
  const common = {
    projectRoot,
    sourcePath: subtopic.document.sourcePath,
    outputDirectory: rawDirectory,
    startPage: subtopic.mapping.startPage,
    endPage: subtopic.mapping.endPage
  };
  const extraction = provider === "marker"
    ? extractWithMarker({ ...common, forceOcr: Boolean(options.forceOcr), disableOcr: Boolean(options.disableOcr), debug: Boolean(options.debug) })
    : await extractWithMathpix(common);
  const record = normalizeExtraction({ extraction, subtopic });
  const paths = saveReview(record, { replaceReview: Boolean(options.replaceReview) });
  writeJson(join(rawDirectory, "run.json"), {
    provider,
    subtopic: code,
    source: relative(projectRoot, subtopic.document.sourcePath),
    sourceSha256: subtopic.document.sourceSha256,
    pages: record.source.pages,
    reviewJson: relative(projectRoot, paths.json),
    reviewMarkdown: relative(projectRoot, paths.markdown),
    flags: record.flags
  });
  console.log(JSON.stringify({ ok: true, provider, subtopic: code, rawDirectory: relative(projectRoot, rawDirectory), review: relative(projectRoot, paths.json), blocks: record.blocks.length, flags: record.flags }, null, 2));
}

function renormalize(options) {
  const code = requireOption(options, "subtopic");
  const rawJson = requireOption(options, "rawJson");
  const subtopic = getSubtopic(code);
  const extraction = {
    provider: options.provider ?? "marker",
    raw: JSON.parse(readFileSync(rawJson, "utf8")),
    startedAt: null,
    finishedAt: new Date().toISOString(),
    command: `renormalize ${relative(projectRoot, rawJson)}`
  };
  const record = normalizeExtraction({ extraction, subtopic });
  const paths = saveReview(record, { replaceReview: Boolean(options.replaceReview) });
  console.log(JSON.stringify({ ok: true, subtopic: code, review: relative(projectRoot, paths.json), blocks: record.blocks.length, flags: record.flags }, null, 2));
}

function applyCorrections(options) {
  const code = requireOption(options, "subtopic");
  const correctionPath = requireOption(options, "corrections");
  const { record, paths } = readReview(code);
  if (record.verification?.status === "verified") throw new Error("Không sửa bản đã xác minh.");
  const patch = JSON.parse(readFileSync(correctionPath, "utf8"));
  if (patch.subtopic !== code || patch.sourceSha256 !== record.source.sha256) throw new Error("Correction file không khớp subtopic/SHA-256 nguồn.");
  const applied = [];
  const resolvedFlags = [];
  for (const correction of patch.corrections ?? []) {
    const block = record.blocks.find((candidate) => candidate.id === correction.blockId);
    if (!block) throw new Error(`Không tìm thấy block ${correction.blockId}.`);
    if (block.markdown !== correction.from) throw new Error(`Nội dung block ${correction.blockId} đã thay đổi; không áp correction mù.`);
    block.markdown = correction.to;
    block.latex = extractLatex(correction.to);
    const resolved = record.flags.filter((flag) => flag.blockId === block.id);
    resolvedFlags.push(...resolved.map((flag) => ({ ...flag, resolvedAt: new Date().toISOString(), resolution: correction.reason })));
    record.flags = record.flags.filter((flag) => flag.blockId !== block.id);
    applied.push({ ...correction, appliedAt: new Date().toISOString(), reviewer: patch.reviewer });
  }
  record.corrections = [...(record.corrections ?? []), ...applied];
  record.resolvedFlags = [...(record.resolvedFlags ?? []), ...resolvedFlags];
  record.headings = assignSections(record.blocks);
  record.sections = {
    knowledge: record.blocks.filter((block) => block.section === "knowledge").map((block) => block.id),
    workedExamples: record.blocks.filter((block) => block.section === "worked_examples").map((block) => block.id),
    practice: record.blocks.filter((block) => block.section === "practice").map((block) => block.id)
  };
  record.markdown = renderReviewMarkdown(record);
  writeJson(paths.json, record);
  writeFileSync(paths.markdown, record.markdown, "utf8");
  console.log(JSON.stringify({ ok: true, subtopic: code, applied: applied.length, remainingFlags: record.flags }, null, 2));
}

function reindex(options) {
  const code = requireOption(options, "subtopic");
  const { record, paths } = readReview(code);
  if (record.verification?.status === "verified") throw new Error("Không reindex bản đã xác minh.");
  record.headings = assignSections(record.blocks);
  record.sections = {
    knowledge: record.blocks.filter((block) => block.section === "knowledge").map((block) => block.id),
    workedExamples: record.blocks.filter((block) => block.section === "worked_examples").map((block) => block.id),
    practice: record.blocks.filter((block) => block.section === "practice").map((block) => block.id)
  };
  record.markdown = renderReviewMarkdown(record);
  writeJson(paths.json, record);
  writeFileSync(paths.markdown, record.markdown, "utf8");
  console.log(JSON.stringify({ ok: true, subtopic: code, headings: record.headings, sections: record.sections }, null, 2));
}

function validate(options) {
  const code = requireOption(options, "subtopic");
  const { record, paths } = readReview(code);
  const result = validateRecord(record);
  console.log(JSON.stringify({ subtopic: code, file: relative(projectRoot, paths.json), verification: record.verification, ...result, warnings: record.flags.filter((flag) => flag.severity === "warning") }, null, 2));
  if (!result.valid) process.exitCode = 1;
}

function approve(options) {
  const code = requireOption(options, "subtopic");
  const reviewer = requireOption(options, "reviewer");
  if (!options.sourceVerified || !options.formulasVerified || !options.boundariesVerified) {
    throw new Error("Approve cần đủ --source-verified --formulas-verified --boundaries-verified sau khi đối chiếu PDF.");
  }
  const { record, paths, subtopic } = readReview(code);
  if (record.source.sha256 !== subtopic.document.sourceSha256) throw new Error("SHA-256 nguồn đã thay đổi; phải trích xuất và review lại.");
  const validation = validateRecord(record);
  if (!validation.valid) throw new Error(`Không thể approve khi còn lỗi: ${JSON.stringify(validation.issues)}`);
  record.verification = {
    status: "verified",
    reviewer,
    reviewedAt: new Date().toISOString(),
    sourceHash: record.source.sha256,
    formulasChecked: true,
    boundariesChecked: true,
    notes: options.notes ? [String(options.notes)] : []
  };
  record.markdown = record.markdown.replace(/verification: needs-source-review/, "verification: verified");
  writeJson(paths.json, record);
  writeFileSync(paths.markdown, record.markdown, "utf8");
  console.log(JSON.stringify({ ok: true, subtopic: code, verification: record.verification }, null, 2));
}

function walkJson(directory, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walkJson(path, output);
    else if (entry.name.endsWith(".json")) output.push(path);
  }
  return output;
}

function rebuildFrontendIndex() {
  const records = {};
  for (const path of walkJson(approvedDirectory)) {
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.verification?.status !== "verified") continue;
    for (const asset of record.assets ?? []) {
      const webPath = relative(projectRoot, join(dirname(path), asset.fileName)).replaceAll("\\", "/");
      record.markdown = record.markdown.replaceAll(`(${asset.fileName})`, `(${webPath})`);
      asset.webPath = webPath;
    }
    const existing = records[record.subtopic.code];
    if (!existing || String(existing.verification.reviewedAt) < String(record.verification.reviewedAt)) records[record.subtopic.code] = record;
  }
  const modulePath = join(projectRoot, "assets", "js", "data", "approved-math-content.js");
  writeFileSync(modulePath, `// Generated by scripts/math-pdf/cli.mjs publish. Do not edit by hand.\nconst records = ${JSON.stringify(records, null, 2)};\n\nexport const approvedMathContent = Object.freeze(records);\nexport function getApprovedMathContent(code) { return approvedMathContent[code] ?? null; }\n`, "utf8");
  return modulePath;
}

function publish(options) {
  const code = requireOption(options, "subtopic");
  const { record, paths } = readReview(code);
  if (record.verification?.status !== "verified") throw new Error("Chỉ được publish bản đã source-verified.");
  const validation = validateRecord(record);
  if (!validation.valid) throw new Error(`Bản verified không hợp lệ: ${JSON.stringify(validation.issues)}`);
  const recordHash = createHash("sha256").update(readFileSync(paths.json)).digest("hex").slice(0, 16);
  const versionDirectory = join(approvedDirectory, record.source.documentId, code, recordHash);
  const jsonTarget = join(versionDirectory, `${code}.json`);
  const markdownTarget = join(versionDirectory, `${code}.md`);
  if (!existsSync(jsonTarget)) {
    mkdirSync(versionDirectory, { recursive: true });
    copyFileSync(paths.json, jsonTarget);
    copyFileSync(paths.markdown, markdownTarget);
    for (const asset of record.assets ?? []) {
      const sourceAsset = join(dirname(paths.json), asset.fileName);
      const targetAsset = join(versionDirectory, asset.fileName);
      if (existsSync(sourceAsset) && !existsSync(targetAsset)) {
        mkdirSync(dirname(targetAsset), { recursive: true });
        copyFileSync(sourceAsset, targetAsset);
      }
    }
  }
  const modulePath = rebuildFrontendIndex();
  console.log(JSON.stringify({ ok: true, subtopic: code, immutableVersion: recordHash, approvedJson: relative(projectRoot, jsonTarget), frontendIndex: relative(projectRoot, modulePath) }, null, 2));
}

function doctor() {
  const summary = catalogSummary();
  const marker = markerStatus(projectRoot);
  const mathpix = mathpixStatus();
  console.log(JSON.stringify({ ...summary, providers: { marker, mathpix }, policy: { localDefault: "marker", browserOcr: false, frontendApiKeys: false, verifiedOverwrite: false } }, null, 2));
  if (!summary.documents.every((document) => document.sourceHashMatches)) process.exitCode = 1;
}

function help() {
  console.log(`BienEdu Math PDF pipeline\n\nCommands:\n  doctor\n  extract --subtopic 20.2 [--provider marker|mathpix] [--force-ocr|--disable-ocr] [--replace-review]\n  renormalize --subtopic 20.2 --raw-json PATH --replace-review\n  correct --subtopic 20.2 --corrections PATH\n  validate --subtopic 20.2\n  approve --subtopic 20.2 --reviewer NAME --source-verified --formulas-verified --boundaries-verified [--notes TEXT]\n  publish --subtopic 20.2\n`);
}

const { command, options } = parseArgs(process.argv.slice(2));
try {
  if (command === "doctor") doctor();
  else if (command === "extract") await extract(options);
  else if (command === "renormalize") renormalize(options);
  else if (command === "correct") applyCorrections(options);
  else if (command === "reindex") reindex(options);
  else if (command === "validate") validate(options);
  else if (command === "approve") approve(options);
  else if (command === "publish") publish(options);
  else help();
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}
