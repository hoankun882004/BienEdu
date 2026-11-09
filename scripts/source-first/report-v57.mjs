// Handoff only after complete sequential suites and unchanged authorization data.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { root } from './build.mjs';
import { digest } from './model.mjs';
import { readDevelopmentOverview } from './development.mjs';
import { continuationStatus, validateContinuation } from './development-continuation.mjs';

const directory = '.audit/source-first-v5/canonical-v5.7';
const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
const exits = read(`${directory}/verification-exits.json`);
assert.equal(exits.sequential, true);
assert.deepEqual(exits.results.map((entry) => entry.command), ['content:canonical:preview', 'verify', 'test:source-first', 'test:canonical'].map((name) => `npm.cmd run ${name}`));
for (const entry of exits.results) assert.equal(entry.exitCode, 0, entry.command);
const totals = (log) => [...readFileSync(join(root, directory, log), 'utf8').matchAll(/(?:ℹ|#) (tests|pass|fail) (\d+)/gu)].map((match) => [match[1], Number(match[2])]);
assert.deepEqual(totals('verify-final.log'), [['tests', 212], ['pass', 212], ['fail', 0], ['tests', 6], ['pass', 6], ['fail', 0]]);
assert.deepEqual(totals('test-source-first-final.log'), [['tests', 63], ['pass', 63], ['fail', 0]]);
assert.deepEqual(totals('test-canonical-final.log'), [['tests', 24], ['pass', 24], ['fail', 0]]);
const recovery = read('.audit/source-first-v5/recovery-v5.6.json');
const preview = read('.audit/source-first-v5/development-preview-v5.6.json');
for (const entry of [...recovery.sources, ...recovery.runtime, ...recovery.protectedFiles, ...recovery.parentDependencies]) {
  assert.equal(digest(readFileSync(join(root, entry.file))), entry.hash, entry.file);
}
for (const entry of recovery.journal) assert.equal(digest(readFileSync(join(root, '.content-work/source-first-v5/dev-experiments', recovery.parentPlanHash, entry.file))), entry.hash);
validateContinuation(preview.plan);
const parent = readDevelopmentOverview(), child = continuationStatus(preview.plan);
assert.equal(parent.stale, false); assert.equal(parent.status.status, 'locally-applied-unreviewed');
assert.equal(child.status, 'prepared-on-applied-v5.5');
assert.equal(existsSync(join(root, '.content-work/source-first-v5/dev-experiments', preview.plan.planHash)), false);
const browser = read(`${directory}/browser.json`), dom = read(`${directory}/dom.json`), inventory = read(`${directory}/inventory.json`);
assert.equal(browser.passed, true); assert.equal(browser.states, 58); assert.equal(browser.realRuntimeWrites, 0);
assert.equal(dom.passed, true); assert.equal(dom.states.length, 2);
for (const state of dom.states) assert.equal(state.wrongAnswerScoringPreserved, true);
const diagnostic = spawnSync('python', ['-X', 'utf8', 'scripts/source-first/artifact-race-check.py'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diagnostic.status, 0, diagnostic.stderr);
const diff = spawnSync('git', ['diff', '--check'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(diff.status, 0, diff.stdout + diff.stderr);
const protectedLogic = spawnSync('git', ['diff', '--', 'assets/js/domain/learning-progress.js', 'assets/js/domain/practice-bank.js', 'assets/js/domain/exercise-generators.js'], { cwd: root, encoding: 'utf8', windowsHide: true });
assert.equal(protectedLogic.stdout, '');
const status = spawnSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8', windowsHide: true });
writeFileSync(join(root, directory, 'workspace-status-final.txt'), status.stdout);
const report = {
  schemaVersion: 'bienedu.canonical-final.v5.7', status: 'COMPLETE', scope: 'Incremental canonical architecture and verification; not full content migration or publication', generatedAt: new Date().toISOString(),
  verification: exits, tests: { node: { passed: 212, failed: 0 }, dedicatedLatex: { passed: 6, failed: 0 }, sourceFirst: { passed: 63, failed: 0 }, canonical: { passed: 24, failed: 0 } },
  browser: { learnerStates: 58, additionalDOMAndScoringViewports: 2, desktop: '1366x768', mobile: '390x844', errors: [], progressAndCorrectWrongScoringPreserved: true, duplicateMath: false, globalOverflow: false },
  inventory: inventory.inventory.map(({ sourceId, sourceType, topics, sections, pageCount, sha256 }) => ({ sourceId, sourceType, topics, sectionCount: sections.length, pageCount, sha256 })),
  integration: { sources: inventory.inventory.length, plannedTopics: inventory.topics.length, sourceRecords: inventory.recordCount, nativeMathNodes: inventory.mathNodes, pilotFields: inventory.pilotFields, unresolvedExtractionNodes: inventory.unresolvedNodes, runtimeDataWrites: 0 },
  testMismatch: { observed: '39/40 machine-checked expressions in interrupted concurrent run', exactHistoricalItem: 'not recorded; cannot retrospectively attribute', confirmedMechanism: JSON.parse(diagnostic.stdout), fix: 'Atomic generated crop writes, unchanged-byte skip, sequential test-file workers and sequential suites; original assertion retained with diagnostics' },
  parent: { status: parent.status, correctedFields: 9, stale: parent.stale, journalEventsPreserved: recovery.journal.length },
  child: { ...child, preparedFields: 26, rollbackEvidenceIntact: true, requiresNewPreview: false },
  safety: { unchangedSourceFiles: recovery.sources.length, immutableDependenciesIntact: true, protectedCD20CD21: true, CD23Published: false, progressKeysChanged: false, scoringChanged: false, commitsPushesDeployments: 0 },
  limitations: ['PDF text-layer blocks remain unresolved until source-backed structure is established.', 'Four native converter cases remain unsupported; no automatic repair or publication.', 'Legacy structured Knowledge/plain-math representations retain the existing shared rendering compatibility path.', '21 planned topics lack authoritative sources; CD23 remains blocked.', 'Historical failed crop identity was not logged; shared-artifact race is confirmed independently, not inferred as an exact historical trace.'],
  gitDiffCheck: { exitCode: diff.status }, documentation: 'docs/content/canonical-math-v5.7.md', localCommand: 'python -m http.server 8000 --bind 127.0.0.1'
};
writeFileSync(join(root, directory, 'final-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, node: 212, sourceFirst: 63, canonical: 24, browserStates: 58, domViewports: 2, realRuntimeWrites: 0, authorizationStale: false }));
