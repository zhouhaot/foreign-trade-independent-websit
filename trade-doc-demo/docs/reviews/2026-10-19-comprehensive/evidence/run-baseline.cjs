/* Review evidence generator: no product writes; explicit output directory only. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const label = process.argv[2] || 'baseline';
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('invalid report label');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const scripts = fs.readdirSync(path.join(root, 'scripts')).filter(n => /^verify-.*\.cjs$/.test(n)).sort();
const runtime = ['index.html', ...fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js')).map(n => 'js/' + n), ...fs.readdirSync(path.join(root, 'css')).filter(n => n.endsWith('.css')).map(n => 'css/' + n)];
const fingerprints = () => Object.fromEntries(runtime.map(f => [f, hash(f)]));
const before = fingerprints();
const checks = files => files.map(file => {
  const result = cp.spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8', timeout: 30000 });
  return { file, status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr };
});
const results = scripts.map(file => {
  const start = Date.now();
  const result = cp.spawnSync(process.execPath, ['scripts/' + file], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  console.log(file + ': ' + (result.status === 0 ? 'PASS' : 'FAIL'));
  return { file, category: file === 'verify-production-contract.cjs' ? 'design-static' : 'demo-contract', status: result.status, signal: result.signal, elapsedMs: Date.now() - start, error: result.error?.message, stdout: result.stdout, stderr: result.stderr };
});
const syntax = checks([...runtime.filter(f => f.endsWith('.js')), ...fs.readdirSync(path.join(root, 'scripts')).filter(f => /\.(cjs|mjs)$/.test(f)).map(f => 'scripts/' + f)]);
const after = fingerprints();
const report = { timestamp: new Date().toISOString(), clientReviewDate: '2026-10-19', node: process.version, platform: process.platform, arch: process.arch,
  head: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), label, before, after, unchanged: JSON.stringify(before) === JSON.stringify(after), results, syntax,
  summary: { scripts: results.length, scriptFailures: results.filter(r => r.status !== 0).length, syntax: syntax.length, syntaxFailures: syntax.filter(r => r.status !== 0).length } };
fs.writeFileSync(path.join(__dirname, label + '-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report.summary, unchanged: report.unchanged }));
if (report.summary.scriptFailures || report.summary.syntaxFailures || !report.unchanged) process.exitCode = 1;
