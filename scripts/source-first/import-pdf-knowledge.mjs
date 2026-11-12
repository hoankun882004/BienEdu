import {readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {documentSources} from '../../assets/js/data/document-mappings.js';
import {validateContent} from '../../assets/js/components/canonical-math.js';
import {immutable} from './release-chain-v61.mjs';
import {applySourceTranscriptions} from './knowledge-transcriptions.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const json = value => JSON.stringify(value, null, 2) + '\n';
const added = {
  'Day-so-Cap-so-CD17-CD19.pdf': ['cd17-cd19-sequences-2026','46ECFCD53189EAD5F9964FB4F8943E09EAC7FF667322221698F2CC47E5546E5E'],
  'Luong-giac-CD15-CD16.pdf': ['cd15-cd16-trigonometry-2026','AF0BE0528550ECC43B2000809F8F50C2A0E2C41326D71F57A9FBBCBB02C7A154'],
  'Nguyen-ham-Tich-phan-CD12-CD14.pdf': ['cd12-cd14-calculus-2026','AF0D521E8C595C7879E1D272784BAD6F2907198126B0D9A1E37D892238669C22'],
  'Vecto-Oxyz-CD28-CD33 (1).pdf': ['cd28-cd33-vector-2026','98C0C21CC5D42D246938AADB4A0AE48C7DF488B113BF6B2551414C965CBA2114']
};

export function importPdfKnowledge() {
  const sources = readdirSync(resolve(root,'39 chuyên đề')).filter(name=>name.endsWith('.pdf')).map(name=>{
    const file = '39 chuyên đề/' + name, sha256 = hash(readFileSync(resolve(root,file)));
    const registered = documentSources.find(source=>source.sourceSha256 === sha256);
    const [sourceId, expected] = registered ? [registered.id, registered.sourceSha256] : added[name] ?? [];
    if (!sourceId || expected !== sha256) throw new Error('Unregistered or changed original PDF: ' + file);
    return {sourceId, file, sha256};
  });
  const run = spawnSync('python',['-X','utf8',resolve(root,'scripts/source-first/knowledge-pdf.py')],{
    input:JSON.stringify(sources),encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024
  });
  if(run.status!==0) throw new Error(run.stderr || run.stdout || `PDF extractor exited ${run.status}`);
  const evidence = JSON.parse(run.stdout);
  const sourceTranscriptions = applySourceTranscriptions(evidence);
  let formulas = 0;
  const visit = node => {
    if(!node) return;
    if(node.type==='math') formulas++;
    if(node.type==='rich-text') node.segments.forEach(visit);
  };
  for(const source of evidence.sources) for(const record of source.records){
    for(const block of record.blocks){
      const nodes = block.kind==='table' ? block.rows.flat().filter(Boolean) : block.content ? [block.content] : [];
      for(const node of nodes){
        visit(node);
        const validation = validateContent(node);
        if(!validation.valid) block.errors.push('CANONICAL_VALIDATION:' + JSON.stringify(validation.errors));
        const unresolved=n=>n.type==='unresolved'||(n.type==='rich-text'&&n.segments.some(unresolved));
        if(unresolved(node))block.errors.push('UNRESOLVED_CANONICAL_NODE');
      }
    }
    record.complete = record.blocks.length > 0 && record.blocks.every(block=>!block.errors.length);
  }
  const records = evidence.sources.flatMap(source=>source.records);
  const issues = records.flatMap(record=>record.blocks.filter(block=>block.errors.length).map(block=>({
    recordId:record.id, key:record.key, sourceId:record.source.sourceId, page:block.page,
    blockId:block.id, original:block.original, errors:block.errors
  })));
  const summary = {sources:sources.length, pages:evidence.sources.reduce((n,s)=>n+s.source.pageCount,0),
    records:records.length, complete:records.filter(r=>r.complete).length,
    blocks:records.reduce((n,r)=>n+r.blocks.length,0), formulasChecked:formulas, sourceTranscriptions, unresolvedBlocks:issues.length,
    unresolvedTextBlocks:records.reduce((n,r)=>n+r.blocks.filter(b=>b.kind!=='figure'&&b.errors.length).length,0),
    unresolvedFigureBlocks:records.reduce((n,r)=>n+r.blocks.filter(b=>b.kind==='figure').length,0),
    bySource:evidence.sources.map(s=>({sourceId:s.source.sourceId, records:s.records.length,
      complete:s.records.filter(r=>r.complete).length, issues:s.records.flatMap(r=>r.blocks.filter(b=>b.errors.length)).length}))};
  mkdirSync(resolve(root,'.audit/pdf-knowledge'),{recursive:true});
  writeFileSync(resolve(root,'.audit/pdf-knowledge/evidence.json'),json(evidence));
  writeFileSync(resolve(root,'.audit/pdf-knowledge/issues.json'),json(issues));
  writeFileSync(resolve(root,'.audit/pdf-knowledge/summary.json'),json(summary));
  return {evidence,summary};
}

export function prepareKnowledge(evidence) {
  const articles=evidence.sources.flatMap(source=>source.records.filter(record=>record.blocks.length).map(record=>{
    const targets=record.scope==='shared'
      ? (record.key==='CD08-CD11'?['CD08','CD09','CD10','CD11']:['12.1','13.1','14.1'])
      : ['CD20','CD21'].includes(record.key)?[`${Number(record.key.slice(2))}.1`]:[record.key];
    return {id:record.id, targets, scope:record.scope, kind:record.kind, title:record.title, source:record.source,
      sourcePages:record.sourcePages, glyphHash:record.glyphHash,
      unresolvedText:record.blocks.filter(b=>b.kind!=='figure'&&b.errors.length).length,
      unresolvedFigures:record.blocks.filter(b=>b.kind==='figure').length,
      blocks:record.blocks.filter(b=>!b.errors.length).map(({evidence,original,errors,...block})=>block)};
  }));
  return {schemaVersion:'bienedu.pdf-knowledge.v1', editorialApprovalRequired:false,
    policy:'Literal source content only; separate editions; automatic glyph/KaTeX validation, not human approval. Unresolved blocks are not published as recovered content.',articles};
}

export function activateKnowledge(payload, summary) {
  if(payload.articles.some(article=>article.unresolvedText>0))throw new Error('Unresolved PDF text/formulas: activation blocked, existing lessons retained');
  const bytes=json(payload),sha256=hash(bytes),bundle=`assets/content/pdf-knowledge/${sha256}.json`;
  const target=resolve(root,'documents.html'),before=readFileSync(target,'utf8');
  const parent=JSON.parse(readFileSync(resolve(root,'.audit/local-pdf-visibility/receipt.json'),'utf8'));
  const receiptFile=resolve(root,'.audit/pdf-knowledge/activation.json');
  const prior=existsSync(receiptFile)?JSON.parse(readFileSync(receiptFile,'utf8')):null;
  const activationFile=resolve(root,'assets/js/data/pdf-knowledge-release.js');
  const activationBefore=existsSync(activationFile)?readFileSync(activationFile,'utf8'):null;
  const activationAfter=`// Generated by scripts/source-first/import-pdf-knowledge.mjs --apply\nexport const pdfKnowledgeRelease = Object.freeze(${JSON.stringify({bundle,sha256})});\n`;
  const previousMap='./assets/js/data/knowledge-v6.js',nextMap='./assets/js/data/knowledge-pdf.js';
  const previousRenderer='./assets/js/components/canonical-math-renderer.js?v=5.7',nextRenderer='./assets/js/components/pdf-knowledge-renderer.js';
  let after=before.replace(`:"${previousMap}"`,`:"${nextMap}"`).replace(`:"${previousRenderer}"`,`:"${nextRenderer}"`);
  if(!after.includes(nextMap)||!after.includes(nextRenderer))throw new Error('Existing learner import map not found');
  if(!after.includes('href="assets/pdf-knowledge.css'))after=after.replace('  <link rel="stylesheet" href="assets/learning-v6.css','  <link rel="stylesheet" href="assets/pdf-knowledge.css?v=1">\n  <link rel="stylesheet" href="assets/learning-v6.css');
  const dependencies=['assets/js/data/knowledge-pdf.js','assets/js/data/pdf-knowledge-model.js',
    'assets/js/components/pdf-knowledge-renderer.js','assets/pdf-knowledge.css',
    'scripts/source-first/knowledge-pdf.py','scripts/source-first/knowledge-transcriptions.mjs',
    'scripts/source-first/import-pdf-knowledge.mjs'].map(file=>({file,sha256:hash(readFileSync(resolve(root,file)))}));
  if(prior?.sha256===sha256&&before===after&&activationBefore===activationAfter&&JSON.stringify(prior.dependencies)===JSON.stringify(dependencies))return prior;
  const body={schemaVersion:'bienedu.pdf-knowledge.local-activation.v1',scope:'local only; no commit/push/deploy',
    parent:prior?.planHash??parent.planHash, bundle,sha256,sources:payload.articles.map(a=>a.source).filter((s,i,all)=>all.findIndex(t=>t.sourceId===s.sourceId)===i),
    dependencies,files:[{file:'documents.html',beforeHash:hash(before),afterHash:hash(after)},
      {file:'assets/js/data/pdf-knowledge-release.js',beforeHash:activationBefore===null?null:hash(activationBefore),afterHash:hash(activationAfter)}],
    preserved:{exampleBundleHash:parent.contentHash,progressKeys:true,practiceScoring:true,sourcePdfs:true,historicalManifests:true},summary};
  const manifest={...body,planHash:hash(json(body))};
  const directory=resolve(root,'.content-work/pdf-knowledge',manifest.planHash);mkdirSync(directory,{recursive:true});
  immutable(resolve(directory,'manifest.json'),json(manifest));immutable(resolve(directory,'documents.before.html'),before);
  if(activationBefore!==null)immutable(resolve(directory,'activation.before.js'),activationBefore);
  mkdirSync(resolve(root,'assets/content/pdf-knowledge'),{recursive:true});immutable(resolve(root,bundle),bytes);
  // Generated activation pointer; original mathematical payloads stay immutable.
  if(activationBefore!==activationAfter)writeFileSync(activationFile,activationAfter);
  if(after!==before)writeFileSync(target,after);
  const receipt={...manifest,status:'APPLIED_LOCAL_ONLY',backup:`.content-work/pdf-knowledge/${manifest.planHash}/documents.before.html`,
    previousPublicationAuthorization:'Preserved but stale for these new runtime additions; a fresh preview is required before future publication.'};
  writeFileSync(resolve(root,'.audit/pdf-knowledge/activation.json'),json(receipt));
  return receipt;
}

if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Always replay the read-only original PDFs. Mutable audit JSON is never an
  // authorization to substitute educational content during application.
  const result=importPdfKnowledge();
  // Even a cached extraction cannot be applied against changed sources.
  for(const source of result.evidence.sources)if(hash(readFileSync(resolve(root,source.source.file)))!==source.source.sha256)throw new Error('Stale PDF evidence');
  const payload=prepareKnowledge(result.evidence);
  const application=process.argv.includes('--apply')?activateKnowledge(payload,result.summary):null;
  console.log(json({summary:result.summary,articles:payload.articles.length,application}));
}
