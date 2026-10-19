/* Node-only harness contract checks, never real Ego/browser evidence.
 * No browser launches; injected phases always produce engine=contract-double.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..');
  const mod = await import(pathToFileURL(path.join(__dirname, 'verify-browser.mjs')).href);
  const folder = process.env.TRADE_QA_CONTRACT_DIR ? path.resolve(process.env.TRADE_QA_CONTRACT_DIR) : path.join(root, 'docs/reviews/2026-10-19-round-02/evidence');
  await fs.mkdir(folder, { recursive: true });
  const prefix = path.join(folder, 'browser-author-contract-' + Date.now() + '-' + process.pid);
  const records = [];
  const check = async (name, fn) => { await fn(); records.push({ name, result: 'PASS' }); };
  const input = suffix => ({ TRADE_QA_SPACE: '18', TRADE_QA_PAGE: 'p1', TRADE_QA_DISPOSABLE: '1',
    TRADE_QA_BASE: 'http://127.0.0.1:8014/index.html?qa=contract', TRADE_QA_REPORT: prefix + '-' + suffix + '.json', TRADE_QA_PHASES: 'matrix' });
  const fixture = (options = {}) => {
    const events = []; let currentURL = '', waitCount = 0;
    const page = {
      async cdp(method, params) {
        events.push({ type: 'cdp', method, params });
        if (options.failCdp?.(method, params)) throw new Error('Injected cleanup/setup protocol failure: ' + method);
        return { identifier: 'contract-listener' };
      },
      async goto(url) { events.push({ type: 'goto', url }); currentURL = url; },
      async reload() { events.push({ type: 'reload' }); },
      async waitForFunction() { if (options.readyError && waitCount++ === 0) throw options.readyError; }, async url() { return currentURL; },
      async evaluate(fn) {
        const source = String(fn);
        events.push({ type: 'evaluate' });
        if (source.includes('document.readyState')) {
          events.push({ type: 'bootState' });
          if (options.bootCaptureError) throw options.bootCaptureError;
          return options.bootState || { readyState: 'loading', globals: { App: 'undefined', MOCK: 'object', U: 'object' }, errorListenerPresent: false, errors: null, scripts: [], styleSheets: [] };
        }
        if (options.captureError && source.includes('fieldErrors')) throw options.captureError;
        if (source.includes('window.__tradeQaErrors || []') && !source.includes('fieldErrors')) return [];
        if (source.includes('newInquiryUnquoted')) return { orders: 7, documents: 11, newInquiryUnquoted: true, docEnabled: true, disabled: ['U007'] };
        if (source.includes('MOCK.users.some')) return true;
        if (source.includes('!App.user')) return false;
        if (source.includes('App.user.role')) return 'sales';
        return { hash: '#/dashboard', role: 'sales', fieldErrors: [], toasts: [], errors: [] };
      }
    };
    return { events, dependencies: {
      listSpaces: async () => { events.push({ type: 'list' }); return options.spaces || [{ id: 18, ownership: 'agent' }]; },
      connect: async id => { events.push({ type: 'connect', id }); return { spaceId: id, ownership: 'agent', page(label) { events.push({ type: 'page', label }); return page; } }; },
      runners: { matrix: options.run || (async (c, s) => c.check(s, 'contract action', async () => ({ kind: 'contract-only' }))) }
    } };
  };
  for (const name of ['TRADE_QA_SPACE', 'TRADE_QA_PAGE', 'TRADE_QA_DISPOSABLE', 'TRADE_QA_BASE', 'TRADE_QA_REPORT']) {
    await check('required ' + name, () => { const v = input('missing'); delete v[name]; assert.throws(() => mod.preflight(v), e => e.category === 'method'); });
  }
  for (const base of ['https://127.0.0.1:8014/index.html', 'http://example.com:8014/index.html', 'http://127.1:8014/index.html', 'http://2130706433:8014/index.html', 'http://0x7f000001:8014/index.html', 'http://user:pass@127.0.0.1:8014/index.html', 'http://127.0.0.1:8014/index.html#/orders', 'file:///tmp/index.html', 'http://127.0.0.1:8014/', 'http://127.0.0.1/index.html', 'http://127.0.0.1:99999/index.html']) {
    await check('reject unsafe/ambiguous base ' + base.replace(/user:pass@/, '[redacted]@'), () => assert.throws(() => mod.preflight({ ...input('invalid-base'), TRADE_QA_BASE: base })));
  }
  for (const v of ['0', '-1', '18x', '1.5', '9007199254740992']) await check('reject invalid space ' + v, () => assert.throws(() => mod.preflight({ ...input('invalid-space'), TRADE_QA_SPACE: v })));
  await check('reject wrong page/disposable/phase/report inputs', () => {
    for (const patch of [{ TRADE_QA_PAGE: 'p2' }, { TRADE_QA_DISPOSABLE: '0' }, { TRADE_QA_PHASES: '' }, { TRADE_QA_PHASES: 'matrix,matrix' }, { TRADE_QA_PHASES: 'unknown' }, { TRADE_QA_REPORT: './out.json' }]) assert.throws(() => mod.preflight({ ...input('invalid'), ...patch }));
  });
  await check('all phases default and explicit subset', () => {
    const a = input('default'); delete a.TRADE_QA_PHASES;
    assert.deepEqual(mod.preflight(a).phases, ['matrix', 'business', 'quality']);
    assert.deepEqual(mod.preflight({ ...a, TRADE_QA_PHASES: 'quality,business' }).phases, ['quality', 'business']);
  });
  await check('independent decimal oracle exact cents and refusal', () => {
    assert.equal(mod.itemCents([{ qty: 100, price: 3.2 }, { qty: 50, price: 4.5 }]), 54500n);
    assert.equal(mod.decimalHundredths('90071992547408.99'), 9007199254740899n);
    assert.throws(() => mod.itemCents([{ qty: '.01', price: 1 }]));
    assert.throws(() => mod.itemCents([{ qty: '0.01', price: '0.01' }]));
    assert.throws(() => mod.decimalHundredths('1e3'));
  });
  await check('missing config saves BLOCKED before any browser API', async () => {
    const f = fixture(), v = input('blocked'); delete v.TRADE_QA_BASE;
    const r = await mod.runBrowserQa(v, f.dependencies);
    assert.equal(r.result, 'BLOCKED'); assert.deepEqual(f.events, []); assert.equal(JSON.parse(await fs.readFile(v.TRADE_QA_REPORT)).result, 'BLOCKED');
  });
  await check('existing report immutable and duplicate execution refused before browser', async () => {
    const f = fixture(), v = input('duplicate'); await fs.writeFile(v.TRADE_QA_REPORT, 'existing evidence\n', { flag: 'wx' });
    const r = await mod.runBrowserQa(v, f.dependencies);
    assert.equal(r.result, 'BLOCKED'); assert.deepEqual(f.events, []); assert.equal(await fs.readFile(v.TRADE_QA_REPORT, 'utf8'), 'existing evidence\n'); assert.equal(r.reportPath, null); assert.equal(r.refusedReportPath, v.TRADE_QA_REPORT);
  });
  await check('missing/invalid report returns in-memory BLOCKED without invented paths', async () => {
    for (const output of [undefined, './relative.json']) {
      const f = fixture(), r = await mod.runBrowserQa({ ...input('invalid-report'), TRADE_QA_REPORT: output }, f.dependencies);
      assert.equal(r.result, 'BLOCKED'); assert.equal(r.reportPath, null); assert.deepEqual(f.events, []);
    }
  });
  await check('absent/unowned spaces blocked; no implicit creation or takeover', async () => {
    for (const [i, spaces] of [[0, []], [1, [{ id: 18, ownership: 'user' }]], [2, [{ id: 18, ownership: 'inactive' }]]]) {
      const f = fixture({ spaces }), r = await mod.runBrowserQa(input('space-' + i), f.dependencies);
      assert.equal(r.result, 'BLOCKED'); assert.deepEqual(f.events, [{ type: 'list' }]); assert.equal(r.stages[0].result, 'NOT_RUN');
    }
  });
  await check('contract-double cannot produce real browser PASS; only set diagnostics cleaned', async () => {
    const f = fixture(), r = await mod.runBrowserQa(input('contract-pass'), f.dependencies);
    assert.equal(r.engine, 'contract-double'); assert.equal(r.result, 'CONTRACT_PASS');
    assert.equal(r.stages[0].checks[0].result, 'CONTRACT_PASS'); assert(r.cleanup.filter(x => /media|viewport/.test(x.name)).every(x => x.result === 'SKIPPED'));
    assert(f.events.some(x => x.method === 'Network.setCacheDisabled' && x.params.cacheDisabled === false));
    assert(f.events.some(x => x.method === 'Page.removeScriptToEvaluateOnNewDocument')); assert(f.events.some(x => x.type === 'reload'));
  });
  await check('partial report and original product failure survive cleanup failures; later cleanup continues', async () => {
    const v = input('failure'), f = fixture({ failCdp: (m, a) => m === 'Emulation.setEmulatedMedia' && a.features.length === 0,
      run: async (c, s) => {
        await c.viewport(1280, 800); await c.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await c.check(s, 'completed contract step', async () => ({ partial: true }));
        await c.check(s, 'original product failure', async () => {
          const saved = JSON.parse(await fs.readFile(v.TRADE_QA_REPORT)); assert.equal(saved.stages[0].checks.length, 1);
          throw new mod.QaFailure('injected product assertion');
        });
      } });
    const r = await mod.runBrowserQa(v, f.dependencies);
    assert.equal(r.result, 'FAIL'); assert(r.failures.some(e => e.category === 'product' && e.error === 'injected product assertion'));
    assert(r.failures.some(e => e.phase === 'cleanup' && e.category === 'tool')); assert.equal(r.stages[0].checks.length, 2);
    assert(f.events.some(e => e.method === 'Emulation.clearDeviceMetricsOverride')); assert(f.events.some(e => e.type === 'reload'));
    const saved = JSON.parse(await fs.readFile(v.TRADE_QA_REPORT)); assert.deepEqual(saved.failures, r.failures);
  });
  await check('control stop preserves evidence and forbids subsequent stages/Page cleanup', async () => {
    const f = fixture({ run: async (c, s) => c.check(s, 'control stop', async () => { throw new Error('user has taken control'); }) });
    f.dependencies.runners.business = async () => { throw new Error('must never execute'); };
    const r = await mod.runBrowserQa({ ...input('control'), TRADE_QA_PHASES: 'matrix,business' }, f.dependencies);
    assert.equal(r.result, 'BLOCKED'); assert.equal(r.stages.length, 2); assert.equal(r.stages[0].result, 'BLOCKED'); assert.equal(r.stages[1].result, 'NOT_RUN'); assert.deepEqual(r.notRequested, ['quality']); assert(r.cleanup.every(x => x.result === 'SKIPPED')); assert(!f.events.some(e => e.type === 'reload'));
  });
  await check('structured safety metadata always blocks, including all false fields and product categories', async () => {
    for (const [i, metadata] of [[0, { executionStopped: false, pageResponsive: false, mayHaveLateEffects: true }], [1, { executionStopped: false, pageResponsive: false, mayHaveLateEffects: false }]]) {
      let subsequent = false;
      const f = fixture({ run: async (c, s) => c.check(s, 'structured timeout', async () => { throw Object.assign(new mod.QaFailure('Evaluation safety timeout', 'product'), metadata); }) });
      f.dependencies.runners.business = async () => { subsequent = true; };
      const r = await mod.runBrowserQa({ ...input('structured-' + i), TRADE_QA_PHASES: 'matrix,business' }, f.dependencies);
      assert.equal(r.result, 'BLOCKED'); assert.equal(r.stages[0].checks[0].result, 'BLOCKED'); assert.equal(r.stages[1].result, 'NOT_RUN'); assert.equal(subsequent, false);
      for (const [k, v] of Object.entries(metadata)) assert.equal(r.failures[0][k], v);
      assert(r.cleanup.every(x => x.result === 'SKIPPED')); assert(!f.events.some(e => e.type === 'reload'));
    }
  });
  await check('policy denial stops all Page actions and later phases', async () => {
    let subsequent = false;
    const f = fixture({ run: async (c, s) => c.check(s, 'denied route', async () => { throw new Error('URL denied by browser policy'); }) });
    f.dependencies.runners.business = async () => { subsequent = true; };
    const r = await mod.runBrowserQa({ ...input('policy'), TRADE_QA_PHASES: 'matrix,business' }, f.dependencies);
    assert.equal(r.result, 'BLOCKED'); assert.equal(subsequent, false); assert.equal(r.stages[1].result, 'NOT_RUN'); assert(r.cleanup.every(x => x.result === 'SKIPPED'));
  });
  await check('override response lost still records attempted and restores in ordinary tool failure', async () => {
    for (const kind of ['viewport', 'media', 'cache']) {
      const method = { viewport: 'Emulation.setDeviceMetricsOverride', media: 'Emulation.setEmulatedMedia', cache: 'Network.setCacheDisabled' }[kind];
      const f = fixture({ failCdp: (m, a) => m === method && (kind === 'viewport' || kind === 'media' && a.features.length > 0 || kind === 'cache' && a.cacheDisabled),
        run: async c => { if (kind === 'viewport') await c.viewport(1280, 800); if (kind === 'media') await c.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]); } });
      const r = await mod.runBrowserQa(input('response-lost-' + kind), f.dependencies);
      assert.equal(r.result, 'FAIL'); assert.equal(r.diagnostics[kind].attempted, true); assert.equal(r.diagnostics[kind].applied, false); assert.equal(r.diagnostics[kind].restored, true);
    }
  });
  await check('capture safety timeout retains original product failure plus separate blocked evidence', async () => {
    const f = fixture({ captureError: Object.assign(new Error('Evaluation safety timeout'), { executionStopped: false, pageResponsive: false, mayHaveLateEffects: true }),
      run: async (c, s) => c.check(s, 'original failure then unsafe capture', async () => { throw new mod.QaFailure('original product assertion'); }) });
    f.dependencies.runners.business = async () => { throw new Error('must not run'); };
    const r = await mod.runBrowserQa({ ...input('capture-timeout'), TRADE_QA_PHASES: 'matrix,business' }, f.dependencies);
    assert.equal(r.result, 'FAIL'); assert.equal(r.stages[0].result, 'FAIL'); assert.equal(r.stages[1].result, 'NOT_RUN');
    assert(r.failures.some(x => x.category === 'product' && x.error === 'original product assertion'));
    assert(r.failures.some(x => x.category === 'blocked' && x.mayHaveLateEffects === true)); assert(r.cleanup.every(x => x.result === 'SKIPPED'));
  });
  await check('stage with caught check failures keeps tool source without aggregate product failure', async () => {
    const f = fixture({ run: async (c, s) => { try { await c.check(s, 'ordinary tool timeout', async () => { throw new Error('page.waitForFunction timed out'); }); } catch {} } });
    const r = await mod.runBrowserQa(input('no-aggregate-product'), f.dependencies);
    assert.equal(r.result, 'FAIL'); assert.equal(r.stages[0].result, 'FAIL'); assert.equal(r.failures.length, 1); assert.equal(r.failures[0].category, 'tool');
  });
  await check('readiness failure saves bootState and distinguishes missing listener from empty errors', async () => {
    for (const [i, present] of [[0, false], [1, true]]) {
      const bootState = { readyState: 'loading', globals: { App: 'undefined', MOCK: 'object', U: 'object' }, appChildCount: 0,
        errorListenerPresent: present, errors: present ? [] : null, scripts: [{ path: '/js/app.js', resourceTimingObserved: false }], styleSheets: [{ cssRules: 10 }] };
      const f = fixture({ readyError: new Error('page.waitForFunction timed out'), bootState, run: async c => c.ready() });
      const r = await mod.runBrowserQa(input('boot-state-' + i), f.dependencies);
      assert.equal(r.result, 'FAIL'); assert.equal(r.failures[0].category, 'tool'); assert.deepEqual(r.failures[0].bootState, bootState); assert.equal(f.events.filter(e => e.type === 'bootState').length, 1);
    }
  });
  await check('readiness safety receipt forbids bootState capture and all later Page cleanup', async () => {
    const f = fixture({ readyError: Object.assign(new Error('Evaluation safety timeout'), { executionStopped: false, pageResponsive: false, mayHaveLateEffects: true }), run: async c => c.ready() });
    const r = await mod.runBrowserQa(input('boot-unsafe-ready'), f.dependencies);
    assert.equal(r.result, 'BLOCKED'); assert(!f.events.some(e => e.type === 'bootState')); assert(!f.events.some(e => e.type === 'reload')); assert(r.cleanup.every(x => x.result === 'SKIPPED'));
  });
  await check('bootState diagnostic safety receipt preserves original tool failure and stops later phases', async () => {
    const f = fixture({ readyError: new Error('page.waitForFunction timed out'), bootCaptureError: Object.assign(new Error('Evaluation safety timeout'), { executionStopped: false, pageResponsive: false, mayHaveLateEffects: true }), run: async c => c.ready() });
    f.dependencies.runners.business = async () => { throw new Error('must not run'); };
    const r = await mod.runBrowserQa({ ...input('boot-unsafe-capture'), TRADE_QA_PHASES: 'matrix,business' }, f.dependencies);
    assert.equal(r.result, 'FAIL'); assert.equal(r.stages[0].result, 'FAIL'); assert.equal(r.stages[1].result, 'NOT_RUN');
    assert(r.failures.some(x => x.category === 'tool' && x.error === 'page.waitForFunction timed out'));
    assert(r.failures.some(x => x.category === 'blocked' && x.mayHaveLateEffects)); assert(!f.events.some(e => e.type === 'reload')); assert(r.cleanup.every(x => x.result === 'SKIPPED'));
  });
  await check('fresh explicitly reloads and clears prior runner media/viewport between independent scenarios', async () => {
    const f = fixture({ run: async c => { await c.viewport(1280, 800); await c.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await c.fresh('contract reset'); } });
    const r = await mod.runBrowserQa(input('fresh'), f.dependencies);
    assert.equal(r.result, 'CONTRACT_PASS'); assert.equal(r.resets.length, 1); assert.equal(f.events.filter(e => e.type === 'reload').length, 2);
    const reloadIndex = f.events.findIndex(e => e.type === 'reload'); assert(f.events.findIndex(e => e.method === 'Emulation.clearDeviceMetricsOverride') < reloadIndex);
  });
  await check('classification keeps product/tool/method/blocked separate', () => {
    assert.equal(mod.failureCategory(new mod.QaFailure('x')), 'product'); assert.equal(mod.failureCategory(new mod.QaFailure('x', 'method')), 'method');
    assert.equal(mod.failureCategory(new Error('page.click timeout')), 'tool'); assert.equal(mod.failureCategory(new Error('user has taken control')), 'blocked');
  });
  await check('source coverage and forbidden lifecycle/global-state operations', async () => {
    const source = await fs.readFile(path.join(__dirname, 'verify-browser.mjs'), 'utf8');
    for (const api of ['claimTaskSpace', 'takeOverTaskSpace', 'clearBrowserCookies', 'clearBrowserCache', 'clearDataForOrigin', 'localStorage.clear', 'sessionStorage.clear', 'App.rerender', 'newPage(', '.finish(']) assert(!source.includes(api), 'Forbidden operation: ' + api);
    for (const marker of ['[1366, 768]', '1360, 1361', '54500n', 'decimalHundredths', 'orders-density', 'doc-focus', 'doc-revise', 'doc-export', 'isComposing: true', 'sys-enabled-U004', 'remainingCents']) assert(source.includes(marker), 'Missing retained coverage: ' + marker);
  });
  const summary = { result: 'PASS', kind: 'Node harness contract only; no actual Ego/Page executions', checks: records.length, records };
  await fs.writeFile(prefix + '-summary.json', JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...summary, records: undefined, evidence: prefix + '-summary.json' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
