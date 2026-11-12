import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {validateContent} from '../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../assets/js/components/canonical-math-renderer.js';
import {renderKnowledgeMarkdown} from '../assets/js/components/pdf-knowledge-renderer.js';
import {articlesFor,attachPdfKnowledge} from '../assets/js/data/pdf-knowledge-model.js';
import {createLessonSlides} from '../assets/js/domain/lesson-workspace.js';

const hash=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
const bytes=readFileSync(pdfKnowledgeRelease.bundle),data=JSON.parse(bytes);
const summary=JSON.parse(readFileSync('.audit/pdf-knowledge/summary.json'));
const nodes=block=>block.kind==='table'?block.rows.flat():block.content?[block.content]:[];
function visit(node,fn){fn(node);if(node.type==='rich-text')node.segments.forEach(n=>visit(n,fn));}

test('eight original PDFs remain independent and unchanged; no manual approval gate',()=>{
  assert.equal(hash(bytes),pdfKnowledgeRelease.sha256);assert.equal(summary.sources,8);assert.equal(summary.pages,394);
  const sources=[...new Map(data.articles.map(a=>[a.source.sourceId,a.source])).values()];assert.equal(sources.length,8);
  for(const source of sources)assert.equal(hash(readFileSync(source.file)),source.sha256,source.file);
  assert.equal(data.editorialApprovalRequired,false);assert.equal(summary.unresolvedTextBlocks,0);
  assert.equal(data.articles.length,370);assert.equal(new Set(data.articles.map(a=>a.id)).size,370);
});
test('every imported formula parses and renders with no unresolved or error nodes',()=>{
  let count=0;
  for(const article of data.articles)for(const block of article.blocks)for(const node of nodes(block)){
    assert.equal(validateContent(node).valid,true,block.id);
    visit(node,n=>{assert.notEqual(n.type,'unresolved',block.id);if(n.type==='math')count++;});
    assert.doesNotMatch(mathContentMarkup(node),/katex-error|math-render-error/u,block.id);
  }
  assert.equal(count,summary.formulasChecked);assert.equal(count,1358);
});
test('source limits and Vietnamese text subscripts stay inside their formulas',()=>{
  const calculus=key=>data.articles.find(a=>a.source.sourceId==='cd12-cd14-calculus-2026'&&a.targets.includes(key));
  const latex=key=>calculus(key).blocks.flatMap(b=>b.content?.segments??[]).filter(n=>n.type==='math').map(n=>n.latex).join(' ');
  assert.ok(latex('13.3').includes('_{\\varphi (a)}^{\\varphi (b)}'));
  assert.ok(latex('14.8').includes('q_{\\text{vào}}'));
  assert.ok(latex('14.8').includes('q_{ra}'));
  assert.ok(latex('14.9').includes('\\sum _{k=1}^{n}\\int _{t_{k-1}}^{t_{k}}'));
  const shared=data.articles.find(a=>a.id==='cd08-cd11-exponential-logarithm:CD08-CD11:knowledge');
  const limits=shared.blocks.flatMap(b=>b.content?.segments??[]).filter(n=>n.latex?.includes('r_{n}')).map(n=>n.latex).join(' ');
  assert.ok(limits.includes('\\lim_{n\\to +\\infty}r_{n}'));
  assert.ok(!limits.includes(',_{n}')&&!limits.includes('=_{n}'));
});
test('source tables keep cell boundaries, mathematical conditions and undefined values',()=>{
  const tables=data.articles.flatMap(a=>a.blocks.filter(b=>b.kind==='table'));
  for(const table of tables){assert.ok(table.rows.length>1);assert.ok(table.rows.every(row=>row.length===table.rows[0].length));}
  const trig=tables.find(t=>t.id==='cd15-cd16-trigonometry-2026:15.1:knowledge:block:2');
  assert.equal(trig.rows.length,5);assert.equal(trig.rows[0].length,6);assert.equal(trig.rows[3][5].segments[0].value,'KXĐ');
  const calculus=tables.find(t=>t.id==='cd12-cd14-calculus:12.1:knowledge:block:4');
  assert.equal(calculus.rows.length,9);assert.equal(calculus.rows[0].length,4);
  assert.ok(calculus.rows[2][2].segments.some(n=>n.latex?.includes('n\\ne-1')));
});
test('independent editions, shared knowledge and source notes are retained',()=>{
  const editions=articlesFor(data,'12.1').filter(a=>a.kind==='knowledge');
  for(const source of ['cd12-cd14-calculus','cd12-cd14-calculus-2026'])assert.ok(editions.some(a=>a.source.sourceId===source));
  for(const topic of ['CD08','CD09','CD10','CD11'])assert.ok(articlesFor(data,topic).some(a=>a.scope==='shared'));
  for(const key of ['17.1','19.1','20.1','21.8','28.1','32.5','33.9'])assert.ok(articlesFor(data,key).some(a=>a.kind==='knowledge'));
  assert.equal(data.articles.filter(a=>a.kind==='notes').length,50);
});
test('chapter introductions cannot displace per-type knowledge',()=>{
  const reading=attachPdfKnowledge({lead:'Original',formulae:[],points:[]},articlesFor(data,'20.1'));
  const html=renderKnowledgeMarkdown({slide:{reading},exercise:{code:'20.1',title:'Quy tắc cộng'},position:{current:1,total:1}});
  assert.ok(html.indexOf('data-pdf-knowledge="cd20-cd21-theory:20.1:knowledge"')<html.indexOf('data-pdf-knowledge="cd20-cd21-theory:CD20:knowledge"'));
});
test('legacy slide IDs, page counts and examples remain intact',()=>{
  const exercise={code:'12.1',id:'KEEP',title:'Nguyên hàm'},topic={id:'CD12',title:'Nguyên hàm'};
  const original={pages:[{id:'intro',lead:'first',formulae:[],points:[]},{id:'second',lead:'second',formulae:[],points:[]}]};
  const options={topic,exercise,reading:original,examples:[{id:'existing-example',prompt:'keep'}]};
  const before=createLessonSlides(options),after=createLessonSlides({...options,reading:attachPdfKnowledge(original,articlesFor(data,'12.1'))});
  assert.deepEqual(after.map(s=>s.id),before.map(s=>s.id));assert.equal(after.length,before.length);
  assert.deepEqual(after.find(s=>s.id==='existing-example').workedExample,before.find(s=>s.id==='existing-example').workedExample);
});
test('all unresolved figures are reported separately; no invented or cropped images',()=>{
  assert.equal(data.articles.reduce((n,a)=>n+a.unresolvedFigures,0),30);
  assert.equal(data.articles.reduce((n,a)=>n+a.unresolvedText,0),0);
  assert.doesNotMatch(JSON.stringify(data),/\.(?:png|webp|jpe?g)|<iframe|<object/iu);
  const reading=attachPdfKnowledge({lead:'',formulae:[],points:[]},articlesFor(data,'28.1'));
  const html=renderKnowledgeMarkdown({slide:{reading},exercise:{code:'28.1',title:'Vectơ'},position:{current:1,total:1}});
  assert.match(html,/hình minh họa/u);assert.doesNotMatch(html,/<img|<iframe|NEEDS_REVIEW|math-render-error/u);
});
test('earlier correction payloads, immutable backups and dependencies are preserved',()=>{
  const reference=JSON.parse(readFileSync('.audit/source-first-v5/release-v62/publication-v621.json'));
  const parent=JSON.parse(readFileSync(reference.manifest));
  const local=JSON.parse(readFileSync('.audit/local-pdf-visibility/receipt.json'));
  for(const item of parent.files){if(item.file==='documents.html')continue;assert.equal(hash(readFileSync(item.file)),item.file===local.file?local.afterHash:item.afterHash,item.file);}
  for(const item of parent.dependencies)assert.equal(hash(readFileSync(item.file)),item.hash,item.file);
  assert.equal(hash(readFileSync(parent.publicationBundle.file)),parent.publicationBundle.hash);
});
