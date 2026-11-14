import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {renderKnowledgeMarkdown} from '../assets/js/components/pdf-knowledge-renderer.js';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {sourceOracles} from './fixtures/fidelity-v2.mjs';
import {stageKnownCorrection} from '../scripts/source-first/conversion-recovery.mjs';

test('original indexed radicals are not powers of square roots',()=>{
  const code=String.raw`import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('k','scripts/source-first/knowledge-pdf.py');k=importlib.util.module_from_spec(s);s.loader.exec_module(k)
e=json.loads(Path('.audit/pdf-knowledge/evidence.json').read_text('utf8'));src=next(s for s in e['sources'] if s['source']['sourceId']=='cd08-cd11-exponential-logarithm');r=next(r for r in src['records'] if r['id'].endswith('CD08-CD11:knowledge'))
import pymupdf
with pymupdf.open(src['source']['file']) as p:
 b=next(b for b in r['blocks'] if b['id'].endswith(':5'));c,err=k.conversion([l for i in b['evidence'] for l in i['lines']],k.page_bars(p[4]));print(json.dumps({'content':c,'errors':err}))`;
  const r=spawnSync('python',['-X','utf8','-c',code],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
  const value=JSON.parse(r.stdout);assert.deepEqual(value.errors,[]);
  assert.deepEqual(value.content.segments.filter(n=>n.type==='math').map(n=>n.latex),[String.raw`a^{m/n}=\sqrt[n]{a^{m}}.`]);
});
test('display math in mixed prose has a focusable single scroll owner',()=>{
  const data=JSON.parse(readFileSync(pdfKnowledgeRelease.bundle)),a=data.articles.find(a=>a.id==='cd12-cd14-calculus:12.1:knowledge');
  const copy={...a,blocks:[a.blocks.find(b=>b.id.endsWith(':5'))]};
  const html=renderKnowledgeMarkdown({slide:{reading:{title:a.title,pdfArticles:[copy]}},exercise:{code:'12.1'},position:{current:1,total:1}});
  assert.equal([...html.matchAll(/data-math-scroll/g)].length,5);
});
test('all four indexed-root corrections match independent source-page oracles; existing cases stay unchanged',()=>{
  const corrections=JSON.parse(readFileSync('.audit/conversion-recovery/pdf-corrections.json')).filter(c=>c.category==='RADICAL_SCOPE');assert.equal(corrections.length,4);
  for(const c of corrections){const expected=sourceOracles.find(([id,,suffix])=>c.blockId===id+':block:'+suffix);assert.ok(expected,c.blockId);assert.deepEqual(c.after.segments.filter(n=>n.type==='math').map(n=>n.latex),expected[3]);const prose=n=>n.segments.filter(s=>s.type==='text').map(s=>s.value).join('').replace(/\s/gu,'');assert.equal(prose(c.after),prose(c.before),'Source wording/conditions must not change');}
  assert.equal(corrections.flatMap(c=>c.evidence).filter(e=>e.kind==='Radical').length,10);
});
test('current QA accepts exact already-applied corrections but refuses unknown source/runtime bytes',()=>{
  const c=JSON.parse(readFileSync('.audit/conversion-recovery/pdf-corrections.json'))[0],block={glyphHash:c.glyphHash,content:structuredClone(c.before)};
  assert.equal(stageKnownCorrection(block,c),false);assert.deepEqual(block.content,c.after);assert.equal(stageKnownCorrection(block,c),true);
  block.content={type:'text',value:'unrelated user edit'};assert.throws(()=>stageKnownCorrection(block,c),/Unknown learner bytes/);
});
