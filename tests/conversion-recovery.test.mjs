import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {adaptTex} from '../scripts/source-first/canonical-adapters.mjs';
import {sourceFormulaToLatex} from '../scripts/latex-pilot/parser.mjs';
import {commands,extractNativeElements} from '../scripts/source-first/tex.mjs';
import {parseRichText, validateMath} from '../assets/js/components/canonical-math.js';

const file='file tài liệu latex/Ly_thuyet_To_hop_Xac_suat_Thong_ke_CD20_CD23.tex';
const source=readFileSync(file,'utf8');
const identity={sourceId:'cd20-cd23-native-latex',sourceHash:createHash('sha256').update(source).digest('hex').toUpperCase()};
const adapted=()=>adaptTex(source,identity).records;
const nodes=record=>record.content.segments;

test('source line 620: indexed intersections stay mathematics, not text-mode scripts',()=>{
  const call=commands(source,'textbf').find(c=>c.args[0].value.startsWith(String.raw`P(A\textsubscript{1}∩`));
  assert.ok(call,'Original independent TEX fixture required');
  const latex=sourceFormulaToLatex(call.args[0].value);
  assert.equal(validateMath(latex).valid,true,latex);
  assert.doesNotMatch(latex,/\\text\{A_/u);
  assert.match(latex,/A_\{n-1\}/u);
});
test('source line 565: ensuremath does not become an unsupported KaTeX macro',()=>{
  const call=commands(source,'textbf').find(c=>c.args[0].value.includes(String.raw`\ensuremath`));
  assert.ok(call);const latex=sourceFormulaToLatex(call.args[0].value);
  assert.equal(validateMath(latex).valid,true,latex);assert.match(latex,/\\varnothing/u);
});
test('all source bold formulae are retained, including second and third formulae',()=>{
  const formulaIds=extractNativeElements(source).filter(r=>r.environment==='formulabox').map(r=>r.id);
  const records=adapted().filter(r=>formulaIds.includes(r.legacyId));
  assert.ok(records.length>40);
  for(const r of records){
    const bold=commands(r.original,'textbf');
    const converted=nodes(r).filter(n=>n.type==='math'||n.type==='unresolved'||n.sourceRole==='literal-prose');
    assert.equal(converted.length,bold.length,r.id);
  }
});
test('source-authored Vietnamese verbal rules remain prose, not rejected mathematics',()=>{
  const records=adapted();
  const r=records.find(r=>r.original.includes('Số cách thỏa mãn = Tổng số cách'));
  assert.ok(r);assert.equal(nodes(r).filter(n=>n.type==='unresolved').length,0);
  assert.ok(nodes(r).some(n=>n.type==='text'&&n.value.includes('Số cách thỏa mãn')));
});
test('TeX comments cannot open or close a mathematical delimiter',()=>{
  const content=parseRichText('Giữ $x% $ ignored closer\n+1$ và \\(y\\).');
  assert.deepEqual(content.segments.filter(n=>n.type==='math').map(n=>n.latex),['x+1','y']);
  assert.equal(content.segments.some(n=>n.type==='unresolved'),false);
});
test('escaped percent and dollar signs do not consume subsequent source mathematics',()=>{
  const content=parseRichText(String.raw`50\% và \$5; \(x+1\)`);
  assert.deepEqual(content.segments.filter(n=>n.type==='math').map(n=>n.latex),['x+1']);
});
test('all previously valid canonical native formulae survive the repaired adapter unchanged',()=>{
  const old=JSON.parse(readFileSync('.audit/source-first-v5/canonical-v5.7/records.json','utf8')).filter(r=>r.sourceId===identity.sourceId);
  const fresh=adapted();let count=0;
  for(const r of old){
    const after=fresh.find(n=>n.id===r.id);assert.ok(after,r.id);
    for(const n of nodes(r).filter(n=>n.type==='math')){assert.ok(nodes(after).some(m=>m.type==='math'&&m.latex===n.latex),r.id);count++;}
  }
  assert.equal(count,62);
});
