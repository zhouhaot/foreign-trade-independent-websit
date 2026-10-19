'use strict';
// Independent lifecycle probes with simulated Page/TaskSpace only, never native browser evidence.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
(async () => {
  const root = path.resolve(__dirname, '../../../..');
  const source = await fs.readFile(path.join(root, 'scripts/verify-browser.mjs'), 'utf8');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  // Freeze exactly the hashed source for this run, even if an author edits concurrently.
  const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const records = [];
  const stamp = Date.now() + '-' + process.pid;
  for (const kind of ['structured-unsafe','structured-false','policy-denied','viewport-response-lost','product-then-capture-safety']) {
    const events = []; let thrownAt = -1, url = '', viewportApplied = false;
    const page = {
      async cdp(method, params) {
        events.push(method);
        if (method === 'Emulation.setDeviceMetricsOverride') {
          viewportApplied = true;
          if (kind === 'viewport-response-lost') throw Error('Protocol reply dropped after application');
        }
        if (method === 'Emulation.clearDeviceMetricsOverride') viewportApplied = false;
        return { identifier:'reviewer-listener' };
      },
      async goto(next) { events.push('goto'); url = next; },
      async reload() { events.push('reload'); },
      async waitForFunction() { events.push('waitForFunction'); },
      async url() { events.push('url'); return url; },
      async evaluate(fn) {
        events.push('evaluate');
        if (kind === 'product-then-capture-safety' && String(fn).includes('fieldErrors')) {
          const error = Object.assign(Error('Capture safety timeout'),{ executionStopped:false, mayHaveLateEffects:true });
          thrownAt = events.length; throw error;
        }
        if (String(fn).includes('newInquiryUnquoted')) return { orders:7, documents:11, newInquiryUnquoted:true, docEnabled:true };
        if (String(fn).includes('window.__tradeQaErrors || []') && !String(fn).includes('fieldErrors')) return [];
        return { hash:'#/dashboard', role:'sales', fieldErrors:[], toasts:[], errors:[] };
      }
    };
    const dependencies = {
      listSpaces:async () => [{ id:18, ownership:'agent' }],
      connect:async () => ({ spaceId:18, ownership:'agent', page:() => page }),
      runners:{
        matrix:async (c,s) => c.check(s,'independent ' + kind,async () => {
          if (kind === 'viewport-response-lost') { thrownAt = events.length; await c.viewport(1280,800); return; }
          if (kind === 'product-then-capture-safety') { thrownAt = events.length; throw new mod.QaFailure('independent original product failure','product'); }
          const e = Error(kind === 'policy-denied' ? 'URL denied by policy' : 'Evaluation timeout with structured safety status');
          if (kind === 'structured-unsafe') Object.assign(e,{ executionStopped:false, pageResponsive:true, mayHaveLateEffects:true });
          if (kind === 'structured-false') Object.assign(e,{ executionStopped:false, pageResponsive:false, mayHaveLateEffects:false });
          thrownAt = events.length; throw e;
        }),
        business:async () => { events.push('LATER_BUSINESS'); },
        quality:async () => { events.push('LATER_QUALITY'); }
      }
    };
    const reportPath = path.join(__dirname,'reviewer-browser-' + stamp + '-' + kind + '.json');
    const r = await mod.runBrowserQa({ TRADE_QA_SPACE:'18', TRADE_QA_PAGE:'p1', TRADE_QA_DISPOSABLE:'1', TRADE_QA_BASE:'http://127.0.0.1:8014/index.html', TRADE_QA_REPORT:reportPath },dependencies);
    const remaining = events.slice(thrownAt);
    const stopped = r.result === 'BLOCKED' && !remaining.length && r.stages.slice(1).every(s => s.result === 'NOT_RUN');
    const restored = r.result === 'FAIL' && !viewportApplied && events.includes('Emulation.clearDeviceMetricsOverride');
    const primaryRetained = r.result === 'FAIL' && r.failures.some(f=>f.category === 'product' && f.error === 'independent original product failure') && !remaining.length && r.stages.slice(1).every(s=>s.result === 'NOT_RUN');
    records.push({ kind, expected:kind === 'product-then-capture-safety' ? 'FAIL retains primary product failure while capture safety stops later actions' : kind === 'viewport-response-lost' ? 'FAIL with attempted override restored' : 'BLOCKED with zero Page actions after stop and later stages NOT_RUN',
      accepted:kind === 'product-then-capture-safety' ? primaryRetained : kind === 'viewport-response-lost' ? restored : stopped, actual:r.result, laterStages:r.stages.slice(1).map(s=>s.result), pageActionsAfterThrow:remaining, viewportApplied, reportPath });
  }
  const result = { sourceSha256:hash, kind:'independent simulated lifecycle contracts, not Ego evidence', checks:records.length, records };
  console.log(JSON.stringify(result,null,2));
  if (process.argv.includes('--expect-fixed')) assert(records.every(x=>x.accepted),'Independent lifecycle contracts still fail');
})().catch(error => { console.error(error); process.exitCode=1; });
