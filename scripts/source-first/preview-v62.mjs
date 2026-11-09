import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './build.mjs';
import {safe,read} from './release-chain-v61.mjs';
import {validatePlan,output,releaseStatusV62} from './release-v62.mjs';
export async function previewServerV62(plan,{port=0}={}){
  validatePlan(plan);const overlays=new Map(plan.files.map(f=>['/'+f.file,f.after]));
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.pdf':'application/pdf'};
  const server=createServer((req,res)=>{try{
    if(!['GET','HEAD'].includes(req.method))throw Error('Read-only');
    if(!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/u.test(req.headers.host??''))throw Error('Local host required');
    let path=decodeURIComponent(new URL(req.url,'http://local').pathname);if(path.endsWith('/'))path+='index.html';
    if(path==='/__bienedu_v62_status'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(releaseStatusV62()));return;}
    if(path.includes('..')||path.includes('\\')||/^\/(?:\.git|\.content-work)\//u.test(path))throw Error('Private path');
    const bytes=overlays.get(path)??readFileSync(safe(root,path.slice(1)));res.writeHead(200,{'content-type':mime[extname(path)]??'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff','x-bienedu-mode':'read-only-v62-preview'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end();}});
  await new Promise(done=>server.listen(port,'127.0.0.1',done));return {server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(done=>{server.closeAllConnections();server.close(done);})};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const inventory=read(`${output}/inventory.json`),plan=read(inventory.manifest),i=process.argv.indexOf('--port'),port=i<0?8002:Number(process.argv[i+1]);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Local port 1024..65535 required');
  const site=await previewServerV62(plan,{port});console.log(`Read-only V6.2 preview: ${site.origin}/${output}/preview.html\nRuntime remains unchanged.`);
}
