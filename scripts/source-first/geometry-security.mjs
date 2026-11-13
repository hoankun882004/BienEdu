// Diagnostics report locations/counts ONLY, never matched credential values.
import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,relative} from 'node:path';
import {workspace} from './geometry-server.mjs';
const rules=[['cursor-access-token',/\bcrsr_[A-Za-z0-9_-]{24,}/gu],['bearer-token',/\bBearer\s+[A-Za-z0-9._~-]{24,}/giu],['openai-key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/gu],['github-token',/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/gu],['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu]];
const findings=[];let scannedFiles=0;
function visit(folder){if(!existsSync(folder))return;for(const entry of readdirSync(folder,{withFileTypes:true})){
  const file=join(folder,entry.name);if(entry.isDirectory()){visit(file);continue;}if(!/\.(?:json|jsonl|md|html|log|js|mjs|txt|py)$/iu.test(entry.name))continue;
  const content=readFileSync(file,'utf8');scannedFiles++;
  for(const [kind,pattern]of rules){pattern.lastIndex=0;for(const match of content.matchAll(pattern))findings.push({file:relative(workspace,file).replaceAll('\\','/'),line:content.slice(0,match.index).split('\n').length,kind});}
}}
visit(join(workspace,'.audit'));visit(join(workspace,'.content-work/geometry-v1'));visit(join(workspace,'docs/content'));
const report={schemaVersion:'bienedu.geometry-security.v1',scannedFiles,findings,reportValuesRedacted:true,previousChatDiagnosticExposure:true,credentialRevocationConfirmed:false,scope:'Generated audit reports, docs/content and this continuation manifests; no credential values are printed or copied'};
writeFileSync(join(workspace,'.audit/geometry-v1/security.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scannedFiles,findings:findings.length,locations:findings,credentialRevocationConfirmed:false},null,2));if(findings.length)process.exitCode=1;
