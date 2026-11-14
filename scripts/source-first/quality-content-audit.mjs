// Projection of the existing inventory, with deduplication and explicit proof scope.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {hash,json,read,output} from './conversion-recovery.mjs';
import {pdfKnowledgeRelease} from '../../assets/js/data/pdf-knowledge-release.js';
import {validateMath} from '../../assets/js/components/canonical-math.js';
const result=spawnSync('python',['-X','utf8','scripts/source-first/knowledge-source-proof.py'],{encoding:'utf8',windowsHide:true,maxBuffer:2*1024*1024});assert.equal(result.status,0,result.stderr);
const glyphs=JSON.parse(result.stdout),fixture=read('tests/fixtures/cd01-source-knowledge.json'),data=read(pdfKnowledgeRelease.bundle),article=data.articles.find(a=>a.id==='cd01-cd07-functions:CD01:knowledge');
assert.equal(hash(readFileSync(article.source.file)),fixture.sourceHash);let matched=0;
for(const expected of fixture.blocks){const b=article.blocks.find(b=>b.id.endsWith(':block:'+expected.suffix));assert.equal(b.page,fixture.page);assert.equal(b.glyphHash,expected.glyphHash);assert.deepEqual(b.content.segments.filter(n=>n.type==='math').map(n=>n.latex),expected.math);for(const latex of expected.math){assert.equal(validateMath(latex).valid,true);matched++;}}
assert.equal(matched,26);
const inventory=read(output+'/inventory.json'),records=new Map(),unresolved=new Map();
for(const n of inventory){const key=JSON.stringify([n.source?.sourceId,n.source?.sha256??n.source?.sourceHash,n.recordId,n.location]);if(!records.has(key))records.set(key,{sourceId:n.source?.sourceId??null,recordId:n.recordId,location:n.location,states:[]});const record=records.get(key);if(!record.states.includes(n.state))record.states.push(n.state);if(n.status==='SOURCE_AMBIGUOUS')unresolved.set(JSON.stringify([key,n.canonical]),{sourceId:n.source?.sourceId??null,recordId:n.recordId,location:n.location,reason:n.error});}
const blocks=new Map(data.articles.flatMap(a=>a.blocks.map(b=>[b.id,{article:a,block:b}])));
const fixtureBlocks=new Map(fixture.blocks.map(b=>[article.id+':block:'+b.suffix,b]));
const classifications=['SOURCE_MATCHED','CONFIRMED_CONVERSION_ERROR','CONFIRMED_RENDERER_ERROR','CONFIRMED_MAPPING_ERROR','SOURCE_AMBIGUOUS','UNSUPPORTED_STRUCTURE','NOT_YET_CHECKED'];
const nodes=inventory.map(n=>{
  const association=blocks.get(n.recordId),known=fixtureBlocks.get(n.recordId);
  const independentlyMatched=Boolean(known&&n.source?.sha256===fixture.sourceHash&&known.math.includes(n.canonical));
  const classification=independentlyMatched?'SOURCE_MATCHED':n.status;
  const target=association?.article.targets[0],topic=target?.startsWith('CD')?target:target?'CD'+target.split('.')[0]:null;
  assert.ok(classifications.includes(classification));
  return {...n,classification,sourceGlyphHash:association?.block.glyphHash??null,
    learnerRoute:association?`/documents.html?grade=12&topic=${topic}${/^\d/u.test(target??'')?'&type='+target:''}&section=knowledge&item=1`:null,
    liveProjection:n.state==='ACTIVE',editorialApproval:false,
    verificationScope:independentlyMatched?'Independent full source-page fixture, exact source/block hash and canonical expression':'Retains existing inventory classification; syntax/glyph presence is not fidelity proof'};
});
writeFileSync('.audit/quality-recovery/node-audit.json',json(nodes));
const report={status:'PARTIAL',inventoryOccurrences:inventory.length,uniqueRecordLocationKeys:records.size,uniqueUnresolvedCandidates:unresolved.size,
  conversionFindings:{pdfBlocks:read(output+'/pdf-corrections.json').length,differentialGlyphs:read(output+'/summary.json').pdfDifferentialGlyphs,texRecords:read(output+'/tex-corrections.json').length,state:'Prepared source-backed corrections retained; not activated. These are record-level findings, not a claim that every surrounding math node is source-matched.'},
  sourceMatchedMathNodes:matched,sourceMatchedRecords:6,confirmedRendererDefects:3,rendererDefects:['Desktop Knowledge ancestor clipping','Source formula row whitespace collapsed into prose flow','Nested horizontal scroll owner differed from keyboard-focusable formula wrapper'],
  nodeAudit:'.audit/quality-recovery/node-audit.json',classificationOccurrences:Object.fromEntries(classifications.map(c=>[c,nodes.filter(n=>n.classification===c).length])),
  liveClassificationOccurrences:Object.fromEntries(classifications.map(c=>[c,nodes.filter(n=>n.liveProjection&&n.classification===c).length])),
  sourceHashAndGlyphEvidence:glyphs,records:[...records.values()],unresolved:[...unresolved.values()],
  proofLimit:'Only the 26 CD01 Knowledge nodes have the independently inspected fixture in this pass. Source glyph identity and KaTeX validity do not certify all other mathematics. Repeated historical projections are not counted as distinct source errors.'};
writeFileSync('.audit/quality-recovery/content.json',json(report));console.log(json({...report,records:undefined,unresolved:undefined}));
