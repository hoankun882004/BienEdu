import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(".");
const manifestPath = resolve(root, "docs/content/content-manifest.json");
const reportPaths = [
  resolve(root, "docs/content/pdf-inventory.md"),
  resolve(root, "docs/content/topic-coverage-report.md"),
  resolve(root, "docs/content/content-migration-report.md")
];

test("content migration audit publishes a reusable 39-topic manifest", () => {
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, "bienedu.content-migration.v1");
  assert.equal(manifest.policy.studentFormat, "Markdown + LaTeX");
  assert.equal(manifest.policy.pdfViewer, false);
  const sourceFiles=readdirSync(resolve(root,"39 chuyên đề")).filter((name)=>name.endsWith(".pdf")).map((name)=>`39 chuyên đề/${name}`).sort();
  assert.deepEqual(manifest.documents.map((doc)=>doc.relativePath).sort(),sourceFiles);
  assert.equal(manifest.documents.filter((doc)=>doc.registeredDocumentId!==null).length,4,'The four legacy source mappings must remain intact');
  for(const doc of manifest.documents)assert.equal(doc.sha256,createHash('sha256').update(readFileSync(resolve(root,doc.relativePath))).digest('hex').toUpperCase());
  assert.equal(manifest.topics.length, 39);

  const cd01 = manifest.topics.find((topic) => topic.topicId === "CD01");
  const cd15 = manifest.topics.find((topic) => topic.topicId === "CD15");
  assert.equal(cd01.source.documentId, "cd01-cd07-functions");
  assert.equal(cd01.sections.knowledge.units, 11);
  assert.equal(cd01.stages.validated, "needs-review");
  assert.equal(cd15.source, null);
  assert.equal(cd15.stages.published, "not-published");
});

test("foundation audit distinguishes extracted candidates from reviewed publication", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const rows = Object.values(manifest.foundationImportAudit);
  assert.equal(rows.reduce((total, row) => total + row.sourcePromptCount, 0), 1210);
  assert.equal(rows.reduce((total, row) => total + row.sourceAnswerCount, 0), 1210);
  assert.equal(rows.reduce((total, row) => total + row.mappedSolutionCount, 0), 1210);
  assert.equal(rows.reduce((total, row) => total + row.textCompleteCandidateCount, 0), 1022);
  assert.equal(rows.reduce((total, row) => total + row.diagramDependentCount, 0), 188);
  assert.equal(rows.reduce((total, row) => total + row.workedExampleCount, 0), 1210);
});

test("required content reports state the CD01 root cause and incomplete scope", () => {
  reportPaths.forEach((path) => assert.ok(existsSync(path), path));
  const migration = readFileSync(reportPaths[2], "utf8");
  assert.match(migration, /Root Cause Analysis/u);
  assert.match(migration, /Kiến thức cần nhớ/u);
  assert.match(migration, /PDF mới CD15–CD19 và CD28–CD33/u);
  assert.match(migration, /chưa được kích hoạt vào runtime mặc định/u);
  assert.doesNotMatch(migration, /hoàn thành toàn bộ 39/u);
});
