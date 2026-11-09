import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { root, work } from "./build.mjs";
import { digest, localFile, reviewWorkflow, validateItem } from "./model.mjs";
import { loadReview } from "./review-store.mjs";
import { commands } from "./tex.mjs";
import { prepareReviewBatch } from "./prepare.mjs";
import { readDevelopmentOverview } from "./development.mjs";

export function createReviewServer({ reviewWork = work } = {}) {
  const token = randomBytes(32).toString("hex");
  const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
  const contexts = new Map();
  const nativeContext = (item) => {
    if (item.source.kind !== "tex") return null;
    const bytes = readFileSync(localFile(root, item.source.file));
    if (digest(bytes) !== item.source.sha256) throw new Error("Source checksum changed");
    const source = bytes.toString("utf8");
    const topics = commands(source, "topic");
    const topic = topics.find((entry) => entry.args[0]?.value === item.sectionId);
    if (!topic) throw new Error("Missing native source section");
    const end = Math.min(topics.find((entry) => entry.start > topic.start)?.start ?? source.length,
      commands(source, "chaptertitle").find((entry) => entry.start > topic.start)?.start ?? source.length);
    return source.slice(topic.start, end);
  };
  const contextImage = (source, page) => {
    const key = `${source.sha256}:${page}`;
    if (!contexts.has(key)) {
      const result = spawnSync("python", ["-X", "utf8", join(root, "scripts/source-first/source-view.py")], { input: JSON.stringify({ mode: "context", file: source.file, sha256: source.sha256, page }), windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
      if (result.status !== 0) throw new Error("Original source context unavailable");
      contexts.set(key, result.stdout);
    }
    return contexts.get(key);
  };
  const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".png": "image/png" };
  const equal = (value) => typeof value === "string" && value.length === token.length && timingSafeEqual(Buffer.from(value), Buffer.from(token));
  const publicPaths = new Map([
    ["/", "scripts/source-first/studio/index.html"],
    ["/studio.js", "scripts/source-first/studio/studio.mjs"],
    ["/studio.css", "scripts/source-first/studio/studio.css"],
    ["/assets/styles.css", "assets/styles.css"],
    ["/assets/js/components/markdown-math-renderer.js", "assets/js/components/markdown-math-renderer.js"]
  ]);
  return createServer((req, res) => {
    const send = (status, body, contentType = "application/json; charset=utf-8") => { res.writeHead(status, { "content-type": contentType, "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cross-origin-resource-policy": "same-origin", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'" }); res.end(body); };
    try {
      const port = req.socket.localPort;
      if (req.headers.host !== `127.0.0.1:${port}`) return send(403, '{"error":"Local host required"}');
      if (req.headers.origin && req.headers.origin !== `http://127.0.0.1:${port}`) return send(403, '{"error":"Origin rejected"}');
      if (req.method !== "GET") return send(405, '{"error":"Read-only server; export a patch for local CLI application"}');
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname.startsWith("/api/")) {
        if (!equal(req.headers["x-review-token"])) return send(403, '{"error":"Local review session required"}');
        if (url.pathname === "/api/development") return send(200, JSON.stringify(readDevelopmentOverview({ root, work: reviewWork })));
        if (url.pathname === "/api/items") {
          const preparation = prepareReviewBatch({ persist: false, workDirectory: reviewWork });
          const items = snapshot.items.map((item) => {
            const loaded = loadReview(item, { work: reviewWork, root });
            const reviewed = loaded.item;
            reviewed.checks = validateItem(reviewed, { root });
            const prepared = preparation.items.find((entry) => entry.itemId === item.id);
            return { ...reviewed, workflow: reviewWorkflow(reviewed), baseHash: digest(loaded.item), staleReview: loaded.staleReview, widerSourceContext: nativeContext(reviewed), preparation: prepared, sourceIdentityHash: prepared.sourceIdentityHash, originalExpressionHash: digest(reviewed.originalExpression) };
          });
          return send(200, JSON.stringify({ snapshotHash: digest(snapshot), items }));
        }
        if (url.pathname === "/api/crop") {
          const item = snapshot.items.find((candidate) => candidate.id === url.searchParams.get("id"));
          const asset = item?.assetReferences[0];
          if (!asset) return send(404, '{"error":"No crop"}');
          const buffer = readFileSync(localFile(root, asset.path));
          if (digest(buffer) !== asset.sha256) return send(409, '{"error":"Crop checksum mismatch"}');
          return send(200, buffer, "image/png");
        }
        if (url.pathname === "/api/context") {
          const item = snapshot.items.find((candidate) => candidate.id === url.searchParams.get("id"));
          if (item?.source.kind !== "pdf") return send(404, '{"error":"No PDF context"}');
          const page = Number(url.searchParams.get("page") ?? item.source.location.page);
          const corrections = JSON.parse(readFileSync(join(root, "scripts/source-first/corrections-v53.json"), "utf8")).corrections;
          const allowed = [item.source.location.page, ...corrections.filter((entry) => entry.benchmarkItemId === item.id && entry.sourceHash === item.source.sha256).flatMap((entry) => entry.sourcePages)];
          if (!Number.isInteger(page) || !allowed.includes(page)) return send(403, '{"error":"Page outside trusted source evidence"}');
          return send(200, contextImage(item.source, page), "image/png");
        }
        if (["/api/figure", "/api/figure-context"].includes(url.pathname)) {
          const report = JSON.parse(readFileSync(join(root, ".audit/source-first-v5/figure-review-v5.1.json"), "utf8"));
          const figure = report.figures.find((entry) => entry.id === url.searchParams.get("id"));
          if (!figure) return send(404, '{"error":"Unknown source figure"}');
          if (url.pathname === "/api/figure-context") return send(200, contextImage({ file: figure.sourceFile, sha256: figure.sourceHash }, figure.sourcePage), "image/png");
          const bytes = readFileSync(localFile(root, figure.assetPath));
          if (digest(bytes) !== figure.assetHash) return send(409, '{"error":"Figure checksum mismatch"}');
          return send(200, bytes, "image/png");
        }
        return send(404, '{"error":"Unknown endpoint"}');
      }
      let file = publicPaths.get(url.pathname);
      if (/^\/assets\/vendor\/katex\/[\w./-]+$/u.test(url.pathname) || /^\/assets\/fonts\/[\w./-]+$/u.test(url.pathname)) file = url.pathname.slice(1);
      if (!file) return send(404, "Not found", "text/plain");
      let body = readFileSync(localFile(root, file));
      if (url.pathname === "/") body = body.toString("utf8").replace("REVIEW_SESSION_TOKEN", token);
      send(200, body, mime[extname(file)] ?? "application/octet-stream");
    } catch { send(404, '{"error":"File unavailable; run the source-first build first"}'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.BIENEDU_REVIEW_PORT ?? 8765);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local review port");
  const server = createReviewServer();
  server.listen(port, "127.0.0.1", () => console.log(`Local Math Review Studio: http://127.0.0.1:${port}\nRead-only HTTP. Export patches; apply through the local CLI.`));
}
