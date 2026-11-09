import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { root } from '../scripts/source-first/build.mjs';
import { digest } from '../scripts/source-first/model.mjs';
import { continuationFixture } from '../tests/helpers/continuation-fixture.mjs';
import { applyContinuation } from '../scripts/source-first/development-continuation.mjs';
import { checkDevelopmentBrowser } from '../scripts/source-first/dev-browser-check.mjs';
import { checkBatchBrowser } from '../scripts/source-first/batch-browser-check.mjs';

const fixture = continuationFixture();
const parent = JSON.parse(readFileSync(join(root, '.audit/source-first-v5/development-preview-v5.5.json'), 'utf8')).plan;
const output = join(root, '.audit/source-first-v5/canonical-v5.7');
const realHashes = fixture.plan.parentFiles.map((entry) => ({ file: entry.file, hash: digest(readFileSync(join(root, entry.file))) }));
const options = { ...fixture, execute: true, development: true, authorize: fixture.plan.planHash, env: {} };
try {
  const html = readFileSync(join(root, 'documents.html'), 'utf8');
  // Actual before/after local files. No route/module interception and no real data writes.
  writeFileSync(join(fixture.root, 'documents.html'), html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/u, '').replace(/\s*<link[^>]*canonical-math\.css[^>]*>/u, ''));
  const before = await checkDevelopmentBrowser(fixture.root, parent, join(output, 'before'));
  writeFileSync(join(fixture.root, 'documents.html'), html);
  const after = await checkDevelopmentBrowser(root, parent, join(output, 'after'));
  mkdirSync(join(output, 'v56'), { recursive: true });
  const pendingBefore = await checkBatchBrowser(fixture.root, fixture.plan, { output: join(output, 'v56'), phase: 'before' });
  assert.equal(applyContinuation(fixture.plan, options).runtimeWrites, 1);
  const pendingAfter = await checkBatchBrowser(fixture.root, fixture.plan, { output: join(output, 'v56'), phase: 'after' });
  const inherited = await checkDevelopmentBrowser(fixture.root, parent, join(output, 'inherited'));
  assert.equal(applyContinuation(fixture.plan, { ...options, rollback: true }).runtimeWrites, 1);
  for (const entry of realHashes) assert.equal(digest(readFileSync(join(root, entry.file))), entry.hash);
  const states = before.states.length + after.states.length + pendingBefore.states.length + pendingAfter.states.length + inherited.states.length;
  writeFileSync(join(output, 'browser.json'), JSON.stringify({ passed: true, states, before, after, pendingBefore, pendingAfter, inherited,
    realRuntimeWrites: 0, fixtureApplyRollbackPassed: true }, null, 2));
  console.log(JSON.stringify({ passed: true, states, realRuntimeWrites: 0 }));
} finally { fixture.cleanup(); }
