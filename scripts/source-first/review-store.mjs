import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, openSync, fsyncSync, closeSync, linkSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { applyReview, digest } from "./model.mjs";

export function writeImmutableJson(target, value) {
  mkdirSync(dirname(target), { recursive: true });
  const bytes = JSON.stringify(value, null, 2) + "\n";
  if (existsSync(target)) { if (readFileSync(target, "utf8") !== bytes) throw new Error("Immutable event already exists with different content"); return; }
  const temporary = `${target}.${randomBytes(8).toString("hex")}.tmp`;
  let descriptor;
  try { descriptor = openSync(temporary, "wx"); writeFileSync(descriptor, bytes, "utf8"); fsyncSync(descriptor); closeSync(descriptor); descriptor = undefined; linkSync(temporary, target); }
  finally { if (descriptor !== undefined) closeSync(descriptor); if (existsSync(temporary)) unlinkSync(temporary); }
}

export function loadReview(base, { work, root }) {
  const first = join(work, "reviews", `${base.id}.json`);
  const directory = join(work, "review-events", base.id);
  const files = [...(existsSync(first) ? [first] : []), ...(existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith(".json")).map((name) => join(directory, name)) : [])];
  const events = files.map((file) => JSON.parse(readFileSync(file, "utf8")));
  let current = base;
  let applied = 0;
  while (true) {
    const candidates = events.filter((event) => event.sourceSnapshotHash === digest(base) && event.patch?.baseHash === digest(current));
    if (!candidates.length) break;
    if (candidates.length > 1) throw new Error(`Branched review history: ${base.id}`);
    const envelope = candidates[0];
    current = applyReview(current, envelope.patch, envelope.patch.reviewer, root);
    applied += 1;
    if (applied > events.length) throw new Error("Cyclic review history");
  }
  return { item: current, staleReview: applied !== events.length, eventCount: applied };
}

export function saveReviewPatch(base, patch, reviewer, { work, root }) {
  if (!/^[\w.-]+$/u.test(base.id) || base.id.includes("..")) throw new Error("Invalid review storage identity");
  if (!reviewer?.trim() || reviewer !== patch.reviewer) throw new Error("CLI reviewer must match the exported editor identity");
  const current = loadReview(base, { work, root });
  if (current.item.audit?.some((event) => event.patchHash === digest(patch))) return current.item;
  if (current.staleReview) throw new Error("Resolve stale review history before applying another patch");
  const item = applyReview(current.item, patch, reviewer, root);
  const directory = join(work, "review-events", base.id);
  mkdirSync(directory, { recursive: true });
  const envelope = { sourceSnapshotHash: digest(base), patch, item, appliedAt: new Date().toISOString() };
  const target = join(directory, `${digest(patch)}.json`);
  const temporary = join(directory, `.${digest(patch)}.${randomBytes(8).toString("hex")}.tmp`);
  let fd;
  try {
    fd = openSync(temporary, "wx");
    writeFileSync(fd, JSON.stringify(envelope, null, 2) + "\n", "utf8");
    fsyncSync(fd); closeSync(fd); fd = undefined;
    // An atomic hard link exposes a complete event and cannot overwrite history.
    linkSync(temporary, target);
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return item;
}
