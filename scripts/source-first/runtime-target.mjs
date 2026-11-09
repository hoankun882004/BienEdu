import { readFileSync } from "node:fs";
import { join } from "node:path";
import { digest } from "./model.mjs";

export const runtimeFile = "assets/js/data/latex-pilot.generated.js";

// Read the generator's JSON payload without evaluating JavaScript or using a
// cached ESM import. Braces inside escaped JSON strings are not boundaries.
export function readGeneratedObject(source, name) {
  const marker = `export const ${name} = deepFreeze(`;
  return readJsonObjectAfter(source, marker, ");");
}

export function readJsonObjectAfter(source, marker, suffix = ";") {
  const offset = source.indexOf(marker);
  if (offset < 0 || source.indexOf(marker, offset + marker.length) >= 0) throw new Error(`Unknown generated data marker: ${marker}`);
  const start = offset + marker.length;
  if (source[start] !== "{") throw new Error("Generated export must be a JSON object");
  let depth = 0, quoted = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) { if (char === "\\") index += 1; else if (char === '"') quoted = false; continue; }
    if (char === '"') quoted = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) {
      if (!source.slice(index + 1).startsWith(suffix)) throw new Error("Unexpected generated export suffix");
      return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error("Unclosed generated export");
}

export function readRuntimeTarget(root) {
  const bytes = readFileSync(join(root, runtimeFile));
  const source = bytes.toString("utf8");
  return { file: runtimeFile, hash: digest(bytes), metadata: readGeneratedObject(source, "latexPilotMetadata"), knowledge: readGeneratedObject(source, "latexPilotKnowledgeContent") };
}
