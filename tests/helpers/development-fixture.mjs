import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, cpSync, rmSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { root, work } from "../../scripts/source-first/build.mjs";
import { classifyRuntimeMappings } from "../../scripts/source-first/runtime-mappings.mjs";
import { devDependencies, createDevelopmentPlan } from "../../scripts/source-first/development.mjs";
import { historicalMappings,restoreHistoricalFixture } from "./historical-pilot.mjs";

export const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
const mappings = historicalMappings(snapshot.items);
export const pilotContexts = snapshot.items.flatMap((item) => mappings.find((entry) => entry.itemId === item.id).proposedChanges.map((usage) => ({ item, usage })));
export function developmentFixture({ contexts = pilotContexts } = {}) {
  const directory = mkdtempSync(join(work, "test-v55-")), reviewWork = join(directory, ".content-work/source-first-v5");
  cpSync(join(root, "assets/js/data"), join(directory, "assets/js/data"), { recursive: true });
  for (const file of new Set([...devDependencies, ...contexts.flatMap(({ item }) => [item.source.file, ...item.assetReferences.map((asset) => asset.path)])])) {
    const target = join(directory, file); mkdirSync(dirname(target), { recursive: true }); copyFileSync(join(root, file), target);
  }
  mkdirSync(join(directory, ".git"));
  restoreHistoricalFixture(directory);
  return { root: directory, work: reviewWork, contexts,
    createPlan: () => createDevelopmentPlan({ root: directory, work: reviewWork, contexts }),
    cleanup: () => { const rel = relative(resolve(work), resolve(directory)); if (!rel || rel.startsWith("..")) throw new Error("Unsafe fixture cleanup"); rmSync(directory, { recursive: true, force: true }); } };
}
