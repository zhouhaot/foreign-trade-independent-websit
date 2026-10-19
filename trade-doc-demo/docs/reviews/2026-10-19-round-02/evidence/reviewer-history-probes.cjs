'use strict';
// Independent reviewer probes: runtime source interception only; no product writes, no browser.
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const probes = [
  ['approval-context', 'views-fin.js', "label: '查看关联订单 '", "label: '错误目标 '"] ,
  ['document-dashboard', 'views-core.js', '本次演示新增收款', '已入账正式收款'],
  ['document-status-guidance', 'views-docs.js', '提交审核，等待业务主管处理。', '提交审核，已经批准。'],
  ['document-action-guidance', 'views-docs.js', "created.status = '草稿';", "created.status = '已通过';"]
];
// The action mutation targets an existing exact line below; fail if implementation drifts.
probes[3][2] = "nd.status = '草稿';";
probes[3][3] = "nd.status = '已通过';";
function child() {
  const config = JSON.parse(process.env.TRADE_REVIEWER_PROBE);
  const fs = require('node:fs'), cp = require('node:child_process');
  const read = fs.readFileSync, spawn = cp.spawnSync;
  let reads = 0, changes = 0, gitCalls = 0;
  fs.readFileSync = function(file, ...args) {
    let value = read.call(this, file, ...args);
    if (typeof value === 'string' && String(file).includes('/js/')) {
      reads++;
      if (config.mode === 'current-mutation' && String(file).endsWith('/' + config.file)) {
        assertMutation();
        value = value.replace(config.before, config.after); changes++;
      }
    }
    function assertMutation() { if (!value.includes(config.before)) throw Error('PROBE_TARGET_MISSING'); }
    return value;
  };
  cp.spawnSync = function(command, args, options) {
    if (command !== 'git') return spawn.call(this, command, args, options);
    gitCalls++;
    if (config.mode === 'missing') return { status:128, stdout:'', stderr:'reviewer synthetic missing object' };
    if (!config.mode.startsWith('archive-')) throw Error('UNEXPECTED_GIT_IN_CURRENT');
    const result = spawn.call(this, command, args, options);
    if (config.mode === 'archive-empty' && result.status === 0) { result.stdout = ''; changes++; return result; }
    if (result.status === 0 && args[1].startsWith('f8643db')) {
      if (config.mode.startsWith('archive-marker-')) {
        const marker = '  /* 主管处理 改价 / 取消 / 重新制单 */';
        if (!result.stdout.includes(marker)) throw Error('PROBE_MARKER_MISSING');
        result.stdout = result.stdout.replace(marker, config.mode.endsWith('missing') ? '' : marker + '\n' + marker);
      } else result.stdout += config.name === 'document-dashboard'
        ? '\nwindow.Views.dashboard = (() => () => "<p>independent corrupted archive</p>")();\n'
        : '\n/* independent unauthorized archive source addition */\n';
      changes++;
    }
    return result;
  };
  process.on('exit', () => console.log('REVIEW_TRACE ' + JSON.stringify({ reads, changes, gitCalls })));
}
if (process.env.TRADE_REVIEWER_PROBE) child();
else {
const results = [];
for (const [name, file, before, after] of probes) for (const mode of ['current','current-mutation','missing','archive-mutation','archive-empty', ...(name === 'approval-context' ? ['archive-marker-missing','archive-marker-duplicate'] : [])]) {
  const config = { name, mode, file, before, after, entry:path.join(root, 'scripts', 'verify-' + name + '.cjs') };
  const args = ['-r', __filename, config.entry, ...(mode === 'missing' || mode.startsWith('archive-') ? ['--archive'] : [])];
  const result = spawnSync(process.execPath, args, { cwd:root, env:{ ...process.env, TRADE_REVIEWER_PROBE:JSON.stringify(config) }, encoding:'utf8', timeout:30000 });
  assert.ifError(result.error);
  const output = result.stdout + result.stderr;
  const trace = JSON.parse(result.stdout.match(/REVIEW_TRACE (.*)/)?.[1] || 'null');
  const expected = mode === 'current' ? 0 : mode === 'missing' ? 2 : 1;
  assert.equal(result.status, expected, name + '/' + mode + ': ' + output);
  assert.ok(trace && (mode === 'missing' || trace.reads > 0), name + '/' + mode + ': actual current JS must load unless archive unavailable first');
  if (mode.startsWith('current')) assert.equal(trace.gitCalls, 0);
  if (mode.endsWith('mutation')) assert.ok(trace.changes > 0);
  if (mode === 'current') { assert.match(output,/PASS CURRENT/); assert.match(output,/ARCHIVE NOT_REQUESTED/); }
  else { assert.doesNotMatch(output,/PASS ARCHIVE/); assert.match(output, mode === 'missing' ? /BLOCKED MISSING_HISTORY/ : /ASSERTION_FAIL/); }
  results.push({ name, mode, status:result.status, trace, result:'PASS' });
}
console.log(JSON.stringify({ scope:'independent Node VM gate probes; no native Ego and no product writes', cases:results.length, results }, null, 2));
}
