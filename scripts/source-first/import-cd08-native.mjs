import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './build.mjs';
import {digest} from './model.mjs';
import {commands} from './tex.mjs';
import {adaptTex} from './canonical-adapters.mjs';
import {validateContent} from '../../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';
import {getProblemTypesForTopic} from '../../assets/js/data/knowledge-content.js';
const file='file tài liệu latex/CD08-Mu-Logarit.tex';
export function buildNativeCD08(){
  const source=readFileSync(join(root,file),'utf8'),sha256=digest(readFileSync(join(root,file))),id='cd08-exponential-logarithm-native-2026';
  const identity={sourceId:id,sourceHash:sha256};
  const sections=commands(source,'section'),solutions=sections.find(c=>c.args[0]?.value==='Lời giải');assert.ok(solutions,'Explicit solution section required');
  const end=commands(source,'end').find(c=>c.args[0]?.value==='document').start;
  const documentStart=commands(source,'begin').find(c=>c.args[0]?.value==='document').end;
  const headings=commands(source,'subsection').filter(c=>c.start>documentStart),examples=commands(source,'vd').filter(c=>/^8\.\d+\.\d+$/u.test(c.args[0]?.value??''));assert.equal(examples.length,280);
  const line=offset=>source.slice(0,offset).split('\n').length;
  const evidence=(start,finish)=>({sourceId:id,sourceHash:sha256,offsets:[start,finish],lines:[line(start),line(finish)],original:source.slice(start,finish)});
  function clean(raw){
    let text=raw;
    for(const name of ['Needspace','clearpage','textbf'])for(const call of commands(text,name).reverse())text=text.slice(0,call.start)+(name==='textbf'?(call.args[0]?.value??''):'')+text.slice(call.end);
    text=text.replace(/\\(?:begin|end)\{(?:tcolorbox|center)\}/gu,'').replace(/\\begin\{tabular\}\{lll\}|\\end\{tabular\}/gu,'');
    text=text.replace(/\\(?:toprule|midrule|bottomrule)\b/gu,'').replaceAll('\\\\','\n').replaceAll('&',' | ');
    return text.trim();
  }
  function canonical(raw){
    const result=adaptTex('\\begin{document}\n'+clean(raw)+'\n\\end{document}',identity);assert.equal(result.records.length,1);
    const content=result.records[0].content;assert.ok(validateContent(content).valid);assert.ok(!/katex-error|math-render-error/u.test(mathContentMarkup(content)));
    return content;
  }
  function body(call){const finish=Math.min(...[...examples,...headings,...sections].filter(c=>c.start>call.start).map(c=>c.start),end);return evidence(call.end,finish);}
  const knowledgeHeading=sections.find(c=>c.args[0]?.value==='Công thức cần nhớ');assert.ok(knowledgeHeading);
  const knowledgeEnd=sections.find(c=>c.start>knowledgeHeading.start).start,knowledgeEvidence=evidence(knowledgeHeading.end,knowledgeEnd),knowledge=canonical(knowledgeEvidence.original);
  const catalog=new Map(getProblemTypesForTopic('CD08').map(t=>[t.code,t]));
  const groups=[];
  for(const heading of headings.filter(c=>c.start<solutions.start)){
    const match=heading.args[0]?.value.match(/^(8\.\d+)\.\s*(.+)$/u);assert.ok(match);const [,code,title]=match;assert.ok(catalog.has(code),'Exact catalog code required');
    const selected=examples.filter(c=>c.start>heading.end&&c.start<Math.min(headings.find(h=>h.start>heading.start)?.start??solutions.start,solutions.start));assert.equal(selected.length,10);
    const methodEvidence=evidence(heading.end,selected[0].start),method=canonical(methodEvidence.original);
    const records=selected.map((call,index)=>{
      const label=call.args[0].value;assert.equal(label,`${code}.${index+1}`);
      const pair=examples.filter(c=>c.start>solutions.start&&c.args[0]?.value===label);assert.equal(pair.length,1,'Unique full-ID statement/solution pair required');
      const statement=body(call),solution=body(pair[0]);
      return {id:`${id}:${label}`,title:`Ví dụ ${index+1}`,originalExampleNumber:index+1,sourceExampleNumber:label,
        prompt:canonical(statement.original),answer:{type:'text',value:''},steps:[{label:'Lời giải từ tài liệu',expression:canonical(solution.original),text:null}],
        problemTypeId:code,lessonId:code,topicId:'CD08',sourceBlockId:`${id}:${label}`,sourcePages:[],sourceLines:[...new Set([...statement.lines,...solution.lines])],sourceLineRanges:{statement:statement.lines,solution:solution.lines},
        sourceEdition:id,origin:'source-first-v6.2',contentVersion:'native-cd08-v1',reviewStatus:'needs-review',contentType:'canonical-math-v1',assetReferences:[],
        verification:{sourceStructure:'native-explicit-math',canonicalSyntax:'passed',mathematicalConsistency:'not-wholly-proven',humanApproval:false,editorialReview:'not-reviewed'},
        sourceEvidence:[{kind:'statement',...statement},{kind:'solution',...solution}],answerStatus:'Full source solution; no invented separate answer'};
    });
    groups.push({code,topicId:'CD08',source:{sourceId:id,file,sha256,sourceKind:'tex',section:code,lines:[line(heading.start),line(selected.at(-1).end)]},
      contentVersion:'source-first-v6.2',knowledge:null,method:null,knowledgeIsNew:false,methodIsNew:false,mergeMode:'append-independent-source',
      editionMapping:{sourceCode:code,catalogCode:code,sourceTitle:title,catalogTitle:catalog.get(code).title,notEquivalentExamples:true},
      pedagogicalState:{knowledge:'independent-source-context',method:'independent-source-context',exampleOnly:false},
      sourceContext:{knowledge,method},sourceContextEvidence:{knowledge:knowledgeEvidence,method:methodEvidence},examples:records,practice:[]});
  }
  assert.equal(groups.length,14);assert.equal(new Set(groups.map(g=>g.code)).size,14);assert.equal(groups.flatMap(g=>g.examples).length,140);
  const count=node=>(node.type==='math'?1:0)+(node.segments??[]).reduce((n,s)=>n+count(s),0);
  return {schemaVersion:'bienedu.native-source.v1',source:{sourceId:id,file,sha256,sourceKind:'tex',lines:source.split('\n').length},groups,
    counts:{examples:140,solutions:140,knowledgeContexts:14,methodContexts:14,practice:0,mathOccurrences:groups.reduce((n,g)=>n+count(g.sourceContext.method)+g.examples.reduce((m,e)=>m+count(e.prompt)+count(e.steps[0].expression),0),count(knowledge))},
    limitations:['Source syntax and exact pairing checked; not blanket mathematical/editorial approval','Independent of the earlier PDF; no old examples or progress overwritten']};
}
if(process.argv[1]?.endsWith('import-cd08-native.mjs')){const result=buildNativeCD08();console.log(JSON.stringify({source:result.source,counts:result.counts}));}
