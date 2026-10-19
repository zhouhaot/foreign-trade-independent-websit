// Real Ego UI-copy acceptance. Caller-owned space 19; no lifecycle operations.
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const task=await taskSpace(19), p=task.page('p1'), base='http://127.0.0.1:8015/index.html';
const folder=fileURLToPath(new URL('./',import.meta.url)), destination=folder+'copy-browser.json';
const report={startedAt:new Date().toISOString(),engine:'ego-browser',cases:[],captures:[],failures:[]};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const stopped=e=>['executionStopped','pageResponsive','mayHaveLateEffects'].some(k=>e[k]!==undefined)||/taken control|inactive|unassigned|policy.*denied|URL.*denied/i.test(e.message);
let stop=false, screenUnavailable=false;
const save=()=>fs.writeFile(destination,JSON.stringify(report,null,2)+'\n');
await fs.writeFile(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const ready=()=>p.waitForFunction(()=>!!window.App && !!window.MOCK && document.styleSheets.length===3);
const go=async hash=>{await p.goto(base+hash);await p.waitForFunction(h=>location.hash===h && !!document.querySelector('.workspace'),hash);};
const role=async value=>{await p.selectOption('#demo-role-switch',value);await p.waitForFunction(r=>App.user?.role===r,value);};
const neutral=async name=>{
  const state=await p.evaluate(()=>({text:document.body.innerText,aria:[...document.querySelectorAll('[aria-label],[title],[placeholder]')].map(e=>[e.getAttribute('aria-label'),e.title,e.getAttribute('placeholder')].filter(Boolean).join(' ')).join(' '),width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert(!/演示|展示|\bdemo\b/i.test(state.text+' '+state.aria),name+': obsolete built-in UI wording');assert(state.scrollWidth<=state.width+1,name+': horizontal overflow');return state;
};
const capture=async(name,width,height)=>{
  await p.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  if(screenUnavailable){report.captures.push({name,result:'SKIPPED',reason:'first screenshot API failed'});return;}
  try{const target=folder+name+'.png';await p.screenshot({path:target});report.captures.push({name,result:'CAPTURED',path:target,width,height,url:await p.url()});}
  catch(e){if(stopped(e))throw e;screenUnavailable=true;report.captures.push({name,result:'TOOL_ERROR',error:e.message});}
};
try {
  await p.goto(base+'#/dashboard');await p.reload();await ready();
  await p.click('[data-action="logout"]');await p.click('.modal [data-ok]');await p.waitForSelector('#login-role');
  const login=await neutral('login');assert(login.text.includes('未接入认证服务')&&login.text.includes('请勿填写真实凭据'),'Missing authentication boundary');
  await capture('login-1280',1280,900);report.cases.push({name:'neutral login with authentication and refresh boundary',result:'PASS'});await save();
  await p.selectOption('#login-role','boss');await p.click('[data-action="login-submit"]');await p.waitForFunction(()=>App.user?.role==='boss'&&location.hash==='#/dashboard');
  const map=await neutral('map');assert(map.text.includes('7 笔合成起运数据')&&map.text.includes('（合成数据）'),'Synthetic origin disclosure absent');
  await capture('map-1440',1440,1000);report.cases.push({name:'native login and explicit per-order synthetic origins',result:'PASS'});await save();
  await role('sales');await go('#/orders/SO2026001');await neutral('order');await capture('order-1280',1280,900);
  for(const tab of ['overview','items','docs','pay','changes','logs']){await p.click('[data-action="order-tab"][data-tab="'+tab+'"]');await p.waitForFunction(t=>document.querySelector('[data-action="order-tab"][data-tab="'+t+'"]')?.getAttribute('aria-pressed')==='true',tab);}
  report.cases.push({name:'order progress and six native tabs',result:'PASS'});await save();
  await role('doc');await go('#/documents/D-CI2026002-V1');const doc=await neutral('document');assert(doc.text.includes('登记导出记录')&&doc.text.includes('不生成文件'),'Export boundary absent');
  await capture('document-1280',1280,1000);
  const oldHistory=await p.evaluate(()=>JSON.stringify(U.doc('D-CI2026002-V1').history));
  await p.click('[data-action="doc-export"]');await p.waitForFunction(()=>U.doc('D-CI2026002-V1').history.at(-1)?.action==='登记导出记录（未生成文件）');
  assert(await p.evaluate(s=>JSON.stringify(U.doc('D-CI2026002-V1').history.slice(0,-1))===s,oldHistory),'Original history changed');
  assert(await p.evaluate(()=>[...document.querySelectorAll('.toast')].some(t=>t.textContent.includes('未生成文件'))),'Completion hides no-file outcome');
  report.cases.push({name:'native export record, retained old history, honest no-file result',result:'PASS'});await save();
  await role('admin');await go('#/system/users');await neutral('users');const before=await p.evaluate(()=>JSON.stringify(MOCK));
  await p.click('[data-action="sys-reset-pwd"][data-id="U002"]');await p.waitForSelector('.modal');
  assert(await p.evaluate(()=>document.querySelector('.modal').innerText.includes('未接入账号服务')),'Password service boundary absent');
  await capture('password-1366',1366,900);await p.click('.modal [data-ok]');await p.waitForFunction(()=>!document.querySelector('.modal'));
  assert(await p.evaluate(()=>JSON.stringify(MOCK))===before,'Password service explanation mutated data');
  report.cases.push({name:'password explanation native confirm makes zero business writes',result:'PASS',beforeSha256:createHash('sha256').update(before).digest('hex')});await save();
}catch(e){stop=stopped(e);report.failures.push({error:e.message,stopped:stop});}
finally{
  if(!stop){try{await p.cdp('Emulation.clearDeviceMetricsOverride');await p.goto(base+'#/dashboard');await p.reload();await ready();report.reset=await p.evaluate(()=>({orders:MOCK.orders.length,documents:MOCK.documents.length}));}catch(e){report.failures.push({phase:'cleanup',error:e.message});}}
  report.result=report.failures.length?'FAIL':'PASS';report.finishedAt=new Date().toISOString();await save();
}
console.log(JSON.stringify({result:report.result,cases:report.cases.length,captures:report.captures.map(c=>({name:c.name,result:c.result})),failures:report.failures}));
if(report.failures.length)throw Error('Copy UI acceptance failed; see '+destination);
