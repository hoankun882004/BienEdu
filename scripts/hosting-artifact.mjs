// A real public-only artifact; no source-tree fallback when an asset is missing.
import fs from 'node:fs';
import {resolve,relative,sep,extname} from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {checkHosting,entries,privatePath} from './check-hosting.mjs';
export const artifact=resolve('.audit/stabilization-v2/public');
export function buildArtifact(){
  assert.ok(artifact.startsWith(resolve('.audit/stabilization-v2')+sep));
  // New directory per input digest avoids stale assets from a previous build.
  const closure=checkHosting();const files=[...entries,'.vercelignore'];
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);files.push(...walk('assets'));
  const hashes=files.map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
  const hash=createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),folder=resolve(artifact,hash);fs.mkdirSync(folder,{recursive:true});
  for(const {file}of hashes){const dest=resolve(folder,file);assert.ok(dest.startsWith(folder+sep));fs.mkdirSync(resolve(dest,'..'),{recursive:true});fs.copyFileSync(file,dest);}
  checkHosting(folder);const manifest={passed:true,folder,hash,files:hashes,closure};fs.writeFileSync('.audit/stabilization-v2/artifact.json',JSON.stringify(manifest,null,2));return manifest;
}
export function artifactServer(folder){
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon'};
  return createServer((req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://local').pathname);assert.equal(privatePath(p),false);if(p.endsWith('/'))p+='index.html';const file=resolve(folder,'.'+p);assert.ok(file.startsWith(folder+sep));assert.ok(fs.statSync(file).isFile());res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
}
