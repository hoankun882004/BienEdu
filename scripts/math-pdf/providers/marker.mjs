import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function markerExecutable(projectRoot) {
  const configured = process.env.BIENEDU_MARKER_COMMAND;
  if (configured) return resolve(projectRoot, configured);
  return join(projectRoot, ".venv-marker", "Scripts", "marker_single.exe");
}

function newestJson(directory, sourcePath) {
  const candidates = [];
  const visit = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith(".json") && !entry.name.endsWith("_meta.json")) candidates.push(path);
    }
  };
  visit(directory);
  const expected = basename(sourcePath).replace(/\.pdf$/i, ".json");
  return candidates.find((path) => basename(path).toLocaleLowerCase() === expected.toLocaleLowerCase())
    ?? candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]
    ?? null;
}

export function markerStatus(projectRoot) {
  const command = markerExecutable(projectRoot);
  if (!existsSync(command)) return { available: false, command, version: null };
  const python = join(dirname(command), "python.exe");
  const result = spawnSync(python, ["-c", "import importlib.metadata; print(importlib.metadata.version('marker-pdf'))"], { encoding: "utf8", windowsHide: true });
  return { available: result.status === 0, command, version: result.stdout.trim() || "installed" };
}

export function extractWithMarker({ projectRoot, sourcePath, outputDirectory, startPage, endPage, forceOcr = false, disableOcr = false, debug = false }) {
  const command = markerExecutable(projectRoot);
  if (!existsSync(command)) throw new Error(`Marker chưa được cài. Mong đợi: ${command}`);
  mkdirSync(outputDirectory, { recursive: true });
  const pageRange = startPage === endPage ? String(startPage - 1) : `${startPage - 1}-${endPage - 1}`;
  const args = [
    sourcePath,
    "--output_dir", outputDirectory,
    "--output_format", "json",
    "--page_range", pageRange,
    "--disable_multiprocessing"
  ];
  if (forceOcr) args.push("--force_ocr");
  if (disableOcr) args.push("--disable_ocr");
  if (debug) args.push("--debug");
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`Marker thất bại (${result.status}).\n${result.stderr || result.stdout}`);
  }
  const jsonPath = newestJson(outputDirectory, sourcePath);
  if (!jsonPath) throw new Error(`Marker không tạo JSON trong ${outputDirectory}.`);
  return {
    provider: "marker",
    startedAt,
    finishedAt: new Date().toISOString(),
    command: `${basename(command)} ${args.map((arg) => JSON.stringify(arg)).join(" ")}`,
    pageRange,
    jsonPath,
    raw: JSON.parse(readFileSync(jsonPath, "utf8")),
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}
