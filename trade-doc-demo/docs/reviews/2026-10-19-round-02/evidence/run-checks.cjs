/* Root-controlled verification evidence. No product mutations. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const label = process.argv[2];
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Explicit safe report label required');
const output = path.join(__dirname, label + '-results.json');
if (fs.existsSync(output)) throw new Error('Refusing to overwrite evidence');
const sourceFiles = ['index.html', ...['js', 'css', 'scripts'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(f => /\.(js|cjs|mjs|css)$/.test(f)).map(f => dir + '/' + f))];
const hashes = () => Object.fromEntries(sourceFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const before = hashes();
const invoke = args => {
  const start = Date.now();
  const r = cp.spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 12 * 1024 * 1024});
  return {args, exitCode: r.status, signal: r.signal, elapsedMs: Date.now() - start, error: r.error?.message, stdout: r.stdout, stderr: r.stderr};
};
const names = fs.readdirSync(path.join(root, 'scripts')).filter(n => /^verify-.*\.cjs$/.test(n)).sort();
const results = names.map(name => { const r = invoke(['scripts/' + name]); console.log(name + ': ' + (r.exitCode === 0 ? 'PASS' : 'FAIL')); return r; });
const archives = ['approval-context', 'document-dashboard', 'document-status-guidance', 'document-action-guidance', 'history-gates'].map(name => invoke(['scripts/verify-' + name + '.cjs', '--archive']));
const syntax = sourceFiles.filter(f => /\.(js|cjs|mjs)$/.test(f)).map(file => invoke(['--check', file]));
const after = hashes();
const report = {timestamp: new Date().toISOString(), node: process.version, head: cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(), before, after, unchanged: JSON.stringify(before) === JSON.stringify(after), results, archives, syntax};
report.summary = {defaultScripts: results.length, defaultFailures: results.filter(r => r.exitCode !== 0).length, archives: archives.length, archiveFailures: archives.filter(r => r.exitCode !== 0).length, syntax: syntax.length, syntaxFailures: syntax.filter(r => r.exitCode !== 0).length};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({...report.summary, unchanged: report.unchanged}));
if (report.summary.defaultFailures || report.summary.archiveFailures || report.summary.syntaxFailures || !report.unchanged) process.exitCode = 1;
