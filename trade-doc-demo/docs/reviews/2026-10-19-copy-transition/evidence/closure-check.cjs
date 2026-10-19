'use strict';
// Read back delivered bytes; no product mutations or browser interactions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const final = read('final-verified.json');
assert.deepEqual(final.summary, { scripts:45, failures:0, archives:5, archiveFailures:0, syntax:57, syntaxFailures:0 });
assert.equal(final.unchanged, true);
const mismatches = Object.entries(final.after).filter(([file, sha]) => digest(path.join(root, file)) !== sha).map(([file]) => file);
assert.deepEqual(mismatches, [], 'delivered runtime/tool bytes equal final test bytes');
cp.execFileSync('git', ['diff','--exit-code',final.baseline,'--','js/mock-data.js','css'], {cwd:root,stdio:'pipe'});
cp.execFileSync('git', ['diff','--check'], {cwd:root,stdio:'pipe'});
// Contract negative fixtures intentionally include non-JSON bytes such as
// "existing evidence" to prove no-overwrite behavior. Parse actual reports only.
for (const name of ['candidate.json','final-verified.json','browser-final.json','browser-quality-recheck.json','copy-browser.json']) read(name);
JSON.parse(fs.readFileSync(path.join(root,'.impeccable/design.json'),'utf8'));
const entry = fs.readFileSync(path.join(root,'index.html'),'utf8');
const resources = [...entry.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1].split('?')[0]);
for (const resource of resources) assert.ok(fs.existsSync(path.join(root, resource)), 'entry resource: '+resource);
assert.equal(resources.filter(file => file.endsWith('.js')).length, 9);
assert.equal(resources.filter(file => file.endsWith('.css')).length, 3);
const docs = ['README.md','docs/reviews/2026-10-19-copy-transition/README.md','docs/iterations/2026-10-19-copy-transition.md'];
let links = 0;
for (const doc of docs) {
  const text = fs.readFileSync(path.join(root,doc),'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target) || target.endsWith('/closure.json')) continue;
    assert.ok(fs.existsSync(path.resolve(root,path.dirname(doc),target)), doc+': '+target); links++;
  }
}
const matrix = read('browser-final.json'), quality = read('browser-quality-recheck.json'), copy = read('copy-browser.json');
assert.equal(matrix.result,'FAIL'); // Preserve original two tool failures.
const stages = matrix.stages.map(stage => ({name:stage.name,result:stage.result,checks:stage.checks.length}));
assert.equal(matrix.stages.find(stage=>stage.name==='matrix').checks.length,100);
assert.equal(matrix.stages.find(stage=>stage.name==='business').result,'PASS');
assert.equal(quality.result,'PASS'); assert.equal(quality.stages[0].checks.length,11);
assert.equal(copy.result,'PASS'); assert.equal(copy.cases.length,5);
for (const report of [matrix,quality]) for (const diagnostic of Object.values(report.diagnostics)) if (diagnostic.attempted) assert.equal(diagnostic.restored,true);
const images = ['login','map','order','document','password-info'].map(name=> {
  const filename=name+'-iab-1280.jpg', absolute=path.join(__dirname,filename);
  const pixels=cp.execFileSync('sips',['-g','pixelWidth','-g','pixelHeight',absolute],{encoding:'utf8'});
  return {filename,sha256:digest(absolute),width:Number(pixels.match(/pixelWidth: (\d+)/)[1]),height:Number(pixels.match(/pixelHeight: (\d+)/)[1]),engine:'Codex IAB',viewportRequested:{width:1280,height:900},protocol:'HTTP',visuallyReadBy:['root','copy_independent']};
});
const evidenceSyntax = fs.readdirSync(__dirname).filter(file => /\.(cjs|mjs)$/.test(file));
for (const file of evidenceSyntax) cp.execFileSync(process.execPath,['--check',path.join(__dirname,file)],{stdio:'pipe'});
const output={timestamp:new Date().toISOString(),result:'PASS',testedSourceHashes:final.after,sourceMismatches:mismatches,mockAndCssUnchanged:true,entryResources:resources,localLinksChecked:links,evidenceSyntax,firstBrowserResult:matrix.result,firstBrowserStages:stages,qualityRecheckResult:quality.result,copyAcceptanceResult:copy.result,images,cleanup:{egoSpace:19,finishedOnce:true,keptPages:[],iabViewportReset:true,iabTemporaryTabClosed:true,temporary8015Stopped:true,original8014Untouched:true},limits:['First browser overall FAIL retained; later quality-only PASS is separate.','Ego screenshot TOOL_ERROR retained; five saved JPEGs come from IAB.','Static frontend, not production approval; file protocol not tested.']};
fs.writeFileSync(path.join(__dirname,'closure.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:output.result,sourceHashes:Object.keys(final.after).length,localLinks:links,evidenceSyntax:evidenceSyntax.length,images:images.length}));
