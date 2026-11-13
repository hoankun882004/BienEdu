import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stageGeometryNavigation} from './geometry-navigation.mjs';
export const workspace=fileURLToPath(new URL('../../',import.meta.url));
export function previewDocument(html){
  if(!html.includes('src="assets/js/geometry-loader.js'))html=html.replace('</body>','<script type="module" src="assets/js/geometry-loader.js?v=1"></script>\n</body>');
  return html.replace('</head>','<meta name="bienedu-geometry-preview" content="v1">\n</head>');
}
export function geometryServer(root=workspace,{preview=true}={}){
  root=resolve(root);const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};
  return createServer((req,res)=>{try{
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=resolve(root,'.'+(path.endsWith('/')?path+'geometry-preview.html':path));
    if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('Not found');
    // Preview-only source references are read-only; no write endpoints exist.
    let bytes=readFileSync(file);if(preview&&path==='/documents.html')bytes=Buffer.from(previewDocument(bytes.toString('utf8')));
    if(preview&&path==='/assets/js/curriculum.js')bytes=Buffer.from(stageGeometryNavigation(bytes.toString('utf8')));
    res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const option=process.argv.indexOf('--port'),port=Number(option<0?8010:process.argv[option+1]);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
  geometryServer().listen(port,'127.0.0.1',()=>console.log(`Geometry preview: http://127.0.0.1:${port}/geometry-preview.html — active files untouched`));
}
