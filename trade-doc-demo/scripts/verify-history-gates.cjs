'use strict';
// Gate tests use an isolated source copy and in-memory mutations; never edit runtime/archive files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { archiveEnabled, reportFailure, reportArchive } = require('./history-gate.cjs');
const root = path.resolve(__dirname, '..');
const scripts = ['approval-context', 'document-dashboard', 'document-status-guidance', 'document-action-guidance'];
const published = 'f8643db82e4daf0f41904a37ab34cdc071393365';
const expectedObjects = {
  'approval-context': ['d9b1748c27102c2631dd6aed9df9e4e3af486d9f:views-fin', published + ':views-fin'],
  'document-dashboard': ['77deae8ae937c0c1d005d4b3b019d5d150e623b8:utils', '77deae8ae937c0c1d005d4b3b019d5d150e623b8:views-core', ...['mock-data', 'utils', 'views-core'].map(n => published + ':' + n)],
  'document-status-guidance': ['58a65822e400fcd75398b642456648bd558a8e24:views-docs', 'ac8d5a9cb684964e59d6131ea1719cd6de4cbd6e:views-docs', published + ':views-docs'],
  'document-action-guidance': ['ac8d5a9cb684964e59d6131ea1719cd6de4cbd6e:views-docs', published + ':views-docs']
};
function bootstrap() {
  const config = JSON.parse(process.argv[1]);
  const fs = require('node:fs'), cp = require('node:child_process'), path = require('node:path');
  const read = fs.readFileSync, spawn = cp.spawnSync;
  const trace = { gitObjects: [], currentReads: 0, mutations: 0 };
  process.on('exit', () => console.log('HISTORY_TEST_TRACE ' + JSON.stringify(trace)));
  fs.readFileSync = function (file, ...args) {
    let source = read.call(this, file, ...args);
    if (typeof source === 'string' && String(file).startsWith(path.join(config.root, 'js') + path.sep)) {
      trace.currentReads++;
      if (config.currentMutation && path.basename(String(file)) === config.currentMutation[0]) {
        const changed = source.split(config.currentMutation[1]).join(config.currentMutation[2]);
        if (changed !== source) trace.mutations++;
        source = changed;
      }
    }
    return source;
  };
  cp.spawnSync = function (command, args, options) {
    if (command !== 'git') return spawn.call(this, command, args, options);
    trace.gitObjects.push(args[1].replace(':trade-doc-demo/js/', ':').replace(/\.js$/, ''));
    if (config.noGit) return { status: 128, stdout: '', stderr: 'isolated source copy has no Git history' };
    const result = spawn.call(this, command, args, options);
    if (config.historyMutation && args[1].startsWith(config.published + ':') && result.status === 0) {
      result.stdout += config.name === 'document-dashboard'
        ? '\nwindow.Views.dashboard = (function (original) { return function (ctx) { return original(ctx) + "<p>ARCHIVE_MUTATION</p>"; }; })(window.Views.dashboard);\n'
        : '\n/* ARCHIVE_MUTATION: unauthorized archived source addition */\n';
      trace.mutations++;
    }
    return result;
  };
  const entry = path.join(config.root, 'scripts', 'verify-' + config.name + '.cjs');
  process.argv = [process.execPath, entry, ...config.args];
  // _compile as the actual main module so require.main guards execute, too.
  const Module = require('node:module');
  const entryModule = new Module(entry);
  entryModule.filename = entry; entryModule.paths = Module._nodeModulePaths(path.dirname(entry));
  process.mainModule = entryModule;
  entryModule._compile(fs.readFileSync(entry, 'utf8'), entry);
}
function execute(config) {
  const result = spawnSync(process.execPath, ['-e', '(' + bootstrap.toString() + ')()', JSON.stringify(config)], { cwd: config.root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  const trace = JSON.parse(result.stdout.match(/HISTORY_TEST_TRACE (.*)/)?.[1] || 'null');
  assert.ok(trace, 'child must finish with a trace');
  return { status: result.status, output, trace };
}
function run() {
  const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'trade-doc-history-gates-')));
  let cases = 0;
  try {
    fs.mkdirSync(path.join(temporary, 'scripts'));
    // Only the four gates, their two shared dependencies and nine local runtime JS files.
    for (const file of [...scripts.map(n => 'verify-' + n + '.cjs'), 'history-gate.cjs', 'verify-document-workspace.cjs']) fs.copyFileSync(path.join(root, 'scripts', file), path.join(temporary, 'scripts', file));
    fs.cpSync(path.join(root, 'js'), path.join(temporary, 'js'), { recursive: true });
    assert.equal(fs.existsSync(path.join(temporary, '.git')), false);
    const discovery = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: temporary, encoding: 'utf8' });
    assert.notEqual(discovery.status, 0, 'temporary source copy must really be outside a Git checkout');
    const mutations = {
      'approval-context': ['views-fin.js', '关联订单：', '关联订单篡改：'],
      'document-dashboard': ['views-core.js', '去处理', '错误操作'],
      'document-status-guidance': ['views-docs.js', '当前只读：', '允许写入：'],
      'document-action-guidance': ['views-docs.js', '唛头与备注', '包装与备注']
    };
    for (const name of scripts) {
      const base = { root: temporary, name, noGit: true, args: [] };
      const current = execute(base);
      assert.equal(current.status, 0, name + ': current checks in real no-Git copy');
      assert.ok(current.trace.currentReads > 0); assert.deepEqual(current.trace.gitObjects, []);
      assert.match(current.output, /PASS CURRENT/); assert.match(current.output, /ARCHIVE NOT_REQUESTED/);
      cases++;
      const missing = execute({ ...base, noGit: false, args: ['--archive'] });
      assert.equal(missing.status, 2, name + ': missing history is non-success BLOCKED');
      assert.match(missing.output, /BLOCKED MISSING_HISTORY/); assert.doesNotMatch(missing.output, /PASS ARCHIVE/);
      assert.ok(missing.trace.gitObjects.length > 0); cases++;
      const broken = execute({ ...base, currentMutation: mutations[name] });
      assert.equal(broken.status, 1, name + ': current mutation must fail with no history');
      assert.match(broken.output, /ASSERTION_FAIL/); assert.doesNotMatch(broken.output, /PASS CURRENT/);
      assert.ok(broken.trace.mutations > 0); assert.deepEqual(broken.trace.gitObjects, []); cases++;
      console.log('PASS gate boundary: ' + name + ' current/no-Git, missing history BLOCKED=2, current mutation FAIL=1');
      if (archiveEnabled()) {
        const archived = execute({ root, name, args: ['--archive'] });
        if (archived.status === 2) {
          const error = new Error(name + ': required archive unavailable during full historical gate'); error.code = 'MISSING_HISTORY'; throw error;
        }
        assert.equal(archived.status, 0, archived.output); assert.match(archived.output, /PASS ARCHIVE/);
        assert.deepEqual([...new Set(archived.trace.gitObjects)].sort(), expectedObjects[name].sort(), 'all original archive dependencies execute'); cases++;
        const tampered = execute({ root, name, args: ['--archive'], published, historyMutation: true });
        assert.equal(tampered.status, 1, name + ': historical mutation must fail');
        assert.match(tampered.output, /ASSERTION_FAIL/); assert.doesNotMatch(tampered.output, /PASS ARCHIVE/);
        assert.ok(tampered.trace.mutations > 0); cases++;
        console.log('PASS archive boundary: ' + name + ' all original objects executed, history mutation FAIL=1');
      }
    }
    console.log('PASS: ' + cases + ' history gate scenarios; temporary copy removed after checks');
    reportArchive('verify-history-gates.cjs');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
try { run(); } catch (error) { reportFailure(error); }
