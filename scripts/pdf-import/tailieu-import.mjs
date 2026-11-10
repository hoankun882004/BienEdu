/**
 * pdf-import/tailieu-import.mjs
 *
 * Script import chuyên dụng cho thư mục C:\NINHHN\BienEDU\TaiLieu.
 * Nhận diện và map đúng từng file PDF → document ID → subtopics theo
 * schema hiện tại của dự án BienEdu.
 *
 * File này là "entry point" chính cho workflow AI import từ TaiLieu.
 *
 * Sử dụng:
 *   node scripts/pdf-import/tailieu-import.mjs
 *   node scripts/pdf-import/tailieu-import.mjs --dry-run
 *   node scripts/pdf-import/tailieu-import.mjs --topic CD15
 *   node scripts/pdf-import/tailieu-import.mjs --topic CD12 --replace-review
 *   node scripts/pdf-import/tailieu-import.mjs --topic CD28 --force-ocr
 */

import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { scanPdfDirectory } from "./pdf-scanner.mjs";
import { detectDocument } from "./file-catalog.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TAILIEU_DIR = "C:\\NINHHN\\BienEDU\\TaiLieu";

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) opts[key] = true;
    else { opts[key] = next; i++; }
  }
  return opts;
}

function runNode(scriptPath, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [scriptPath, ...extraArgs],
    { cwd: PROJECT_ROOT, encoding: "utf8", stdio: "inherit" }
  );
  return result.status ?? 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(opts.dryRun);
  const topic = opts.topic ?? null;

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   BienEdu – TaiLieu AI Import Pipeline      ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`📂 Nguồn: ${TAILIEU_DIR}`);
  if (topic) console.log(`🎯 Filter topic: ${topic}`);
  if (dryRun) console.log("🔍 DRY RUN – không thực thi thay đổi");
  console.log();

  // 1. Scan và hiển thị tất cả file
  const files = scanPdfDirectory(TAILIEU_DIR);
  console.log(`📋 Tìm thấy ${files.length} file:`);
  for (const f of files) {
    const icon = f.isKnown ? "✅" : "❓";
    const topics = f.topicIds.length ? ` → ${f.topicIds.join(", ")}` : " → (chưa nhận dạng)";
    console.log(`  ${icon} ${f.fileName}${topics}`);
  }
  console.log();

  // 2. Lọc theo topic nếu có
  const toProcess = files.filter((f) => {
    if (!f.isKnown || f.ext !== ".pdf") return false;
    if (topic) return f.topicIds.includes(topic);
    return true;
  });

  if (!toProcess.length) {
    console.log("⚠️  Không có file nào cần xử lý.\n");
    return;
  }

  // 3. Tạo kế hoạch import
  console.log(`\n🗺️  Kế hoạch import (${toProcess.length} file):`);
  for (const f of toProcess) {
    console.log(`\n  📄 ${f.fileName}`);
    console.log(`     Document ID : ${f.documentId}`);
    console.log(`     Topics      : ${f.topicIds.join(", ")}`);
    console.log(`     SHA-256     : ${f.sha256.slice(0, 16)}...`);
    console.log(`     Trang       : ${f.pageCount || "??"}`);
  }

  if (dryRun) {
    console.log("\n✅ Dry run hoàn tất. Chạy lại không có --dry-run để thực thi.\n");
    return;
  }

  // 4. Chạy batch import
  console.log("\n\n▶ Bắt đầu import...\n");
  const batchScript = join(PROJECT_ROOT, "scripts", "pdf-import", "batch-import.mjs");
  const extraArgs = ["--dir", TAILIEU_DIR];
  if (opts.topic) { extraArgs.push("--topic", opts.topic); }
  if (opts.replaceReview) extraArgs.push("--replace-review");
  if (opts.forceOcr) extraArgs.push("--force-ocr");
  if (opts.disableOcr) extraArgs.push("--disable-ocr");
  if (opts.provider) { extraArgs.push("--provider", opts.provider); }

  const exitCode = runNode(batchScript, extraArgs);
  if (exitCode !== 0) {
    console.error(`\n❌ Batch import thất bại (exit ${exitCode}).`);
    process.exitCode = exitCode;
  }
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exitCode = 1;
});

