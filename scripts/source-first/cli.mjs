import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build, root, work } from "./build.mjs";
import { localFile } from "./model.mjs";
import { loadReview, saveReviewPatch } from "./review-store.mjs";
import { publicationDryRun } from "./publication.mjs";
import { prepareReviewBatch } from "./prepare.mjs";
import { integrateRuntime } from "./integrate.mjs";
import { saveFieldReview } from "./field-review.mjs";
import { createLocalPlan, executeLocalRelease } from "./local-release.mjs";
import { prepareDevelopmentPreview, applyDevelopmentPlan, readDevelopmentOverview } from "./development.mjs";
import { spawnSync } from "node:child_process";

const [command = "help", ...args] = process.argv.slice(2);
const option = (key) => { const index = args.indexOf(`--${key}`); return index < 0 ? null : args[index + 1]; };

try {
  if (command === "build") build();
  else if (command === "dev-preview") {
    const preview = prepareDevelopmentPreview(); console.log(JSON.stringify({ ...preview.summary, planHash: preview.plan.planHash, applyCommand: preview.applyCommand, rollbackCommand: preview.rollbackCommand, immutablePlan: preview.immutablePlan, runtimeWrites: 0 }, null, 2));
  } else if (["dev-apply", "dev-rollback"].includes(command)) {
    const payload = JSON.parse(readFileSync(localFile(root, option("plan") ?? ".audit/source-first-v5/development-preview-v5.5.json"), "utf8")), plan = payload.plan ?? payload;
    const result = applyDevelopmentPlan(plan, { root, work, execute: args.includes("--execute"), authorize: option("authorize"), development: args.includes("--development"), rollback: command === "dev-rollback" });
    if (args.includes("--execute") && command === "dev-apply") {
      const browser = spawnSync(process.execPath, [join(root, "scripts/source-first/dev-browser-check.mjs")], { input: JSON.stringify({ root, plan }), encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 4*1024*1024 });
      if (browser.status !== 0) throw new Error(`Local experiment is applied but browser validation failed: ${browser.error?.message ?? browser.stderr}. Backups retained; dev-rollback with the same plan/hash is available.`);
      result.browserValidation = JSON.parse(browser.stdout);
    }
    console.log(JSON.stringify(result, null, 2));
  } else if (command === "dev-status") console.log(JSON.stringify(readDevelopmentOverview(), null, 2));
  else if (command === "prepare") console.log(JSON.stringify(prepareReviewBatch().counts, null, 2));
  else if (command === "integrate") console.log(JSON.stringify(integrateRuntime({ replayImporter: true }).counts, null, 2));
  else if (["field-apply", "local-release-dry-run", "local-release", "local-rollback"].includes(command)) {
    const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
    if (["local-release", "local-rollback"].includes(command)) {
      const file = option("plan"); if (!file) throw new Error("Use --plan PATH; dry-run unless --execute is explicitly supplied");
      const plan = JSON.parse(readFileSync(localFile(root, file), "utf8"));
      const rollback = command === "local-rollback";
      console.log(JSON.stringify(executeLocalRelease(plan, { root, work, execute: args.includes("--execute"), rollback,
        authorization: { confirmed: Boolean(option("authorize")), reviewerType: "human", reviewer: option("reviewer"), planHash: option("authorize"), action: rollback ? "rollback" : "release" } }), null, 2));
    } else {
      const integration = integrateRuntime({ persist: false });
      const contexts = snapshot.items.flatMap((base) => {
        const loaded = loadReview(base, { root, work }); if (loaded.staleReview) throw new Error("Stale benchmark review history");
        return integration.mappings.find((entry) => entry.itemId === base.id).proposedChanges.map((usage) => ({ item: loaded.item, usage }));
      });
      if (command === "field-apply") {
        const path = option("patch"); if (!path) throw new Error("Use field-apply --patch PATH --reviewer NAME");
        const patch = JSON.parse(readFileSync(localFile(root, path), "utf8"));
        const context = contexts.find((entry) => entry.usage.targetId === patch.binding?.targetId);
        if (!context) throw new Error("Unknown changed pilot field");
        console.log(JSON.stringify(saveFieldReview(context.item, context.usage, patch, option("reviewer"), { root, work }), null, 2));
      } else {
        const plan = createLocalPlan(contexts, { root, work, file: option("file") });
        const output = option("output") ?? ".audit/source-first-v5/local-release-v5.4.json";
        writeFileSync(localFile(root, output), JSON.stringify(plan, null, 2) + "\n");
        console.log(JSON.stringify({ planHash: plan.planHash, files: plan.files.length, blockers: plan.blockers, runtimeWrites: 0 }));
      }
    }
  }
  else if (command === "apply") {
    const patchFile = option("patch");
    const reviewer = option("reviewer");
    if (!patchFile || !reviewer) throw new Error("Use apply --patch PATH --reviewer NAME");
    const patch = JSON.parse(readFileSync(localFile(root, patchFile), "utf8"));
    const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
    const item = snapshot.items.find((candidate) => candidate.id === patch.itemId);
    if (!item) throw new Error("Unknown staging item");
    const reviewed = saveReviewPatch(item, patch, reviewer, { work, root });
    console.log(`Saved local review ${item.id}; publication=${reviewed.publication}. Runtime content unchanged.`);
  } else if (command === "status") {
    const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
    for (const item of snapshot.items) {
      const saved = loadReview(item, { work, root });
      console.log(`${item.id}: ${saved.item.review.status}${saved.staleReview ? " (stale history)" : ""}`);
    }
  } else if (command === "release-dry-run") {
    const snapshot = JSON.parse(readFileSync(join(work, "snapshot.json"), "utf8"));
    const reviewed = snapshot.items.map((item) => loadReview(item, { work, root }));
    const basePlanFile = option("base-plan");
    const basePlan = basePlanFile ? JSON.parse(readFileSync(localFile(root, basePlanFile), "utf8")) : null;
    const integration = integrateRuntime();
    const plan = publicationDryRun(reviewed.map((entry) => entry.item), { root, runtimeMappings: integration.mappings, staleItemIds: reviewed.filter((entry) => entry.staleReview).map((entry) => entry.item.id), basePlan });
    const directory = join(root, ".audit/source-first-v5");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "release-dry-run.json"), JSON.stringify(plan, null, 2) + "\n", "utf8");
    console.log(`Dry-run: ${plan.eligibleCount} eligible previews; ${plan.blockedCount} blocked; runtime writes=0.`);
  } else console.log("Source-first staging: build | prepare | integrate | status | apply --patch PATH --reviewer NAME | field-apply --patch PATH --reviewer NAME | release-dry-run | local-release-dry-run [--file PATH] [--output PATH] | local-release --plan PATH [--execute --authorize PLAN_HASH --reviewer NAME] | local-rollback --plan PATH [--execute --authorize PLAN_HASH --reviewer NAME]\nStart local studio: npm.cmd run content:review\nLocal release requires exact field approvals and separate explicit plan authorization; dry-run is the default.");
} catch (error) { console.error(error.message); process.exitCode = 1; }
