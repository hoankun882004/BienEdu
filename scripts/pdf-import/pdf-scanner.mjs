/**
 * pdf-import/pdf-scanner.mjs
 *
 * Quét thư mục PDF đầu vào, phát hiện document ID, tính SHA-256,
 * và trả về danh sách file cần import với metadata đầy đủ.
 *
 * Sử dụng: node scripts/pdf-import/pdf-scanner.mjs [--dir PATH]
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { detectDocument } from "./file-catalog.mjs";

/**
 * Tính SHA-256 của file
 * @param {string} filePath
 * @returns {string} hex uppercase
 */
function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
}

/**
 * Lấy pageCount từ PDF bằng cách đọc binary header đơn giản.
 * Sử dụng regex tìm /Count trong xref table — đủ cho môi trường không có pdfjs.
 * @param {string} filePath
 * @returns {number}
 */
function readPdfPageCount(filePath) {
  try {
    // Đọc cuối file (xref + trailer thường nằm cuối)
    const stats = statSync(filePath);
    const tailSize = Math.min(4096, stats.size);
    const buffer = Buffer.alloc(tailSize);
    const fd = readFileSync(filePath);
    const tail = fd.slice(-tailSize).toString("latin1");
    // /Count N trong trailer dict
    const match = tail.match(/\/Count\s+(\d+)/g);
    if (match) {
      const counts = match.map((m) => parseInt(m.replace("/Count", "").trim(), 10));
      return Math.max(...counts);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Quét thư mục PDF và trả về danh sách file được nhận dạng.
 * @param {string} directory Đường dẫn thư mục PDF
 * @returns {Array<{
 *   filePath: string,
 *   fileName: string,
 *   ext: string,
 *   sha256: string,
 *   pageCount: number,
 *   documentId: string | null,
 *   topicIds: string[],
 *   description: string,
 *   isKnown: boolean,
 * }>}
 */
export function scanPdfDirectory(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => ({
      filePath: join(directory, e.name),
      fileName: e.name,
      ext: extname(e.name).toLowerCase(),
    }))
    .filter((f) => [".pdf", ".tex"].includes(f.ext));

  return entries.map((file) => {
    const catalogEntry = detectDocument(file.fileName);
    const sha256 = sha256File(file.filePath);
    const pageCount = file.ext === ".pdf" ? readPdfPageCount(file.filePath) : 0;

    return {
      ...file,
      sha256,
      pageCount,
      documentId: catalogEntry?.documentId ?? null,
      topicIds: catalogEntry?.topicIds ?? [],
      description: catalogEntry?.description ?? "(Chưa nhận dạng)",
      isKnown: Boolean(catalogEntry),
    };
  });
}

// --- CLI tự chạy ---
if (import.meta.url === `file:///${process.argv[1].replaceAll("\\", "/")}`) {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const directory =
    dirIndex >= 0 ? args[dirIndex + 1] : "C:\\NINHHN\\BienEDU\\TaiLieu";

  console.log(`\n📂 Quét thư mục: ${directory}\n`);
  const files = scanPdfDirectory(directory);

  for (const file of files) {
    const icon = file.isKnown ? "✅" : "❓";
    console.log(`${icon} ${file.fileName}`);
    console.log(`   Document ID : ${file.documentId ?? "(chưa xác định)"}`);
    console.log(`   Topics      : ${file.topicIds.join(", ") || "—"}`);
    console.log(`   SHA-256     : ${file.sha256}`);
    console.log(`   Trang       : ${file.pageCount || "N/A"}`);
    console.log(`   Mô tả       : ${file.description}`);
    console.log();
  }

  const unknown = files.filter((f) => !f.isKnown);
  if (unknown.length) {
    console.log(
      `⚠️  ${unknown.length} file chưa nhận dạng — thêm vào IMPORT_CATALOG trong file-catalog.mjs.\n`
    );
  }

  console.log(`📊 Tổng: ${files.length} file (${files.filter((f) => f.isKnown).length} đã nhận dạng)\n`);
}

