/**
 * pdf-import/file-catalog.mjs
 *
 * Catalog cứng ánh xạ tên file PDF → document ID và danh sách topic codes.
 * Thêm entry mới vào IMPORT_CATALOG khi có file PDF mới.
 *
 * Schema mỗi entry:
 *   documentId   — ID document sẽ được tạo/dùng trong knowledge-pdf-mappings.js
 *   topicIds     — Mảng topic ID tham chiếu curriculum.js (vd: ["CD17","CD18"])
 *   description  — Mô tả tiếng Việt cho log / UI
 *   matchPatterns — Mảng regex pattern khớp với tên file (lowercase, không dấu)
 */

export const IMPORT_CATALOG = [
  {
    documentId: "cd01-cd07-functions",
    topicIds: ["CD01", "CD02", "CD03", "CD04", "CD05", "CD06", "CD07"],
    description: "Hàm số và Đạo hàm (CD01–CD07)",
    matchPatterns: [/ham-so/i, /dao-ham/i, /cd01/i, /function/i],
  },
  {
    documentId: "cd08-cd11-exponential-logarithm",
    topicIds: ["CD08", "CD09", "CD10", "CD11"],
    description: "Mũ và Lôgarit (CD08–CD11)",
    matchPatterns: [/mu-logarit/i, /loga/i, /cd08/i, /expo/i],
  },
  {
    documentId: "cd12-cd14-calculus",
    topicIds: ["CD12", "CD13", "CD14"],
    description: "Nguyên hàm và Tích phân (CD12–CD14)",
    matchPatterns: [/nguyen-ham/i, /tich-phan/i, /cd12/i, /calcul/i],
  },
  {
    documentId: "cd15-cd16-trigonometry",
    topicIds: ["CD15", "CD16"],
    description: "Lượng giác (CD15–CD16)",
    matchPatterns: [/luong-giac/i, /cd15/i, /trigo/i],
  },
  {
    documentId: "cd17-cd19-sequences",
    topicIds: ["CD17", "CD18", "CD19"],
    description: "Dãy số và Cấp số (CD17–CD19)",
    matchPatterns: [/day-so/i, /cap-so/i, /cd17/i, /sequen/i],
  },
  {
    documentId: "cd20-cd21-combinatorics",
    topicIds: ["CD20", "CD21"],
    description: "Tổ hợp – Xác suất (CD20–CD21)",
    matchPatterns: [/to-hop/i, /xac-suat/i, /cd20/i, /combin/i],
  },
  {
    documentId: "cd28-cd33-oxyz",
    topicIds: ["CD28", "CD29", "CD30", "CD31", "CD32", "CD33"],
    description: "Hệ toạ độ Oxyz và Vectơ (CD28–CD33)",
    matchPatterns: [/oxyz/i, /vecto/i, /cd28/i, /vector/i],
  },
];

/**
 * Nhận tên file, trả về entry catalog khớp hoặc null.
 * @param {string} fileName
 * @returns {{ documentId: string, topicIds: string[], description: string } | null}
 */
export function detectDocument(fileName) {
  const lower = fileName.toLowerCase().replace(/[_\s]/g, "-");
  for (const entry of IMPORT_CATALOG) {
    if (entry.matchPatterns.some((pattern) => pattern.test(lower))) {
      return entry;
    }
  }
  return null;
}

