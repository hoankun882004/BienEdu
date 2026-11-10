/**
 * pdf-import/batch-import.mjs
 *
 * Pipeline AI-assisted batch import cho BienEdu Math PDF.
 *
 * Workflow mỗi file:
 *  1. Scan thư mục TaiLieu → phát hiện documentId, topics
 *  2. Tạo / cập nhật document-mappings.js (nếu cần)
 *  3. Với mỗi subtopic chưa có: gọi marker extract → normalize → lưu review
 *  4. Xuất báo cáo import-report.json
 *
 * Sử dụng:
 *   node scripts/pdf-import/batch-import.mjs [--dir PATH] [--dry-run] [--topic CD15]
 *
 * Options:
 *   --dir PATH       Thư mục chứa PDF (mặc định: C:\NINHHN\BienEDU\TaiLieu)
 *   --dry-run        Chỉ in plan, không thực thi
 *   --topic CD15     Chỉ import topic cụ thể
 *   --provider       marker | mathpix (mặc định: marker)
 *   --replace-review Cho phép thay review đã có (nếu chưa verified)
 *   --force-ocr      Bật OCR trong marker
 *   --disable-ocr    Tắt OCR trong marker
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { resolve, fileURLToPath } from "node:url";

import { scanPdfDirectory } from "./pdf-scanner.mjs";
import { ensureDocumentMapping } from "./document-registry.mjs";
import { normalizeExtraction, assignSections, renderReviewMarkdown, validateRecord } from "../math-pdf/normalize.mjs";
import { extractWithMarker } from "../math-pdf/providers/marker.mjs";
import { projectRoot, reviewDirectory, getSubtopic, uniqueDocuments } from "../math-pdf/source-catalog.mjs";
import { curriculumTopics } from "../../assets/js/data/curriculum.js";

// --- Helpers ---

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

function reviewPath(code, documentId) {
  const base = join(reviewDirectory, documentId, code);
  return { json: `${base}.json`, markdown: `${base}.md` };
}

function writeJson(path, value) {
  mkdirSync(require("node:path").dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** Timestamp không có ký tự đặc biệt (BUG-03 đã fix) */
function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

// --- Lấy danh sách subtopics cần import cho một topicId ---

function getTopicSubtopics(topicId) {
  const topic = curriculumTopics.find((t) => t.id === topicId);
  if (!topic) return [];
  return topic.exerciseTypes.map((ex) => ex.code);
}

// --- Import một subtopic ---

async function importSubtopic({ code, pdfPath, documentId, provider, options, dryRun }) {
  // Kiểm tra đã có review chưa
  let subtopic;
  try {
    subtopic = getSubtopic(code);
  } catch {
    return { code, status: "skip-not-mapped", reason: "Chưa có vùng PDF mapping trong knowledge-pdf-mappings.js" };
  }

  const paths = reviewPath(code, documentId);
  if (existsSync(paths.json) && !options.replaceReview) {
    const existing = JSON.parse(readFileSync(paths.json, "utf8"));
    if (existing.verification?.status === "verified") {
      return { code, status: "skip-verified", reason: "Đã verified, bỏ qua." };
    }
    return { code, status: "skip-exists", reason: "Review đã tồn tại. Dùng --replace-review để ghi đè." };
  }

  if (dryRun) {
    return { code, status: "dry-run", provider, pdfPath };
  }

  try {
    const workDir = join(projectRoot, ".content-work", "runs", `${timestamp()}-${provider}-${code.replace(".", "-")}`);
    const extraction = extractWithMarker({
      projectRoot,
      sourcePath: pdfPath,
      outputDirectory: workDir,
      startPage: subtopic.mapping.startPage,
      endPage: subtopic.mapping.endPage,
      forceOcr: Boolean(options.forceOcr),
      disableOcr: Boolean(options.disableOcr),
    });

    const record = normalizeExtraction({ extraction, subtopic });
    const paths2 = reviewPath(code, documentId);
    mkdirSync(require("node:path").dirname(paths2.json), { recursive: true });
    writeFileSync(paths2.json, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    writeFileSync(paths2.markdown, record.markdown, "utf8");

    const validation = validateRecord(record);
    return {
      code,
      status: validation.valid ? "ok" : "ok-with-flags",
      blocks: record.blocks.length,
      flags: record.flags.length,
      errors: record.flags.filter((f) => f.severity === "error").length,
      reviewJson: relative(projectRoot, paths2.json),
    };
  } catch (err) {
    return { code, status: "error", message: err.message };
  }
}

// --- Main ---

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const sourceDir = opts.dir ?? "C:\\NINHHN\\BienEDU\\TaiLieu";
  const dryRun = Boolean(opts.dryRun);
  const filterTopic = opts.topic ?? null;
  const provider = opts.provider ?? "marker";

  console.log("\n🚀 BienEdu PDF Batch Import");
  console.log(`   Source dir : ${sourceDir}`);
  console.log(`   Provider   : ${provider}`);
  console.log(`   Dry run    : ${dryRun}`);
  if (filterTopic) console.log(`   Filter     : ${filterTopic}`);
  console.log();

  // Bước 1: Scan files
  const files = scanPdfDirectory(sourceDir);
  const knownFiles = files.filter((f) => f.isKnown && f.ext === ".pdf");
  const unknownFiles = files.filter((f) => !f.isKnown);

  if (unknownFiles.length) {
    console.log(`⚠️  ${unknownFiles.length} file chưa nhận dạng (cần thêm vào file-catalog.mjs):`);
    for (const f of unknownFiles) console.log(`   - ${f.fileName}`);
    console.log();
  }

  if (!knownFiles.length) {
    console.log("❌ Không có file PDF nào được nhận dạng. Kiểm tra file-catalog.mjs.");
    process.exitCode = 1;
    return;
  }

  // Bước 2: Đảm bảo document-mappings.js có entry
  if (!dryRun) {
    for (const file of knownFiles) {
      ensureDocumentMapping(file.documentId, file.filePath, file.sha256, file.pageCount, file.topicIds);
    }
  }

  // Bước 3: Import từng subtopic
  const report = { importedAt: new Date().toISOString(), results: [] };

  for (const file of knownFiles) {
    const topicsToProcess = filterTopic
      ? file.topicIds.filter((t) => t === filterTopic)
      : file.topicIds;

    if (!topicsToProcess.length) continue;

    console.log(`\n📄 ${file.fileName} → ${file.documentId}`);
    console.log(`   Topics: ${topicsToProcess.join(", ")}`);

    for (const topicId of topicsToProcess) {
      const codes = getTopicSubtopics(topicId);
      for (const code of codes) {
        process.stdout.write(`   ${code} ... `);
        const result = await importSubtopic({
          code,
          pdfPath: file.filePath,
          documentId: file.documentId,
          provider,
          options: opts,
          dryRun,
        });
        const icon =
          result.status === "ok" ? "✅"
          : result.status === "ok-with-flags" ? "⚠️ "
          : result.status.startsWith("skip") ? "⏭️ "
          : result.status === "dry-run" ? "🔍"
          : "❌";
        console.log(`${icon} ${result.status}${result.reason ? ` (${result.reason})` : ""}${result.errors ? ` [${result.errors} lỗi]` : ""}`);
        report.results.push({ file: file.fileName, ...result });
      }
    }
  }

  // Bước 4: Xuất báo cáo
  const reportPath = join(projectRoot, ".content-work", "import-report.json");
  mkdirSync(join(projectRoot, ".content-work"), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const ok = report.results.filter((r) => r.status.startsWith("ok")).length;
  const skipped = report.results.filter((r) => r.status.startsWith("skip")).length;
  const errors = report.results.filter((r) => r.status === "error").length;

  console.log("\n──────────────────────────────────────");
  console.log(`✅ OK: ${ok}  ⏭️  Bỏ qua: ${skipped}  ❌ Lỗi: ${errors}`);
  console.log(`📋 Báo cáo: ${relative(projectRoot, reportPath)}`);
  if (!dryRun && ok > 0) {
    console.log("\n💡 Bước tiếp theo:");
    console.log("   1. Review từng file trong content/review/");
    console.log("   2. npm run content:math:validate -- --subtopic CODE");
    console.log("   3. npm run content:math:approve  -- --subtopic CODE --reviewer TEN --source-verified --formulas-verified --boundaries-verified");
    console.log("   4. npm run content:math:publish  -- --subtopic CODE");
  }
  console.log();
}

main().catch((err) => {
  console.error(err.stack ?? err.message);
  process.exitCode = 1;
});

