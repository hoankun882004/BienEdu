import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const API_ROOT = "https://api.mathpix.com/v3";

function credentials() {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;
  if (!appId || !appKey) throw new Error("Mathpix cần MATHPIX_APP_ID và MATHPIX_APP_KEY trong môi trường server/tooling.");
  return { appId, appKey };
}

function headers() {
  const { appId, appKey } = credentials();
  return { app_id: appId, app_key: appKey };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function mathpixStatus() {
  return { available: Boolean(process.env.MATHPIX_APP_ID && process.env.MATHPIX_APP_KEY), configuredBy: "environment-only" };
}

export async function extractWithMathpix({ sourcePath, outputDirectory, startPage, endPage }) {
  mkdirSync(outputDirectory, { recursive: true });
  const form = new FormData();
  form.set("file", new Blob([await import("node:fs/promises").then(({ readFile }) => readFile(sourcePath))], { type: "application/pdf" }), basename(sourcePath));
  form.set("options_json", JSON.stringify({
    conversion_formats: { md: true, "lines.json": true },
    page_ranges: `${startPage}-${endPage}`,
    include_page_info: true,
    include_line_data: true
  }));
  const upload = await fetch(`${API_ROOT}/pdf`, { method: "POST", headers: headers(), body: form });
  if (!upload.ok) throw new Error(`Mathpix upload thất bại: ${upload.status} ${await upload.text()}`);
  const { pdf_id: pdfId } = await upload.json();
  let status;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(Math.min(1500 + attempt * 250, 5000));
    const response = await fetch(`${API_ROOT}/pdf/${pdfId}`, { headers: headers() });
    if (!response.ok) throw new Error(`Mathpix status thất bại: ${response.status} ${await response.text()}`);
    status = await response.json();
    if (status.status === "completed") break;
    if (status.status === "error") throw new Error(`Mathpix báo lỗi: ${JSON.stringify(status)}`);
  }
  if (status?.status !== "completed") throw new Error(`Mathpix hết thời gian chờ cho job ${pdfId}.`);
  const [markdownResponse, linesResponse] = await Promise.all([
    fetch(`${API_ROOT}/pdf/${pdfId}.md`, { headers: headers() }),
    fetch(`${API_ROOT}/pdf/${pdfId}.lines.json`, { headers: headers() })
  ]);
  if (!markdownResponse.ok || !linesResponse.ok) throw new Error(`Mathpix không trả đủ md/lines.json cho job ${pdfId}.`);
  const markdown = await markdownResponse.text();
  const lines = await linesResponse.json();
  writeFileSync(join(outputDirectory, "mathpix.md"), markdown, "utf8");
  writeFileSync(join(outputDirectory, "mathpix.lines.json"), `${JSON.stringify(lines, null, 2)}\n`, "utf8");
  return { provider: "mathpix", pdfId, startedAt: status.created_at ?? null, finishedAt: new Date().toISOString(), markdown, raw: lines };
}

