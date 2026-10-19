'use strict';
// Read-only transport/source check; not a browser or production test.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const base = process.argv[2] || 'http://127.0.0.1:8014/';
  const label = process.argv[3] || 'preview-source-parity.json';
  assert.ok(/^http:\/\/127\.0\.0\.1:801[45]\/$/.test(base));
  assert.ok(/^[a-z0-9-]+\.json$/.test(label));
  const files = ['index.html', ...['js','css'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(f => /\.(js|css)$/.test(f)).map(f => dir + '/' + f))];
  const results = [];
  for (const file of files) {
    const response = await fetch(base + file, {signal: AbortSignal.timeout(10000), cache: 'no-store'});
    const served = Buffer.from(await response.arrayBuffer()), local = fs.readFileSync(path.join(root,file));
    const baseline = cp.execFileSync('git',['show','HEAD:trade-doc-demo/' + file],{cwd:root,maxBuffer:4*1024*1024});
    results.push({file,status:response.status,served:sha(served),local:sha(local),baseline:sha(baseline)});
  }
  const report = {timestamp:new Date().toISOString(),base,category:'HTTP source parity only',results};
  fs.writeFileSync(path.join(__dirname,label),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  assert.equal(results.length,13);
  assert.ok(results.every(r => r.status===200 && r.served===r.local && r.local===r.baseline));
  console.log('PASS 13 HTTP/local/HEAD runtime source fingerprints match; not browser validation');
}
main().catch(e => { console.error(e.message); process.exitCode=1; });
