// Read-only local delivery of the SAME learner routes and staged payloads.
// Only two release-pointer responses differ; no application files are written.
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,output,read,hash} from './conversion-recovery.mjs';
import assert from 'node:assert/strict';

export function conversionPreviewServer(){
  const summary=read(output+'/summary.json'),receipt=read(output+'/browser.json');
  assert.equal(receipt.passed,true);assert.equal(receipt.sharedSourceVerified,true);
  assert.deepEqual(receipt.candidate,summary.candidate);
  for(const pointer of Object.values(summary.candidate))assert.equal(hash(readFileSync(resolve(root,pointer.bundle))),pointer.sha256);
  const overrides=new Map([
    ['/assets/js/data/pdf-knowledge-release.js',`export const pdfKnowledgeRelease=${JSON.stringify(summary.candidate.knowledge)};`],
    ['/assets/js/data/geometry-activation.js',`export const geometryActivation=${JSON.stringify(summary.candidate.geometry)};`]
  ]);
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
  return createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Read-only preview');return;}
    if(!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/u.test(req.headers.host??'')){res.writeHead(403);res.end('Local preview only');return;}
    try{
      let path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(path==='/')path='/'+output+'/preview.html';
      if(path.startsWith('/.')&&path!=='/'+output+'/preview.html'||path.startsWith('/node_modules/')||path.startsWith('/scripts/'))throw Error('Private tooling');
      const file=resolve(root,'.'+path);assert.ok(file.startsWith(resolve(root)+sep));
      const bytes=overrides.has(path)?Buffer.from(overrides.get(path)):readFileSync(file);
      if(!overrides.has(path))assert.ok(statSync(file).isFile());
      res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);
    }catch{res.writeHead(404);res.end('Not found');}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const index=process.argv.indexOf('--port'),port=Number(index<0?8767:process.argv[index+1]);
  assert.ok(Number.isInteger(port)&&port>=1024&&port<=65535);
  conversionPreviewServer().listen(port,'127.0.0.1',()=>console.log(`Read-only conversion preview: http://127.0.0.1:${port}/\nLearner candidate: http://127.0.0.1:${port}/documents.html?grade=12&topic=CD12&type=12.1&section=knowledge&item=1\nActive release files and existing learner storage are untouched.`));
}
