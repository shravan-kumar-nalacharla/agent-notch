'use strict';
// Capture tool-generated evidence without executing the inspected applications.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'research', 'evidence');
fs.mkdirSync(out, { recursive: true });
const targets = [
  ['heynixi', 'inspect-desktop-application', path.join(root, 'research', 'heynixi')],
  ['nook-installer', 'inspect-artifact', 'C:/Users/shrav/Downloads/Nook-Setup-0.2.1.exe'],
  ['nusa-installer', 'inspect-artifact', 'C:/Users/shrav/Downloads/NusaSetup/NusaSetup.exe'],
  ['nusa-native','inspect-managed-artifact','C:/Users/shrav/AppData/Local/Programs/Nusa/nusa.exe'],
  ['voiceflow-native','inspect-managed-artifact','C:/Users/shrav/Downloads/voiceflow-main/VoiceFlow.exe'],
  ['twocode-source','analyze-javascript-application',path.resolve(root,'..','resources','app')],
  ['nook-source', 'analyze-javascript-application', path.join(root, 'research', 'nook', 'windows')],
  ['klyro-source', 'analyze-javascript-application', path.join(root, 'research', 'Klyro', 'common', 'frontend')]
];
for (const [name, operation, target] of targets) {
  if(process.argv.length>2&&!process.argv.slice(2).includes(name))continue;
  if (!/^[\w:/\\.-]+$/.test(target)) throw new Error('Research target must have a simple path without shell metacharacters.');
  const selection = name === 'nook-source' ? ['--source-path', 'src/main.ts', '--analysis-timeout-ms', '10000'] : name === 'klyro-source' ? ['--source-path', 'src/lib/modelCatalog.ts', '--analysis-timeout-ms', '10000'] : name==='twocode-source'?['--source-path','main.js','--analysis-timeout-ms','10000']:[];
  const localRuntime = process.env.REA_RUNTIME_ROOT;
  const args = [operation, target, ...selection, '--json'];
  const result = localRuntime
    ? spawnSync(path.join(localRuntime, 'node', 'bin', 'node.exe'), [path.join(localRuntime, 'rea-agents', 'scripts', 'rea.mjs'), ...args], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 60000 })
    : spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd --yes --package=node@24.22.1 --package=rea-agents@6.8.0 rea ${args.join(' ')}`], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 60000 });
  try { const evidence = JSON.parse(result.stdout); fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(evidence, null, 2)); const failed = evidence.ok === false || !!evidence.error || !!evidence.category; console.log(name, failed ? 'reported error' : 'evidence saved'); if (failed) process.exitCode = 1; }
  catch { console.log(name, 'failed:', result.error?.message || result.stderr?.slice(-250)); process.exitCode = 1; }
}
