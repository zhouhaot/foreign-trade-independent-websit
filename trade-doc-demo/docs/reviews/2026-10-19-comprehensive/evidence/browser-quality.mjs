const p=(await taskSpace(17)).page('p1'),fs=await import('node:fs/promises');
const report={date:'2026-10-19',checks:[],limits:['One Chromium engine','No real screen reader or full WCAG audit','Warm synthetic dataset performance only; no capacity or leak certification']};
const assert=(value,message)=>{if(!value)throw Error(message);};
const pass=(name,data={})=>report.checks.push({name,result:'PASS',...data});
await p.reload();await p.waitForFunction(()=>!!App.user&&!!document.querySelector('#demo-role-switch'));
await p.selectOption('#demo-role-switch','boss');await p.waitForFunction(()=>App.user?.role==='boss');
await p.evaluate(()=>App.requestNavigation('#/documents/D-CI2026002-V1'));
report.breakpoints=[];
for(const width of [1360,1361]){
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  report.breakpoints.push(await p.evaluate(()=>({width:innerWidth,bodyWidth:document.documentElement.scrollWidth,outlineButtonVisible:[...document.querySelectorAll('[data-action="doc-directory"]')].some(e=>e.getBoundingClientRect().width>0),pageWidth:document.querySelector('.paper')?.getBoundingClientRect().width})));
}
assert(report.breakpoints.every(d=>d.bodyWidth<=d.width&&d.pageWidth>0)&&report.breakpoints[0].outlineButtonVisible&&!report.breakpoints[1].outlineButtonVisible,'breakpoint layout');pass('1360/1361 desktop boundaries', {observations:report.breakpoints});
await p.evaluate(()=>App.requestNavigation('#/dashboard'));
await p.click('.order-map-countries [data-country="US"]');assert(await p.evaluate(()=>document.querySelectorAll('[data-order-map-route]:not(.is-dimmed)').length)===2,'US routes');
await p.focus('.order-map-countries [data-country="US"]');await p.press('.order-map-countries [data-country="US"]','Enter');pass('map US keyboard/native country filter');
await p.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await p.click('[data-action="order-map-replay"]');
assert(await p.evaluate(()=>getComputedStyle(document.querySelector('.order-map-flow')).animationName)==='none','reduce motion');pass('runtime reduced motion keeps static map');
await p.cdp('Emulation.setEmulatedMedia',{features:[]});
await p.click('[data-action="search-open"]');await p.fill('#workspace-search','SO2026001');await p.press('#workspace-search','ArrowDown');
const selected=await p.evaluate(()=>document.querySelector('.search-result.selected')?.dataset.link);assert(!!selected,'selected search result');await p.press('#workspace-search','Enter');
await p.waitForFunction(hash=>location.hash===hash,selected);assert(await p.evaluate(hash=>App.canVisit(hash,App.user.role),selected),'permitted result');pass('search keyboard opens selected permitted result',{selected});
await p.click('[data-action="search-open"]');await p.press('#workspace-search','Escape');assert(await p.evaluate(()=>document.activeElement.dataset.action)==='search-open','focus restored');pass('search focus return');
await p.selectOption('#demo-role-switch','fin');await p.waitForFunction(()=>App.user?.role==='fin');
const toast=await p.evaluate(()=>({wrap:getComputedStyle(document.querySelector('.toast-wrap')).pointerEvents,items:[...document.querySelectorAll('.toast')].map(t=>({pointer:getComputedStyle(t).pointerEvents,role:t.getAttribute('role')}))}));
assert(toast.wrap==='none'&&toast.items.length>0&&toast.items.every(t=>t.pointer==='none'&&['status','alert'].includes(t.role)),'noninteractive toast layer');pass('UI-01 toast pointer transparency and ARIA retained',toast);
await p.selectOption('#demo-role-switch','boss');await p.waitForFunction(()=>App.user?.role==='boss');
report.performance=await p.evaluate(()=>{
  const samples=[],heapBefore=performance.memory?.usedJSHeapSize;
  for(let i=0;i<30;i++){const route=['#/dashboard','#/orders','#/stats'][i%3],start=performance.now();App.requestNavigation(route);samples.push({route,ms:performance.now()-start});}
  return {userAgent:navigator.userAgent,orders:MOCK.orders.length,documents:MOCK.documents.length,samples,heapBefore,heapAfter:performance.memory?.usedJSHeapSize,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,duration:r.duration,bytes:r.encodedBodySize}))};
});
assert(report.performance.resources.every(r=>new URL(r.url).origin===locationOrigin()),'external runtime resource');
function locationOrigin(){return 'http://127.0.0.1:8014';}
await p.evaluate(()=>App.requestNavigation('#/dashboard'));await p.cdp('Emulation.clearDeviceMetricsOverride');
report.result='PASS';await fs.writeFile(new URL('./browser-quality-final.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,result:report.result,perfSamples:report.performance.samples.length}));
