import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const sourceRoot = resolve(projectRoot, "assets/js");
const htmlEntries = ["index.html", "course.html", "documents.html", "quiz.html", "contact.html"];
const errors = [];

function walk(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(path, extension);
    return extname(entry.name) === extension ? [path] : [];
  });
}

function localPath(specifier, importer) {
  if (!specifier.startsWith(".")) return null;
  return resolve(importer, "..", specifier.split(/[?#]/, 1)[0]);
}

function moduleSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s+["']([^"']+)["']/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function displayPath(path) {
  return relative(projectRoot, path).replaceAll("\\", "/");
}

const javascriptFiles = walk(sourceRoot, ".js");

for (const file of javascriptFiles) {
  const syntaxCheck = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (syntaxCheck.status !== 0) {
    errors.push(`${displayPath(file)}: ${syntaxCheck.stderr.trim()}`);
  }

  const source = readFileSync(file, "utf8");
  if (/\bdebugger\b|console\.(?:log|debug)\s*\(/.test(source)) {
    errors.push(`${displayPath(file)}: contains debug-only code`);
  }

  for (const specifier of moduleSpecifiers(source)) {
    const dependency = localPath(specifier, file);
    if (dependency && !existsSync(dependency)) {
      errors.push(`${displayPath(file)}: missing import ${specifier}`);
    }
  }
}

const entryModules = new Set();
for (const htmlEntry of htmlEntries) {
  const file = resolve(projectRoot, htmlEntry);
  const source = readFileSync(file, "utf8");

  for (const match of source.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
    const asset = resolve(projectRoot, match[1].split(/[?#]/, 1)[0]);
    if (!existsSync(asset)) errors.push(`${htmlEntry}: missing asset ${match[1]}`);
    if (extname(asset) === ".js") entryModules.add(asset);
  }

  for (const specifier of moduleSpecifiers(source)) {
    const module = localPath(specifier, file);
    if (module) entryModules.add(module);
  }
}

const reachableModules = new Set();
const pendingModules = [...entryModules];
while (pendingModules.length) {
  const file = pendingModules.pop();
  if (!file || reachableModules.has(file) || !existsSync(file)) continue;
  reachableModules.add(file);

  const source = readFileSync(file, "utf8");
  for (const specifier of moduleSpecifiers(source)) {
    const dependency = localPath(specifier, file);
    if (dependency && !reachableModules.has(dependency)) pendingModules.push(dependency);
  }
}

for (const file of javascriptFiles) {
  if (!reachableModules.has(file)) errors.push(`${displayPath(file)}: unreachable from active HTML entries`);
}

if (errors.length) {
  console.error(`Source check failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Source check passed: ${javascriptFiles.length} JavaScript files, ${htmlEntries.length} HTML entries.`);
}
