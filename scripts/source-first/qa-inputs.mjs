// Fingerprint actual QA inputs, not mutable output reports or wall-clock time.
import fs from 'node:fs';
import {hash,json,read,output} from './conversion-recovery.mjs';
export function qaInputs(){
  const files=new Set(['package.json','package-lock.json','.audit/pdf-knowledge/evidence.json']);
  const walk=directory=>{for(const e of fs.readdirSync(directory,{withFileTypes:true})){const file=directory+'/'+e.name;if(e.isDirectory()){if(e.name!=='__pycache__')walk(file);}else if(directory.startsWith('assets')||/\.(?:mjs|js|py|json)$/u.test(file))files.add(file);}};
  for(const dir of ['assets','scripts','tests'])walk(dir);
  for(const source of read(output+'/summary.json').sources)files.add(source.file);
  return Object.fromEntries([...files].sort().filter(f=>fs.existsSync(f)).map(f=>[f,hash(fs.readFileSync(f))]));
}
