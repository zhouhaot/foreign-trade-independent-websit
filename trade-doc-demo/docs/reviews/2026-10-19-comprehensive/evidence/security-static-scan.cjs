'use strict';
/* Read-only, redacted pattern scan. It prints locations/kinds, never matches. */
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const paths = cp.execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['openai-style-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/g],
  ['github-token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g],
  ['github-fine-grained-token', /\bgithub_pat_[A-Za-z0-9_]{30,}/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{24,}/g]
];
let scanned = 0, skipped = 0;
const findings = [];
for (const filename of paths) {
  if (!/\.(?:md|txt|js|cjs|mjs|json|html|css|yaml|yml|svg|py|sh)$/i.test(filename)) { skipped++; continue; }
  let content;
  try { content = fs.readFileSync(path.join(root, filename), 'utf8'); } catch { continue; }
  if (content.length > 2000000) { skipped++; continue; }
  scanned++;
  for (const [kind, regex] of patterns) for (const hit of content.matchAll(regex)) {
    findings.push({ path: filename, line: content.slice(0, hit.index).split('\n').length, kind });
  }
}
console.log(JSON.stringify({ scope: 'tracked text files in project subtree; no archive/binary/history scan', scanned, skipped,
  credentialFilenameMatches: paths.filter(p => /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx|jks)$/i.test(p)),
  highConfidencePatternFindings: findings,
  note: 'Pattern absence is not proof of absence of secrets. Demo login values excluded.' }, null, 2));
