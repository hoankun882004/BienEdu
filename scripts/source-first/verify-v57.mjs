// Keep heavyweight suites sequential: they regenerate shared legacy evidence.
// Persist real exit codes, including failure; never infer success from log text.
import { spawn } from 'node:child_process';
import { openSync, closeSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const output = join(root, '.audit/source-first-v5/canonical-v5.7');
mkdirSync(output, { recursive: true });
const results = [];
const suites = ['content:canonical:preview', 'verify', 'test:source-first', 'test:canonical'];
for (const suite of suites) {
  const log = `${suite.replaceAll(':', '-')}-final.log`;
  const fd = openSync(join(output, log), 'w');
  const startedAt = new Date().toISOString();
  console.log(`Starting ${suite}; log: ${log}`);
  const exitCode = await new Promise((done) => {
    const child = spawn('cmd.exe', ['/d', '/c', `npm.cmd run ${suite}`], { cwd: root, windowsHide: true, stdio: ['ignore', fd, fd] });
    child.once('error', (error) => { console.error(error); done(-1); });
    child.once('exit', (code) => done(code ?? -1));
  });
  closeSync(fd);
  results.push({ command: `npm.cmd run ${suite}`, exitCode, startedAt, finishedAt: new Date().toISOString(), log });
  writeFileSync(join(output, 'verification-exits.json'), JSON.stringify({ sequential: true, results }, null, 2));
  console.log(`${suite}: exit ${exitCode}`);
  if (exitCode !== 0) { process.exitCode = exitCode; break; }
}
