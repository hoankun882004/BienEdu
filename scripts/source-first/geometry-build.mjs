import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pdfKnowledgeRelease} from '../../assets/js/data/pdf-knowledge-release.js';
import {geometryConstruction} from './geometry-models.mjs';
import {GEOMETRY_VERSION,validateGeometrySpec,checkGeometryProperties} from '../../assets/js/components/geometry-spec.js';
import {parseExpression} from '../../assets/js/components/graph-expression.js';
import {validateMath} from '../../assets/js/components/canonical-math.js';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex').toUpperCase();
export const read=file=>JSON.parse(readFileSync(join(root,file),'utf8'));
export const json=value=>JSON.stringify(value,null,2)+'\n';
export function immutable(file,bytes){if(existsSync(file))assert.equal(readFileSync(file,'utf8'),bytes,'Immutable geometry evidence differs');else{mkdirSync(resolve(file,'..'),{recursive:true});writeFileSync(file,bytes,{flag:'wx'});}}

export function buildGeometry(){
  const folder=join(root,'.audit/geometry-v1');mkdirSync(folder,{recursive:true});
  const issues=read('.audit/pdf-knowledge/issues.json');assert.equal(issues.length,30,'Use the existing exact figure cohort');
  const bytes=readFileSync(join(root,pdfKnowledgeRelease.bundle));assert.equal(hash(bytes),pdfKnowledgeRelease.sha256);
  const payload=JSON.parse(bytes),sourceRecords=read('.audit/pdf-knowledge/evidence.json').sources.flatMap(s=>s.records);
  const requests=issues.map(issue=>{
    assert.deepEqual(issue.errors,['NATIVE_DIAGRAM_SPEC_REQUIRED']);
    const record=sourceRecords.find(r=>r.id===issue.recordId),block=record?.blocks.find(b=>b.id===issue.blockId);
    assert.ok(block,'Existing stable figure evidence missing');
    const article=payload.articles.find(a=>a.id===record.id);assert.equal(article.glyphHash,record.glyphHash,'Knowledge evidence does not match active source edition');
    assert.equal(hash(readFileSync(join(root,record.source.file))),record.source.sha256);
    return {...issue,source:record.source,glyphHash:block.glyphHash,evidence:block.evidence,
      lines:block.evidence.flatMap(i=>i.lines),title:record.title,
      context:record.blocks.filter(b=>b.kind!=='figure').map(b=>b.original).join('\n')};
  });
  const verified=spawnSync('python',['-X','utf8',join(root,'scripts/source-first/geometry-source.py')],{input:JSON.stringify(requests),encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if(verified.status!==0)throw Error(verified.stderr||verified.stdout||'PDF glyph verification failed');
  const sourceEvidence=JSON.parse(verified.stdout);
  const candidates=requests.map((r,index)=>{
    const boxes=r.evidence.map(e=>e.bbox),rect=[Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
    const construction=geometryConstruction(r.key);
    const spec={schemaVersion:GEOMETRY_VERSION,renderer:'jsxgraph',units:null,id:'geometry-'+r.source.sourceId+'-'+r.key.replaceAll('.','-'),recordId:r.recordId,
      source:{sourceId:r.sourceId,sha256:r.source.sha256,page:r.page,rect,blockId:r.blockId,glyphHash:r.glyphHash},...construction,
      unresolvedConditions:[],validation:{status:'pending'}};
    const validation=validateGeometrySpec(spec,{requireVerified:false});assert.equal(validation.valid,true,r.key+': '+validation.errors.join('; '));
    spec.formulae.forEach(latex=>assert.equal(validateMath(latex).valid,true,latex));
    assert.equal(sourceEvidence[index].blockId,r.blockId);
    const article=payload.articles.find(a=>a.id===r.recordId),original=sourceRecords.find(a=>a.id===r.recordId);
    return {spec,target:{recordId:r.recordId,blockId:r.blockId,key:r.key,topicId:original.topicId,
      // Preserve exact source order, including text AFTER the diagram.
      precedingBlockId:original.blocks[original.blocks.findIndex(b=>b.id===r.blockId)-1]?.id??null,
      followingBlockId:original.blocks[original.blocks.findIndex(b=>b.id===r.blockId)+1]?.id??null,
      route:`documents.html?grade=12&topic=${r.key==='CD08-CD11'?'CD08':original.topicId}${article.scope==='type'?'&type='+r.key:''}&section=knowledge&item=1&geometryRecord=${encodeURIComponent(r.recordId)}`},
      evidence:{reference:'.audit/pdf-knowledge/issues.json#'+r.blockId,glyphsMatched:sourceEvidence[index].glyphsMatched,
        interpretation:construction.realization.kind==='constrained-schematic'?'Only stated relationships are reconstructed; coordinate values are free choices, not recovered measurements.':'Explicit functions or stated triangle base/height data, with original source labels.'}};
  });
  const jobs=candidates.map(({spec})=>({spec,inputHash:hash(spec),asts:Object.fromEntries(spec.objects.filter(o=>o.type==='function').map(o=>[o.id,parseExpression(o.expression,o.parameters)]))}));
  const python=join(root,'.content-work/source-first-v5/sympy-env/Scripts/python.exe');assert.ok(existsSync(python),'Existing isolated SymPy environment required');
  const symbolic=spawnSync(python,['-X','utf8',join(root,'scripts/source-first/geometry-symbolic.py')],{input:JSON.stringify(jobs),encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024,timeout:120000});
  if(symbolic.status!==0)throw Error(symbolic.stderr||symbolic.stdout||'Exact geometry verification failed');
  const proof=JSON.parse(symbolic.stdout);assert.equal(proof.results.length,30);
  for(const [index,candidate]of candidates.entries()){
    const result=proof.results[index];assert.equal(result.id,candidate.spec.id);assert.equal(result.inputHash,jobs[index].inputHash);assert.equal(result.passed,true);
    candidate.spec.validation={status:'passed',evidenceHash:hash(result)};
    assert.equal(validateGeometrySpec(candidate.spec).valid,true);
  }
  const summary={examined:30,ready:candidates.length,blocked:0,jsxgraphVersion:JSON.parse(readFileSync(join(root,'node_modules/jsxgraph/package.json'))).version,
    threeJsRequired:0,sourceDetermined:candidates.filter(c=>c.spec.realization.kind==='source-determined').length,
    constrainedSchematics:candidates.filter(c=>c.spec.realization.kind==='constrained-schematic').length,
    dimensions:Object.fromEntries([2,3].map(d=>[d,candidates.filter(c=>c.spec.dimension===d).length])),
    categories:Object.fromEntries([...new Set(candidates.map(c=>c.spec.classification))].map(type=>[type,candidates.filter(c=>c.spec.classification===type).length])),
    symbolicChecks:proof.results.reduce((n,r)=>n+r.checks.length,0),sourceGlyphsMatched:sourceEvidence.reduce((n,r)=>n+r.glyphsMatched,0),
    runtimePropertyChecks:candidates.reduce((n,c)=>n+checkGeometryProperties(c.spec).length,0),activation:'PREPARED_ONLY',knowledgeParent:pdfKnowledgeRelease};
  const bundle={schemaVersion:'bienedu.geometry-bundle.v1',knowledgeParent:pdfKnowledgeRelease,summary,candidates};
  const serialized=json(bundle),sha256=hash(serialized),file=`assets/content/geometry/${sha256}.json`;
  immutable(join(root,file),serialized);
  writeFileSync(join(folder,'preview.json'),json({bundle:file,sha256}));
  writeFileSync(join(folder,'inventory.json'),json({existingRegistry:'.audit/pdf-knowledge/issues.json',summary,figures:candidates.map((c,index)=>({...c,sourceContext:requests[index].context,sourceFigureText:requests[index].original}))}));
  writeFileSync(join(folder,'source-evidence.json'),json(sourceEvidence));writeFileSync(join(folder,'symbolic.json'),json(proof));
  writeFileSync(join(folder,'summary.json'),json(summary));return {summary,bundle:file,sha256};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(json(buildGeometry()));
