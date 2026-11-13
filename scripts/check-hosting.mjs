// Validate the PUBLIC browser dependency closure, not merely local file existence.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {localRelease} from '../assets/js/data/local-release.js';
import {pdfKnowledgeRelease} from '../assets/js/data/pdf-knowledge-release.js';
import {geometryActivation} from '../assets/js/data/geometry-activation.js';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const entries=['index.html','course.html','documents.html','quiz.html','contact.html'];
export const privatePath=path=>/^\/(?:scripts|\.audit|\.content-work|node_modules|\.git)(?:\/|$)/u.test(path);
export function specifiers(source){
  const found=new Set();for(const pattern of [/\bfrom\s+["']([^"']+)["']/gu,/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,/\bimport\s+["']([^"']+)["']/gu])for(const match of source.matchAll(pattern))if(/^(?:\.|\/)/u.test(match[1]))found.add(match[1]);return [...found];
}
function publicFile(url,base){
  assert.equal(url.origin,'https://bienedu.example','External URL in local dependency closure');assert.equal(privatePath(url.pathname),false,'Browser depends on private deployment path: '+url.pathname);
  const file=resolve(base,'.'+decodeURIComponent(url.pathname));assert.ok(file.startsWith(resolve(base)+sep),'Path outside checkout');assert.ok(existsSync(file),'Missing deployment file: '+url.pathname);
  // Windows may resolve wrong-case imports which Linux hosting rejects.
  let parent=resolve(base);for(const segment of relative(base,file).split(sep)){assert.ok(readdirSync(parent).includes(segment),'Case mismatch in deployment path: '+url.pathname);parent=resolve(parent,segment);}return file;
}
export function checkHosting(base=root){
  const modules=new Set(),assets=new Set();
  for(const entry of entries){
    const page=new URL(entry,'https://bienedu.example/'),html=readFileSync(resolve(base,entry),'utf8'),imports=new Map();
    for(const match of html.matchAll(/<script\s+type="importmap">([\s\S]*?)<\/script>/gu))for(const [key,value]of Object.entries(JSON.parse(match[1]).imports??{}))imports.set(new URL(key,page).href,new URL(value,page).href);
    const queue=specifiers(html).map(s=>new URL(s,page));
    for(const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|mjs|css)(?:\?[^"']*)?)["']/gu)){
      const url=new URL(match[1],page);if(url.origin!==page.origin)continue;const file=publicFile(url,base);assets.add(relative(base,file).replaceAll('\\','/'));if(/\.m?js$/u.test(url.pathname))queue.push(url);
    }
    for(const target of imports.values())queue.push(new URL(target));
    const seen=new Set();while(queue.length){
      let url=queue.pop();if(imports.has(url.href))url=new URL(imports.get(url.href));if(seen.has(url.href))continue;seen.add(url.href);
      const file=publicFile(url,base);modules.add(relative(base,file).replaceAll('\\','/'));
      for(const dependency of specifiers(readFileSync(file,'utf8')))queue.push(new URL(dependency,url));
    }
  }
  const payloads=[{file:localRelease.bundle,hash:localRelease.bundleHash},{file:pdfKnowledgeRelease.bundle,hash:pdfKnowledgeRelease.sha256},...(geometryActivation?[{file:geometryActivation.bundle,hash:geometryActivation.sha256}]:[])];
  for(const payload of payloads){publicFile(new URL(payload.file,'https://bienedu.example/'),base);assert.equal(createHash('sha256').update(readFileSync(resolve(base,payload.file))).digest('hex').toUpperCase(),payload.hash,'Content-addressed payload changed: '+payload.file);}
  const rules=readFileSync(resolve(base,'.vercelignore'),'utf8').split(/\r?\n/u).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  assert.ok(rules.includes('scripts/source-first/'),'Keep source preparation tools private');assert.ok(!rules.some(x=>/^\/?assets(?:\/|$)/u.test(x)),'Public assets must not be excluded from deployment');
  return {passed:true,pages:entries.length,modules:[...modules].sort(),stylesAndScripts:[...assets].sort(),payloadsChecked:payloads.length,privateBrowserImports:0,caseSensitivePaths:true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const report=checkHosting();console.log(JSON.stringify({passed:report.passed,pages:report.pages,modules:report.modules.length,payloadsChecked:report.payloadsChecked,privateBrowserImports:0},null,2));}
