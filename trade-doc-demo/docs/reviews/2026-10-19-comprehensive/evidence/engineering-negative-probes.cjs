'use strict';
// Review-only, read-only probes. Product inputs are replaced in memory only.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const baseline = '4c674496667fd31078194ca81c0d0a4f081eda21';
const mode = process.argv.includes('--current') ? 'current' : 'baseline';
const loadSource = file => mode === 'current' ? fs.readFileSync(path.join(root, file), 'utf8')
  : execFileSync('git', ['show', baseline + ':trade-doc-demo/' + file], { cwd: root, encoding: 'utf8' });
const verifier = path.join(root, 'scripts/verify-demo.cjs');
const source = loadSource('scripts/verify-demo.cjs');
const entry = loadSource('index.html');
function checkMutatedEntry(label, html) {
  const output = [];
  const interceptedFs = new Proxy(fs, { get(target, property) {
    if (property === 'readFileSync') return file => path.resolve(String(file)) === path.join(root, 'index.html') ? html : loadSource(path.relative(root, file));
    return target[property];
  } });
  let rejected = false;
  try {
    vm.runInNewContext(source, {
      require: name => name === 'node:fs' ? interceptedFs : require(name),
      __dirname: path.dirname(verifier), console: { log: text => output.push(text) }
    }, { filename: verifier });
  } catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; rejected = true; }
  assert.equal(rejected, mode === 'current', 'baseline must reproduce the miss; current must reject malformed assembly');
  if (!rejected) assert.equal(JSON.parse(output.join('\n')).result, 'PASS');
  const assets = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1].split('?')[0]);
  const c = vm.createContext({ document: { addEventListener() {} } }); c.window = c;
  let runtimeError = null;
  for (const asset of assets) {
    try { vm.runInContext(loadSource(asset), c, { filename: asset }); }
    catch (error) { runtimeError = { asset, name: error.name, message: error.message }; break; }
  }
  console.log(JSON.stringify({ mode, probe: label, existingVerifier: rejected ? 'REJECTED' : 'PASS', runtimeError, appDefinedAfterDeclaredScripts: !!c.App, declaredScripts: assets }));
  return { c, runtimeError };
}
const originalScripts = [...entry.matchAll(/<script src="([^"]+)"/g)].map(match => match[0]);
const swap = checkMutatedEntry('entry-utils-before-mock', entry.replace(originalScripts[0], '__FIRST_SCRIPT__').replace(originalScripts[1], originalScripts[0]).replace('__FIRST_SCRIPT__', originalScripts[1]));
assert.equal(swap.runtimeError.asset, 'js/utils.js');
const missingApp = checkMutatedEntry('entry-duplicate-utils-omits-app', entry.replace('js/app.js?', 'js/utils.js?'));
assert.equal(missingApp.runtimeError.asset, 'js/utils.js');
assert.match(missingApp.runtimeError.message, /Cannot redefine property: snapshot/);
assert.equal(missingApp.c.App, undefined);

const checkerModule = { exports: {} };
vm.runInNewContext(loadSource('scripts/verify-production-contract.cjs'), {
  require, module: checkerModule, exports: checkerModule.exports,
  __dirname: path.join(root, 'scripts'), console, process
}, { filename: 'verify-production-contract-' + mode + '.cjs' });
const { validate } = checkerModule.exports;
const read = name => JSON.parse(loadSource('docs/production/' + name));
const api = read('slice-01.openapi.json'), model = read('slice-01.data-model.json'), matrix = read('slice-01.acceptance.json');
for (const [table, column] of [['quote_line', 'unit_price'], ['quote', 'total_amount'], ['order_line', 'line_amount']]) {
  const mutated = structuredClone(model);
  mutated.tables[table].columns[column].type = 'binaryFloat';
  const result = validate(api, mutated, matrix);
  assert.equal(result.errors.length > 0, mode === 'current');
  console.log(JSON.stringify({ mode, probe: 'storage-exact-decimal-replaced', table, column, actualType: model.tables[table].columns[column].type, mutatedType: 'binaryFloat', checkerErrors: result.errors, checks: result.checks }));
}
console.log(JSON.stringify({ mode, baseline, result: 'PASS', meaning: mode === 'current' ? 'Five malformed inputs rejected by fixed checkers' : 'Five review probes reproduced baseline assurance gaps; NOT a current product or database failure', productFilesModified: false }));
