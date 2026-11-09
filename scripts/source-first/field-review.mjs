import { readFileSync, existsSync, readdirSync, mkdirSync, openSync, closeSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { digest, sourceIdentityHash, localFile } from "./model.mjs";
import { writeImmutableJson } from "./review-store.mjs";

export function fieldBinding(item, usage, { root }) {
  return { itemId: item.id, itemVersion: item.contentVersion, candidateHash: digest(item.normalizedLatex),
    topicId: item.topicId, recordId: usage.recordId, targetId: usage.targetId, fieldId: usage.selector.fieldId,
    sourceIdentityHash: sourceIdentityHash(item), sourceFile: item.source.file, sourceHash: item.source.sha256,
    sourceBlockId: usage.sourceBlockId, recordHash: usage.recordHash, contentVersion: usage.contentVersion,
    origin: usage.origin, originHash: digest(readFileSync(localFile(root, usage.origin))), beforeHash: digest(usage.before), afterHash: digest(usage.after),
    conditionsHash: digest({ sourceConditions: item.conditions ?? [], fieldContext: usage.conditionContext ?? null, after: usage.after }) };
}
const directoryFor = (work, binding) => join(work, "review-events", "fields", digest(binding.targetId));
export function readFieldApproval(binding, { work }) {
  const directory = directoryFor(work, binding);
  const events = existsSync(directory) ? readdirSync(directory).filter((file) => /^[A-F0-9]{64}\.json$/u.test(file)).map((file) => {
    const event = JSON.parse(readFileSync(join(directory, file), "utf8"));
    if (event.eventHash !== digest(event.patch) || file !== `${event.eventHash}.json`) throw new Error("Corrupt field review event");
    return event;
  }) : [];
  let head = null, latest = null, visited = 0;
  while (true) {
    const next = events.filter((event) => event.patch.parentHash === head);
    if (!next.length) break;
    if (next.length !== 1 || ++visited > events.length) throw new Error("Branched/cyclic field review history");
    latest = next[0]; head = latest.eventHash;
  }
  if (visited !== events.length) throw new Error("Disconnected field review history");
  const matches = latest && digest(latest.patch.binding) === digest(binding);
  return { binding, parentHash: head, eventHash: matches ? head : null, stale: Boolean(latest && !matches), eventCount: events.length,
    sourceVerified: Boolean(matches && latest.patch.sourceVerified), mathematicalApproved: Boolean(matches && latest.patch.sourceVerified && latest.patch.mathematicalApproved),
    reviewer: matches ? latest.patch.reviewer : null, reviewedAt: matches ? latest.patch.exportedAt : null };
}
export function saveFieldReview(item, usage, patch, reviewer, { root, work }) {
  const binding = fieldBinding(item, usage, { root });
  if (patch.schemaVersion !== "bienedu.math-field-review.v1" || digest(patch.binding) !== digest(binding)) throw new Error("Stale field patch/version/conditions/source identity");
  if (!reviewer?.trim() || reviewer !== patch.reviewer || patch.reviewerType !== "human" || !patch.reason?.trim() || !Number.isFinite(Date.parse(patch.exportedAt))) throw new Error("Explicit named human field review required");
  if (typeof patch.sourceVerified !== "boolean" || typeof patch.mathematicalApproved !== "boolean" || patch.mathematicalApproved && !patch.sourceVerified) throw new Error("Independent explicit source and mathematical decisions required");
  if (digest(readFileSync(localFile(root, binding.sourceFile))) !== binding.sourceHash) throw new Error("Source hash mismatch");
  if (["CD20", "CD21", "CD23"].includes(binding.topicId)) throw new Error("Protected/unpublished topic");
  mkdirSync(join(work, "review-events"), { recursive: true });
  const lock = join(work, "review-events", ".field-review.lock");
  const descriptor = openSync(lock, "wx");
  try {
    const current = readFieldApproval(binding, { work });
    if (current.parentHash === digest(patch)) return current;
    if (patch.parentHash !== current.parentHash) throw new Error("Stale field review parent");
    const event = { schemaVersion: "bienedu.field-review-event.v1", eventHash: digest(patch), patch };
    writeImmutableJson(join(directoryFor(work, binding), `${event.eventHash}.json`), event);
    return readFieldApproval(binding, { work });
  } finally { closeSync(descriptor); unlinkSync(lock); }
}
export function assertStoredFieldApproval(binding, eventHash, { work }) {
  if (!/^[A-F0-9]{64}$/u.test(eventHash ?? "")) throw new Error("Missing field human approval");
  const event = JSON.parse(readFileSync(join(directoryFor(work, binding), `${eventHash}.json`), "utf8"));
  const patch = event.patch;
  if (event.eventHash !== eventHash || digest(patch) !== eventHash || digest(patch.binding) !== digest(binding)
    || patch.sourceVerified !== true || patch.mathematicalApproved !== true || patch.reviewerType !== "human" || !patch.reviewer?.trim()
    || !Number.isFinite(Date.parse(patch.exportedAt))) throw new Error("Invalid field human approval evidence");
  const current = readFieldApproval(binding, { work });
  if (current.eventHash !== eventHash || !current.sourceVerified || !current.mathematicalApproved) throw new Error("Field approval superseded/stale");
  return event;
}
