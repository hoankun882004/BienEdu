/**
 * pdf-import/document-registry.mjs
 *
 * Tạo / cập nhật document-mappings.js và knowledge-pdf-mappings.js
 * dựa trên metadata thu thập được từ PDF mới.
 *
 * Chức năng:
 *  - ensureDocumentMapping(): Thêm entry vào document-mappings.js nếu chưa có
 *  - ensureSubtopicMapping(): Thêm vùng (region) subtopic vào knowledge-pdf-mappings.js
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, fileURLToPath } from "node:url";
import { join } from "node:path";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** Tính SHA-256 của file */
export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
}

/**
 * Đọc file JS module export dưới dạng raw text và chèn entry mới vào mảng.
 * Chỉ thêm nếu chưa có documentId.
 */
export function ensureDocumentMapping(documentId, filePath, sha256, pageCount, topicIds) {
  const mappingFile = join(PROJECT_ROOT, "assets", "js", "data", "document-mappings.js");
  const content = readFileSync(mappingFile, "utf8");

  if (content.includes(`"${documentId}"`)) {
    console.log(`  [skip] document-mappings.js đã có '${documentId}'.`);
    return;
  }

  const entry = `  {
    "documentId": "${documentId}",
    "sourceSha256": "${sha256}",
    "pageCount": ${pageCount},
    "sourceKind": "pdf",
    "mimeType": "application/pdf",
    "availabilityStatus": "available",
    "verification": { "status": "machine-source-checked" },
    "exercisePages": {}
  },`;

  // Chèn vào sau dấu [ mở mảng documentMappings
  const updated = content.replace(
    /(export const documentMappings\s*=\s*\[)/,
    `$1\n${entry}`
  );

  if (updated === content) {
    console.warn(`  [warn] Không tìm thấy vị trí chèn trong document-mappings.js — thêm thủ công.`);
    return;
  }

  writeFileSync(mappingFile, updated, "utf8");
  console.log(`  [ok] Đã thêm '${documentId}' vào document-mappings.js.`);
}

/**
 * Thêm vùng subtopic vào knowledge-pdf-mappings.js dựa trên anchor đơn giản.
 * @param {string} code             Ví dụ: "15.1"
 * @param {string} documentId
 * @param {number} startPage        Trang PDF bắt đầu (1-indexed)
 * @param {number} endPage          Trang PDF kết thúc (1-indexed)
 * @param {string} topicId          Ví dụ: "CD15"
 */
export function ensureSubtopicMapping(code, documentId, startPage, endPage, topicId) {
  const mappingFile = join(PROJECT_ROOT, "assets", "js", "data", "knowledge-pdf-mappings.js");
  const content = readFileSync(mappingFile, "utf8");

  if (content.includes(`"${code}":`)) {
    console.log(`  [skip] knowledge-pdf-mappings.js đã có subtopic '${code}'.`);
    return;
  }

  const PAGE_CROP = { x: 0.055, top: 0.055, width: 0.89, bottom: 0.965 };
  const regions = [];
  for (let p = startPage; p <= endPage; p++) {
    const isFirst = p === startPage;
    const isLast = p === endPage;
    regions.push({
      id: `${code}-pdf-${p - startPage + 1}`,
      x: PAGE_CROP.x,
      y: isFirst ? 0.11 : PAGE_CROP.top,
      width: PAGE_CROP.width,
      height: isLast ? 0.6 : PAGE_CROP.bottom - PAGE_CROP.top,
      page: p,
      isBoundaryPage: isFirst || isLast,
    });
  }

  const entry = `  "${code}": {
    "topicId": "${topicId}",
    "documentId": "${documentId}",
    "startPage": ${startPage},
    "endPage": ${endPage},
    "regions": ${JSON.stringify(regions, null, 4).replace(/^/gm, "    ").trimStart()}
  },`;

  // Chèn sau dấu mở object export const knowledgePdfMappings = {
  const updated = content.replace(
    /(export const knowledgePdfMappings\s*=\s*\{)/,
    `$1\n${entry}`
  );

  if (updated === content) {
    console.warn(`  [warn] Không tìm thấy vị trí chèn trong knowledge-pdf-mappings.js — thêm thủ công.`);
    return;
  }

  writeFileSync(mappingFile, updated, "utf8");
  console.log(`  [ok] Đã thêm subtopic '${code}' vào knowledge-pdf-mappings.js.`);
}

