import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderKnowledgeMarkdown} from '../assets/js/components/pdf-knowledge-renderer.js';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
const data=JSON.parse(readFileSync(pdfKnowledgeRelease.bundle,'utf8'));
const render=article=>renderKnowledgeMarkdown({slide:{reading:{title:article.title,pdfArticles:[article]}},exercise:{code:article.targets[0],title:article.title},position:{current:1,total:1}});
const count=(s,expression)=>Array.from(s.matchAll(expression)).length;
test('CD01 source rows are displayed independently without splitting any canonical expression',()=>{
  const article=data.articles.find(a=>a.id==='cd01-cd07-functions:CD01:knowledge'),before=JSON.stringify(article),html=render(article);
  assert.equal(count(html,/data-source-equation-index=/gu),5);
  assert.equal(count(html,/class="katex-display"/gu),5);
  assert.equal(count(html,/data-canonical-math=/gu),26);
  assert.equal(JSON.stringify(article),before);
  assert.ok(html.includes('Căn thức có thể xác định ở biên'));
});
test('all 370 source articles retain exact rendered canonical node counts and source blocks',()=>{
  const math=n=>n.type==='math'?1:n.type==='rich-text'?n.segments.reduce((s,n)=>s+math(n),0):0;
  for(const article of data.articles){
    const html=render(article);let expected=0;
    for(const b of article.blocks){
      if(b.kind==='paragraph'){expected+=math(b.content);assert.ok(html.includes(`data-source-block="${b.id}"`),b.id);}
      if(b.kind==='table'){expected+=b.rows.flat().reduce((s,n)=>s+math(n),0);assert.ok(html.includes(`data-source-block="${b.id}"`),b.id);}
    }
    assert.equal(count(html,/data-canonical-math=/gu),expected,article.id);
    assert.doesNotMatch(html,/math-render-error|katex-error/u,article.id);
  }
});
test('mixed Vietnamese prose and conditions stay in order, not guessed into formula cards',()=>{
  const article={id:'fixture',targets:['fixture'],kind:'knowledge',scope:'type',title:'Fixture',source:{sourceId:'test',file:'test.pdf'},sourcePages:[1],blocks:[{id:'mixed',kind:'paragraph',content:{type:'rich-text',segments:[{type:'text',value:'Với '},{type:'math',latex:'x>0',display:false},{type:'text',value:', giữ điều kiện.'}]}}]};
  const html=render(article);assert.doesNotMatch(html,/data-source-equation-index/u);assert.ok(html.indexOf('Với')<html.indexOf('giữ điều kiện.'));assert.equal(count(html,/data-canonical-math=/gu),1);
});
