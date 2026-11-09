// Only the explicitly marked disposable benchmark may replace a fixture factory.
// No original source, manifest, assertion or on-disk dependency is patched.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {root} from '../../scripts/source-first/build.mjs';
const marker=JSON.parse(readFileSync(join(root,'.audit/test-baseline-v61.json'),'utf8'));
assert.equal(process.env.BIENEDU_LEGACY_FIXTURE,'1');
assert.equal(marker.mode,'isolated-historical-benchmark');
assert.notEqual(resolve(marker.originRoot),resolve(root));
const original=new URL('./release-v61.mjs',import.meta.url).href;
const wrapper=new URL('./release-v61-v62.mjs',import.meta.url).href;
registerHooks({resolve(specifier,context,nextResolve){const result=nextResolve(specifier,context);return result.url===original?{...result,url:wrapper}:result;}});
