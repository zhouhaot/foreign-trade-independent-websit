/* Evaluated only by ego-browser nodejs in caller-created TaskSpace 17. */
const task = await taskSpace(17), page = task.page('p1');
const fs = await import('node:fs/promises');
const base = 'http://127.0.0.1:8014/index.html?review=20261019-final';
const report = { date:'2026-10-19', phase:globalThis.REVIEW_PHASE || 'baseline', routeChecks:[], layouts:[], failures:[], semantics:[], limits:['DOM layout is not visual or screen-reader certification','Single Chromium engine; no production API'] };
await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:'window.__reviewErrors=[];window.addEventListener("error",e=>window.__reviewErrors.push(e.message));window.addEventListener("unhandledrejection",e=>window.__reviewErrors.push(String(e.reason)));'});
await page.goto(base + '#/dashboard');
await page.reload(); // Explicitly restore source Mock; hash-only navigation does not reset prior fixtures.
await page.waitForFunction(()=>!!window.App&&!!document.querySelector('#demo-role-switch,#login-role'));
if(await page.evaluate(()=>!App.user)){await page.selectOption('#login-role','sales');await page.click('[data-action="login-submit"]');await page.waitForFunction(()=>App.user?.role==='sales'&&!!document.querySelector('#demo-role-switch'));}
const roles=['admin','sales','doc','fin','boss'], business=['sales','doc','fin','boss'];
const routes=[['#/dashboard',roles],['#/customers',['sales']],['#/customers/C001',['sales']],['#/products',['sales']],['#/products/P001',business],['#/inquiries',['sales','boss']],['#/inquiries/INQ2026006',['sales','boss']],['#/quotes',['sales','boss']],['#/quotes/Q2026004',['sales','boss']],['#/quotes/Q2026004/edit',['sales']],['#/orders',business],['#/orders/SO2026001',business],['#/documents',['doc','boss']],['#/documents/D-PL2026004-V1',business],['#/payments',['fin','boss']],['#/approvals',business],['#/stats',['boss']],['#/system/users',['admin']],['#/system/roles',['admin']],['#/system/dicts',['admin']]];
for(const role of roles){
  await page.goto(base+'#/dashboard');
  if(await page.evaluate(()=>App.user.role)!==role){ await page.selectOption('#demo-role-switch',role); await page.waitForFunction(r=>App.user?.role===r,role); }
  for(const [route,allowed] of routes){
    await page.goto(base+route);
    await page.waitForFunction(()=>!!window.App&&!!document.querySelector('.workspace'));
    const state=await page.evaluate(()=>({forbidden:!!document.querySelector('.forbidden'),text:document.querySelector('.workspace')?.innerText.length||0,errors:window.__reviewErrors||[],role:App.user?.role}));
    const pass=state.forbidden===!allowed.includes(role)&&state.text>0&&state.errors.length===0&&state.role===role;
    report.routeChecks.push({role,route,pass,...state}); if(!pass)report.failures.push({type:'route',role,route,state});
    for(const [width,height] of [[1280,800],[1366,768],[1440,900]]){
      await page.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      const d=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('.workspace')?.getBoundingClientRect().width}));
      report.layouts.push({role,route,width,height,...d}); if(d.scroll>d.width+1)report.failures.push({type:'overflow',role,route,...d});
    }
    if(allowed.includes(role)){
      const semantics=await page.evaluate(()=>[...document.querySelectorAll('.workspace input:not([type=hidden]),.workspace textarea,.workspace select')].filter(e=>!e.disabled).map(e=>({id:e.id,tag:e.tagName,type:e.type,labelCount:e.labels?.length||0,ariaLabel:e.getAttribute('aria-label'),ariaLabelledby:e.getAttribute('aria-labelledby'),title:e.title,nearby:e.closest('.form-item')?.querySelector('label')?.textContent||''})).filter(e=>!e.labelCount&&!e.ariaLabel&&!e.ariaLabelledby&&!e.title));
      if(semantics.length)report.semantics.push({role,route,unlabelled:semantics});
    }
  }
}
await page.cdp('Emulation.clearDeviceMetricsOverride');
await page.goto(base+'#/dashboard');
const out=new URL('./browser-'+report.phase+'.json',import.meta.url);
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({routeChecks:report.routeChecks.length,layouts:report.layouts.length,failures:report.failures,semanticGroups:report.semantics.length}));
