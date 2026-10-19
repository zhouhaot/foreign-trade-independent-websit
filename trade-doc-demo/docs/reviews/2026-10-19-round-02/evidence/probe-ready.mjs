// Real Ego controller diagnostic. Disposable space 18 only; no lifecycle APIs.
import * as fs from 'node:fs/promises';
const task = await taskSpace(18), page = task.page('p1');
const out = [];
for (const waitLoad of [false, true]) for (let i=0;i<5;i++) {
  const row = {waitLoad,i};
  try {
    await page.goto('http://127.0.0.1:8014/index.html#/dashboard');
    await page.reload();
    if(waitLoad) await page.waitForLoadState('load');
    await page.waitForFunction(() => !!window.App && !!window.MOCK && !!window.U && !!document.querySelector('#demo-role-switch,#login-role') && document.styleSheets.length===3 && [...document.styleSheets].every(s=>{try{return s.cssRules.length>0}catch{return false}}));
    row.result='READY';
  } catch(e) {
    row.result='FAIL'; row.error=e.message;
    if(['executionStopped','pageResponsive','mayHaveLateEffects'].some(k=>e[k]!==undefined) || /control|inactive|unassigned|denied|blocked/i.test(e.message)) throw e;
  }
  row.state=await page.evaluate(()=>({ready:document.readyState,app:!!window.App,mock:!!window.MOCK,user:window.App?.user?.role,
    scripts:[...document.scripts].map(s=>s.src), css:[...document.styleSheets].map(s=>{try{return {href:s.href,rules:s.cssRules.length}}catch{return {href:s.href,rules:-1}}}),
    body:document.body.innerText.slice(0,180),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration,bytes:r.encodedBodySize,responseStatus:r.responseStatus}))}));
  out.push(row); console.log(JSON.stringify({waitLoad,i,result:row.result,app:row.state.app,css:row.state.css.length}));
}
await fs.writeFile(new URL('ready-probe-results.json',import.meta.url),JSON.stringify(out,null,2)+'\n',{flag:'wx'});
