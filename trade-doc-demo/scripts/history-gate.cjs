'use strict';
// Archive checks are opt-in. Missing Git objects are an environment block, never a pass.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const archiveEnabled = () => process.argv.includes('--archive');
function historySource(revision, name) {
  const object = revision + ':trade-doc-demo/js/' + name + '.js';
  const result = spawnSync('git', ['show', object], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
  if (result.error || result.status !== 0) {
    const reason = result.error ? 'Git command unavailable or interrupted (' + result.error.code + ')' : 'local Git repository/object unavailable';
    const error = new Error(reason + ': ' + object + '; restore local Git history before retrying (no automatic fetch).');
    error.code = 'MISSING_HISTORY';
    throw error;
  }
  return result.stdout;
}
function reportFailure(error) {
  const blocked = error.code === 'MISSING_HISTORY';
  console.error((blocked ? 'BLOCKED MISSING_HISTORY: ' : 'ASSERTION_FAIL: ') + (error.stack || error.message));
  process.exitCode = blocked ? 2 : 1;
}
function reportArchive(script) {
  console.log(archiveEnabled()
    ? 'PASS ARCHIVE: all historical assertions executed for ' + script
    : 'ARCHIVE NOT_REQUESTED: current checks only; run node scripts/' + script + ' --archive for the separate historical gate');
}
module.exports = { archiveEnabled, historySource, reportFailure, reportArchive };
