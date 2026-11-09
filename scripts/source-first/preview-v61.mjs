// Read-only overlay server: actual learner routes with planned after-bytes.
// No release execution and no learner-data writes. Never bind a public address.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {extname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build.mjs';
import {read,safe,applyContinuation} from './release-chain-v61.mjs';
import {output} from './content-v61.mjs';
export function previewServer(plan,{port=0}={}){
  applyContinuation(plan); // Validate current baseline, dependencies, backups; dry run.
  const overlays=new Map(plan.files.map((f)=>['/'+f.file,f.after])),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.pdf':'application/pdf'};
  const server=createServer((req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://local').pathname);if(path.endsWith('/'))path+='index.html';
    // This is a development server for user-owned source data, never a deployment.
    if(path.includes('..')||path.includes('\\')||path.startsWith('/.git/')||path.startsWith('/.content-work/'))throw new Error('Private path');
    const bytes=overlays.get(path)??readFileSync(safe(root,path.slice(1)));res.writeHead(200,{'content-type':mime[extname(path)]??'application/octet-stream','cache-control':'no-store','x-bienedu-mode':'read-only-v61-preview'});res.end(bytes);
  }catch{res.writeHead(404);res.end();}});
  return new Promise((done)=>server.listen(port,'127.0.0.1',()=>done({server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise((resolve)=>{server.closeAllConnections();server.close(resolve);})})));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=read(`${output}/inventory.json`),plan=read(report.manifest),i=process.argv.indexOf('--port'),port=i>=0?Number(process.argv[i+1]):8001;
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a local port from 1024 to 65535');
  const site=await previewServer(plan,{port});console.log(`Read-only V6.1 learner preview: ${site.origin}/${output}/preview.html\nReal runtime remains unchanged. Ctrl+C stops this local server.`);
}
