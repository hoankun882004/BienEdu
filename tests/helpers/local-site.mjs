import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join,sep,extname} from 'node:path';
import {chromium} from 'playwright-core';
export async function localSite({fixtureRoot=null}={}){
  const root=process.cwd(),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.pdf':'application/pdf'};
  const server=createServer((req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://local').pathname);if(path.endsWith('/'))path+='index.html';let file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw new Error('Outside root');if(fixtureRoot){const candidate=resolve(fixtureRoot,'.'+path);if(candidate.startsWith(resolve(fixtureRoot)+sep)&&existsSync(candidate)&&statSync(candidate).isFile())file=candidate;}const bytes=readFileSync(file);res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
  await new Promise((done)=>server.listen(0,'127.0.0.1',done));
  const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
  const browser=await chromium.launch({executablePath,headless:true});
  return {browser,origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{await browser.close();server.closeAllConnections();await new Promise((done)=>server.close(done));}};
}
