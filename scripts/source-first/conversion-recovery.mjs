// Read-only inventory and source-backed candidates. Never activates content.
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {pdfKnowledgeRelease} from '../../assets/js/data/pdf-knowledge-release.js';
import {localRelease} from '../../assets/js/data/local-release.js';
import {geometryActivation} from '../../assets/js/data/geometry-activation.js';
import {nativeDocumentSources} from '../../assets/js/data/document-mappings.js';
import {adaptTex} from './canonical-adapters.mjs';
import {validateMath} from '../../assets/js/components/canonical-math.js';
import {mathContentMarkup} from '../../assets/js/components/canonical-math-renderer.js';

export const root=fileURLToPath(new URL('../../',import.meta.url));
export const output='.audit/conversion-recovery';
export const hash=b=>createHash('sha256').update(b).digest('hex').toUpperCase();
export const json=v=>JSON.stringify(v,null,2)+'\n';
export const read=file=>JSON.parse(readFileSync(resolve(root,file),'utf8'));
export function immutable(file,bytes){const path=resolve(root,file);mkdirSync(dirname(path),{recursive:true});if(existsSync(path))assert.equal(readFileSync(path,'utf8'),bytes,'Immutable artifact differs: '+file);else writeFileSync(path,bytes,{flag:'wx'});}
export function runtimeHashes(){
  const files=['documents.html','assets/js/curriculum.js','assets/js/data/local-release.js','assets/js/data/pdf-knowledge-release.js','assets/js/data/geometry-activation.js',
    'assets/js/components/canonical-math.js','assets/js/components/canonical-math-renderer.js','assets/js/components/markdown-math-renderer.js',
    'assets/js/components/pdf-knowledge-renderer.js','assets/canonical-math.css','assets/pdf-knowledge.css','assets/styles.css','assets/learning-v6.css',
    'assets/geometry.css','assets/js/components/geometry-renderer.js','assets/js/components/geometry-spec.js','assets/js/geometry-loader.js','assets/js/geometry-learner.js'];
  return Object.fromEntries(files.map(f=>[f,hash(readFileSync(resolve(root,f)))]));
}
export function stageKnownCorrection(block,candidate){
  assert.equal(block.glyphHash,candidate.glyphHash,'Source glyph identity changed');
  if(json(block.content)===json(candidate.after))return true;
  assert.deepEqual(block.content,candidate.before,'Unknown learner bytes; do not replay historical corrections');
  block.content=candidate.after;return false;
}
export function buildRecovery(){
  mkdirSync(resolve(root,output),{recursive:true});
  const extracted=spawnSync('python',['-X','utf8','scripts/source-first/conversion-recovery.py'],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
  assert.equal(extracted.status,0,extracted.stderr);
  const replay=JSON.parse(extracted.stdout),knowledge=read(pdfKnowledgeRelease.bundle);
  assert.equal(hash(readFileSync(resolve(root,pdfKnowledgeRelease.bundle))),pdfKnowledgeRelease.sha256);
  const blocks=new Map(knowledge.articles.flatMap(a=>a.blocks.map(b=>[b.id,b])));
  const corrections=[];let alreadyAppliedBlocks=0;
  for(const candidate of replay.candidates){
    const b=blocks.get(candidate.blockId);assert.ok(b,candidate.blockId);
    const before=mathContentMarkup(candidate.before),after=mathContentMarkup(candidate.after);
    assert.doesNotMatch(before+after,/math-render-error|katex-error/u,candidate.blockId);
    if(json(candidate.before)!==json(candidate.after)){if(stageKnownCorrection(b,candidate))alreadyAppliedBlocks++;corrections.push(candidate);}
  }
  const knowledgeBytes=json(knowledge),knowledgeHash=hash(knowledgeBytes),knowledgeFile=`assets/content/pdf-knowledge/${knowledgeHash}.json`;
  immutable(knowledgeFile,knowledgeBytes);
  // Geometry construction/source IDs are byte-for-byte identical. Only its
  // exact knowledge-parent binding advances with this authenticated child.
  const geometry=read(geometryActivation.bundle);
  assert.equal(hash(readFileSync(resolve(root,geometryActivation.bundle))),geometryActivation.sha256);
  assert.deepEqual(geometry.knowledgeParent,pdfKnowledgeRelease);
  const oldCandidates=json(geometry.candidates);
  geometry.knowledgeParent={bundle:knowledgeFile,sha256:knowledgeHash};
  assert.equal(json(geometry.candidates),oldCandidates);
  const geometryBytes=json(geometry),geometryHash=hash(geometryBytes),geometryFile=`assets/content/geometry/${geometryHash}.json`;
  immutable(geometryFile,geometryBytes);
  const stagedTex=[];
  const texFolder=readdirSync(root).find(n=>n.startsWith('file ')&&n.endsWith('latex'));
  for(const name of readdirSync(resolve(root,texFolder)).filter(n=>n.endsWith('.tex'))){
    const file=`${texFolder}/${name}`,bytes=readFileSync(resolve(root,file)),sourceHash=hash(bytes);
    const mapping=nativeDocumentSources.find(s=>s.sourceSha256===sourceHash)
      ?? read(localRelease.bundle).sourceAdditions?.filter(s=>s.sourceKind==='tex'&&s.sha256===sourceHash).map(s=>({id:s.sourceId}))[0];
    assert.ok(mapping,'Independent TEX must be registered: '+file);
    const adapted=adaptTex(bytes.toString('utf8'),{sourceId:mapping.id,sourceHash});
    stagedTex.push({source:{sourceId:mapping.id,file,sha256:sourceHash},...adapted});
  }
  const inputs=[{file:pdfKnowledgeRelease.bundle,state:'ACTIVE'},{file:localRelease.bundle,state:'ACTIVE'},
    ...['canonical-v5.7/records.json','canonical-v5.7/pilots.json','release-v6/bundle.json','release-v61/bundle.json','release-v62/bundle.json','release-v62/content.json'].map(f=>({file:'.audit/source-first-v5/'+f,state:'STAGED_OR_HISTORICAL_PROJECTION'}))];
  const inventory=[],datasets=[];
  const visit=(v,path,context)=>{
    if(!v||typeof v!=='object')return;
    const ownSource=v.source?.sourceId?v.source:v.sourceId?{sourceId:v.sourceId,sha256:v.sourceHash}:context.source;
    const next={...context,source:ownSource,recordId:v.id??context.recordId,location:v.location??v.sourcePages??v.page??context.location};
    if(v.type==='math'||v.type==='unresolved'){
      const check=v.type==='math'?validateMath(v.latex):{valid:false,error:v.reason};
      inventory.push({...next,target:path,canonical:v.latex??v.original,rendering:check.valid?'PARSED':'REJECTED',error:check.error??null,
        status:v.type==='unresolved'?'SOURCE_AMBIGUOUS':check.valid?'NOT_YET_CHECKED':'CONFIRMED_RENDERER_ERROR',
        limitation:'KaTeX syntax/source hash is not independent transcription verification.'});
    }
    for(const [key,item]of Object.entries(v))if(item&&typeof item==='object'&&!['before','after','source','sourceEvidence','layoutEvidence'].includes(key))visit(item,path+'/'+key,next);
  };
  for(const input of inputs){
    if(!existsSync(resolve(root,input.file))){datasets.push({...input,status:'MISSING'});continue;}
    const start=inventory.length;visit(read(input.file),'',{dataset:input.file,state:input.state,source:null,recordId:null,location:null});
    datasets.push({...input,sha256:hash(readFileSync(resolve(root,input.file))),nodes:inventory.length-start});
  }
  for(const tex of stagedTex){const start=inventory.length;visit(tex.records,'',{dataset:tex.source.file,state:'FRESH_TEX_CANDIDATE',source:tex.source,recordId:null,location:null});datasets.push({file:tex.source.file,state:'FRESH_TEX_CANDIDATE',nodes:inventory.length-start});}
  const historicalNative=read('.audit/source-first-v5/canonical-v5.7/records.json');
  const formulaSignature=record=>(record.content.segments??[record.content]).filter(n=>n.type==='math'||n.type==='unresolved'||n.sourceRole==='literal-prose');
  const texChanges=stagedTex.flatMap(t=>t.records.flatMap(after=>{
    const before=historicalNative.find(r=>r.id===after.id&&r.sourceHash===t.source.sha256);
    return before&&json(formulaSignature(before))!==json(formulaSignature(after))?[{recordId:after.id,source:t.source,location:after.location,before:before.content,after:after.content,
      status:'CONFIRMED_CONVERSION_ERROR',integration:'STAGED_ONLY_NOT_IN_PDF_BATCH',original:after.original}]:[];
  }));
  const count=status=>inventory.filter(n=>n.status===status).length;
  const renderedKnowledgeMath=dataset=>dataset.articles.reduce((total,article)=>total+article.blocks.reduce((sum,block)=>{
    const contents=block.kind==='table'?block.rows.flat():block.kind==='paragraph'?[block.content]:[];
    return sum+contents.reduce((n,node)=>n+(node.type==='math'?1:(node.segments??[]).filter(s=>s.type==='math').length),0);
  },0),0);
  const report={schemaVersion:'bienedu.conversion-recovery.v1',status:'PARTIAL',activeContentChanged:false,
    scope:'Stored canonical nodes in explicitly enumerated active/staged projections, plus independent native TEX replay. Historical copies count separately; legacy plain strings/unsupported PDF structures are NOT certified.',
    datasets,mathNodes:inventory.filter(n=>n.rendering==='PARSED').length,unresolvedNodes:count('SOURCE_AMBIGUOUS'),syntaxErrors:count('CONFIRMED_RENDERER_ERROR'),
    independentlySourceMatchedNodes:0,notYetSourceChecked:count('NOT_YET_CHECKED'),
    pdfCorrectionBlocks:corrections.length,pdfDifferentialGlyphs:corrections.reduce((n,c)=>n+c.evidence.filter(e=>e.kind==='Differential').length,0),
    alreadyAppliedBlocks,pendingCorrectionBlocks:corrections.length-alreadyAppliedBlocks,
    indexedRadicals:corrections.reduce((n,c)=>n+c.evidence.filter(e=>e.kind==='Radical').length,0),
    verifiedCorrectionScope:'Literal differential and indexed-radical ownership replayed against exact original source glyph positions; no blanket source-matched claim for surrounding formulas.',
    texRecords:stagedTex.reduce((n,t)=>n+t.records.length,0),texUnresolved:inventory.filter(n=>n.state==='FRESH_TEX_CANDIDATE'&&n.rendering==='REJECTED').length,
    texCorrectedRecords:texChanges.length,
    knowledgeRenderedMathNodes:{active:renderedKnowledgeMath(read(pdfKnowledgeRelease.bundle)),candidate:renderedKnowledgeMath(knowledge),
      explanation:'Stored-node inventory also includes retained table conversion metadata and absorbed continuation nodes. These are not additional learner-visible formulas. Joining the 64 differential boundaries reduces the rendered node count without removing any mathematical source glyph.'},
    existingProgressAndScoring:'unchanged',geometryCandidatesUnchanged:true,
    parent:{knowledge:pdfKnowledgeRelease,geometry:geometryActivation,learning:localRelease},
    candidate:{knowledge:{bundle:knowledgeFile,sha256:knowledgeHash},geometry:{bundle:geometryFile,sha256:geometryHash}},
    sources:[...replay.sources,...stagedTex.map(t=>t.source)],runtimeHashes:runtimeHashes()};
  for(const [name,value]of Object.entries({'inventory.json':inventory,'summary.json':report,'pdf-corrections.json':corrections,'tex-candidates.json':stagedTex,'tex-corrections.json':texChanges}))writeFileSync(resolve(root,output,name),json(value));
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const articles=corrections.map(c=>`<article><h2>${escape(c.blockId)}</h2><p>${escape(c.source.file)} · trang ${c.page} · ${c.glyphCount} glyphs</p><h3>Hiện tại</h3>${mathContentMarkup(c.before)}<h3>Đề xuất: cấu trúc toán đúng theo nguồn</h3>${mathContentMarkup(c.after)}<details><summary>Bằng chứng nguồn</summary><pre>${escape(json(c.evidence))}</pre></details></article>`).join('');
  const native=stagedTex.flatMap(t=>t.records.filter(r=>r.conversionOrigin==='existing-native-dialect-candidate').map(r=>`<article><h2>${escape(r.id)}</h2><p>${escape(t.source.file)} · dòng ${r.location.lines.join('–')} · chỉ xem trước, chưa tích hợp</p><pre>${escape(r.original)}</pre>${mathContentMarkup(r.content)}</article>`)).join('');
  writeFileSync(resolve(root,output,'preview.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biển Edu · Conversion recovery</title><link rel="stylesheet" href="/assets/vendor/katex/katex.min.css"><link rel="stylesheet" href="/assets/canonical-math.css"><style>body{font:16px/1.7 system-ui;color:#15263d;background:#f3f6fb;margin:0}main{max-width:1050px;margin:auto;padding:20px}article{padding:20px;background:white;border:1px solid #dce4ef;margin-block:20px;min-width:0;overflow-wrap:anywhere}h2,pre{overflow-wrap:anywhere}h2{font-size:1rem}pre{white-space:pre-wrap;font-size:.8rem}.canonical-math{max-width:100%}</style><main><h1>Khôi phục chuyển đổi toán học</h1><p>PARTIAL · Chỉ xem trước local. Chưa áp dụng nội dung. Render hợp lệ không có nghĩa toàn bộ công thức đã đối chiếu nguồn.</p><p>${corrections.length} khối PDF · ${report.pdfDifferentialGlyphs} ký tự vi phân đã kiểm tra vị trí gốc. Dữ liệu Geometry, tiến độ và chấm điểm được giữ nguyên.</p><h2>PDF: bản sửa đủ bằng chứng</h2>${articles}<h2>TEX độc lập: ứng viên sau sửa parser, không thay thế bản PDF</h2>${native}</main></html>`);
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const report=buildRecovery();console.log(json({...report,datasets:report.datasets,runtimeHashes:undefined,sources:report.sources.map(s=>({sourceId:s.sourceId,file:s.file}))}));}catch(e){console.error(e.message);process.exitCode=1;}
}
