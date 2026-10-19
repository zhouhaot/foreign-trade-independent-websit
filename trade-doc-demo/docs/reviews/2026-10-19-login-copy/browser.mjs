// One-off root-owned acceptance; resumes only the current task's space.
const fs=await import('node:fs/promises');
const assert=(await import('node:assert/strict')).default;
const task=await taskSpace(21), page=task.page('p1');
const report={startedAt:new Date().toISOString(),engine:'ego-browser',spaceId:21,cases:[],failures:[]};
try {
  const initial=await page.evaluate(()=>({footer:document.querySelector('.login-story-foot').textContent.trim(),options:[...document.querySelector('#login-role').options].map(option=>({value:option.value,text:option.textContent})),auth:document.querySelector('.login-tip').textContent,inputs:[document.querySelector('#login-account').value,document.querySelector('#login-password').value]}));
  assert.equal(initial.footer,'本地会话');
  assert.deepEqual(initial.options.map(option=>option.text),['系统管理员','外贸业务员','单证员','财务人员','业务主管']);
  assert.match(initial.auth,/未接入认证服务/); assert.match(initial.auth,/请勿填写真实凭据/);
  report.cases.push({name:'footer has no suffix; five role-only options; authentication warning retained',result:'PASS',footer:initial.footer,options:initial.options});
  for(const option of initial.options) {
    await page.selectOption('loc=css:#login-role',option.value);
    const state=await page.evaluate(()=>({role:document.querySelector('#login-role').value,hint:document.querySelector('#login-role-hint').textContent,inputs:[document.querySelector('#login-account').value,document.querySelector('#login-password').value]}));
    assert.equal(state.role,option.value); assert.match(state.hint,/^部门：/); assert.deepEqual(state.inputs,initial.inputs);
    report.cases.push({name:'native selection '+option.value+' preserves inputs and department hint',result:'PASS'});
  }
  await page.click('loc=css:[data-action=login-submit]');
  await page.waitForSelector('loc=css:#demo-role-switch',{state:'visible'});
  const role=await page.evaluate(()=>document.querySelector('#demo-role-switch').value);
  assert.equal(role,'boss');
  report.cases.push({name:'role-only selected position logs in to expected boss workspace',result:'PASS'});
  await page.click('loc=css:[data-action=logout]');
  await page.waitForSelector('loc=css:.modal [data-ok]',{state:'visible'});
  await page.click('loc=css:.modal [data-ok]');
  await page.waitForSelector('loc=css:#login-role',{state:'visible'});
  await page.selectOption('loc=css:#login-role','sales');
  report.result='PASS';
} catch(error) { report.result='FAIL'; report.failures.push(error.message); }
report.finishedAt=new Date().toISOString();
await fs.writeFile('/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/docs/reviews/2026-10-19-login-copy/browser.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
console.log(await page.snapshot());
