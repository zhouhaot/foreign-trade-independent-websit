const task=await taskSpace(17),p=task.page('p1'),fs=await import('node:fs/promises');
const report={date:'2026-10-19',checks:[],boundary:'Native form/button/select actions with DOM and synthetic memory readback; no real files/DB'};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const pass=(name,data)=>{report.checks.push({name,result:'PASS',...data});console.log(name+': PASS');};
const go=async hash=>{await p.evaluate(h=>App.requestNavigation(h),hash);await p.waitForFunction(h=>location.hash===h,hash);};
const role=async r=>{await p.selectOption('#demo-role-switch',r);await p.waitForFunction(r=>App.user?.role===r,r);};
const confirm=async()=>{await p.click('.modal [data-ok]');await p.waitForFunction(()=>!document.querySelector('.modal'));};
const units=v=>{const[a,b='']=String(v).split('.');return BigInt(a)*100n+BigInt((b+'00').slice(0,2));};
const cents=items=>items.reduce((sum,it)=>sum+units(it.qty)*units(it.price)/100n,0n);
try{
  await p.goto('http://127.0.0.1:8014/index.html?review=20261019-final#/dashboard');
  await p.reload(); // Independent scenario must not inherit a disabled-role fixture.
  await p.waitForFunction(()=>!!window.App&&!!document.querySelector('#demo-role-switch,#login-role'));
  if(await p.evaluate(()=>!App.user)){await p.selectOption('#login-role','sales');await p.click('[data-action="login-submit"]');await p.waitForSelector('#demo-role-switch');}
  if(await p.evaluate(()=>App.user.role)!=='sales')await role('sales');
  await p.evaluate(()=>{window.__businessErrors=[];window.addEventListener('error',e=>window.__businessErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.__businessErrors.push(String(e.reason)));});
  await go('#/inquiries/INQ2026006');await p.click('[data-action="inq-start-quote"]');await confirm();await p.waitForSelector('#qe-form');
  const qid=await p.evaluate(()=>MOCK.inquiries.find(i=>i.id==='INQ2026006').quoteId);
  await p.click('#qe-form button[type="submit"]');await p.waitForFunction(id=>location.hash==='#/quotes/'+id,qid);
  await p.click('[data-action="quote-confirm"]');await p.fill('#qc-remark','合成验收：客户确认');await confirm();
  await p.click('[data-action="quote-gen-order"]');await confirm();
  const order=await p.evaluate(id=>MOCK.orders.find(o=>o.quoteId===id),qid);assert(!!order,'order created');const total=cents(order.items);assert(total===54500n,'independent cents');
  pass('fresh inquiry/quote/confirmation/order',{qid,orderId:order.id,totalCents:String(total),shippingOriginAbsent:!order.shippingOrigin});
  await role('fin');await go('#/payments?order='+order.id);const before=await p.evaluate(()=>MOCK.payments.length);
  await p.fill('#p-amount','546');await p.click('#pay-form button[type="submit"]');assert(await p.evaluate(()=>MOCK.payments.length)===before,'overpayment zero write');pass('overpayment rejected');
  await p.fill('#p-amount','100');await p.click('#pay-form button[type="submit"]');await p.waitForFunction(n=>MOCK.payments.length===n+1,before);
  pass('partial payment before documents',{receivedCents:10000});
  await role('doc');await go('#/orders/'+order.id);await p.click('[data-action="doc-create"]');await p.waitForSelector('#df-marks');
  const docs=await p.evaluate(id=>MOCK.documents.filter(d=>d.orderId===id).map(d=>({id:d.id,type:d.type})),order.id),ci=docs.find(d=>d.type==='CI'),pl=docs.find(d=>d.type==='PL');assert(ci&&pl,'two independent docs');
  await p.click('[data-action="doc-submit"]');await confirm();await p.waitForFunction(id=>U.doc(id).status==='待审核',ci.id);
  await go('#/documents/'+pl.id);await p.click('[data-action="doc-edit"]');await p.waitForSelector('#df-pk-cartons');
  const initial=await p.evaluate(()=>JSON.stringify(MOCK));await p.click('[data-action="doc-submit"]');assert(await p.evaluate(()=>JSON.stringify(MOCK))===initial,'incomplete PL zero write');
  for(const[k,v]of Object.entries({cartons:'10',package:'纸箱',gw:'120',nw:'100',meas:'2.5'}))await p.fill('#df-pk-'+k,v);
  await p.click('[data-action="doc-submit"]');await confirm();await p.waitForFunction(id=>U.doc(id).status==='待审核',pl.id);
  const approvalIds=await p.evaluate(()=>MOCK.approvals.map(a=>a.id));assert(new Set(approvalIds).size===approvalIds.length,'all approval ids unique');pass('first CI/PL, incomplete refusal and unique submission IDs',{ci:ci.id,pl:pl.id});
  await role('boss');for(const d of [ci,pl]){await go('#/documents/'+d.id);await p.click('[data-action="doc-approve"]');await confirm();await p.waitForFunction(id=>U.doc(id).status==='已通过',d.id);}
  const state=await p.evaluate(id=>({order:U.order(id).status,docs:U.order(id).docStatus,received:U.financialBalance(U.order(id)).receivedCents,remaining:U.financialBalance(U.order(id)).outstandingCents}),order.id);assert(state.remaining===44500&&state.docs==='已通过'&&state.order==='待执行','parallel states independent');pass('both approved while balance unpaid',state);
  await role('fin');await go('#/payments?order='+order.id);const n=await p.evaluate(()=>MOCK.payments.length);await p.fill('#p-amount','445');await p.click('#pay-form button[type="submit"]');await p.waitForFunction(n=>MOCK.payments.length===n+1,n);assert(await p.evaluate(id=>U.financialBalance(U.order(id)).outstandingCents,order.id)===0,'settled');pass('final payment settled');
  await role('doc');await go('#/documents/'+ci.id);const old=await p.evaluate(id=>JSON.stringify(U.doc(id)),ci.id);await p.click('[data-action="doc-export"]');await p.waitForFunction(id=>U.doc(id).history.some(h=>h.action==='导出 PDF（演示）'),ci.id);pass('approved CI export is demonstration only');
  const oldAfterExport=await p.evaluate(id=>JSON.stringify(U.doc(id)),ci.id);await p.click('[data-action="doc-revise"]');await confirm();await p.waitForFunction(id=>MOCK.documents.some(d=>d.orderId===id&&d.type==='CI'&&d.version===2),order.id);assert(await p.evaluate(id=>JSON.stringify(U.doc(id)),ci.id)===oldAfterExport,'V1 preserved');pass('controlled V2 retains V1');
  const errors=await p.evaluate(()=>window.__businessErrors);assert(!errors.length,'no captured errors');report.result='PASS';report.errors=errors;
}catch(e){report.result='FAIL';report.error=e.message;console.log('FAIL: '+e.message);}
await fs.writeFile(new URL('./browser-business-final.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(report.result==='FAIL')throw Error(report.error);
